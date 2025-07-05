#!/bin/bash
#
# Start script for EmLinh applications on host environment
# This script works both in CI/CD (GitHub Actions) and manual execution
#

set -e  # Exit on any error

echo "🚀 Starting EmLinh applications on host..."
echo "📅 Start time: $(date)"
echo ""

# Function to log messages
log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_error() {
    echo "❌ $1"
}

log_warning() {
    echo "⚠️  $1"
}

# Pre-flight checks
echo "🔍 Running pre-flight checks..."

# Check if we're in the right directory
if [ ! -d "emlinh_mng" ]; then
    log_error "emlinh_mng directory not found. Please run this script from the project root."
    exit 1
fi

cd emlinh_mng

# Check for virtual environment, create if needed
if [ ! -d "venv" ]; then
    log_warning "Virtual environment not found. Creating one..."
    python3 -m venv venv --system-site-packages
    log_success "Virtual environment created"
fi

# Activate virtual environment
log_info "Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
if ! python -c "import flask" 2>/dev/null; then
    log_warning "Flask not found in virtual environment. Installing requirements..."
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn  # Ensure gunicorn is installed
    log_success "Requirements installed"
fi

# Test WSGI import
log_info "Testing WSGI import..."
python -c "import sys; sys.path.insert(0, 'src'); from wsgi import application; print('✅ WSGI import successful')" || {
    log_error "WSGI import failed"
    exit 1
}

# Test Flask app creation
log_info "Testing Flask app creation..."
python -c "
import sys
sys.path.insert(0, 'src')
try:
    from app.app import create_app
    app, socketio = create_app()
    print('✅ Flask app creation successful')
    print(f'✅ App config: {app.config.get(\"FLASK_ENV\", \"default\")}')
except Exception as e:
    print(f'❌ Flask app creation failed: {e}')
    import traceback
    traceback.print_exc()
    exit(1)
" || {
    log_error "Flask app creation test failed"
    exit 1
}

# Stop any existing processes
log_info "Stopping any existing processes..."
pkill -f "gunicorn" 2>/dev/null || true
sleep 2

# Create enhanced gunicorn configuration if it doesn't exist
if [ ! -f "gunicorn.conf.py" ]; then
    log_info "Creating Gunicorn configuration..."
    cat > gunicorn.conf.py << 'EOF'
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = 2
worker_class = "sync"
worker_connections = 1000
timeout = 60
keepalive = 30
max_requests = 1000
max_requests_jitter = 50

# Restart workers after this many requests, to help prevent memory leaks
preload_app = True

# Logging
accesslog = "access.log"
errorlog = "error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = "emlinh_flask_app"

# Server mechanics
pidfile = "gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# SSL
keyfile = None
certfile = None
EOF
    log_success "Gunicorn configuration created"
fi

# Test gunicorn configuration
log_info "Testing Gunicorn configuration..."
gunicorn --check-config -c gunicorn.conf.py wsgi:application || {
    log_error "Gunicorn configuration test failed"
    exit 1
}

# Start Gunicorn with enhanced configuration
log_info "Starting Gunicorn with enhanced configuration..."
nohup gunicorn -c gunicorn.conf.py wsgi:application > flask.log 2>&1 &

# Store Flask PID for later management
echo $! > ../flask.pid
log_success "Flask app started (PID: $(cat ../flask.pid))"

# Wait and verify startup
log_info "Waiting for app to be ready..."
sleep 5

if kill -0 $(cat ../flask.pid) 2>/dev/null; then
    log_success "Process is running"
    
    # Test health endpoint with retries
    log_info "Testing health endpoint..."
    for i in {1..12}; do
        if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
            log_success "Health check passed"
            echo ""
            echo "🎉 Applications started successfully!"
            echo "🔗 App URL: http://localhost:5000"
            echo "📋 Logs: emlinh_mng/flask.log"
            echo "📋 PID file: flask.pid"
            echo ""
            echo "💡 Management commands:"
            echo "   - Check status: ./status_app.sh"
            echo "   - Stop app: ./stop_app.sh"
            echo "   - Debug: ./debug_deployment.sh"
            exit 0
        fi
        log_warning "Waiting for health check... ($i/12)"
        sleep 5
    done
    
    log_warning "App started but health check failed"
    echo "📋 Recent logs:"
    tail -10 flask.log
    echo ""
    echo "💡 The app may still be starting. Check status with: ./status_app.sh"
    exit 0
else
    log_error "Process died after startup"
    echo "📋 Logs:"
    cat flask.log
    exit 1
fi