#!/bin/bash

echo "🔍 === DEPLOYMENT DEBUG SCRIPT === 🔍"
echo "Script này giúp debug vấn đề deployment trên self-hosted GitHub runner"
echo ""

# Function to check service status
check_service() {
    local service_name=$1
    local port=$2
    
    echo "🔍 Checking $service_name..."
    
    # Check if process is running
    if pgrep -f "$service_name" > /dev/null; then
        echo "  ✅ $service_name process is running"
        echo "  📋 Process details:"
        ps aux | grep "$service_name" | grep -v grep | head -5
    else
        echo "  ❌ $service_name process is NOT running"
    fi
    
    # Check port if provided
    if [ ! -z "$port" ]; then
        if netstat -tulpn | grep ":$port " > /dev/null; then
            echo "  ✅ Port $port is in use"
            echo "  📋 Port details:"
            netstat -tulpn | grep ":$port "
        else
            echo "  ❌ Port $port is NOT in use"
        fi
    fi
    
    echo ""
}

# Function to test connectivity
test_connectivity() {
    local url=$1
    local service_name=$2
    
    echo "🔗 Testing connectivity to $service_name ($url)..."
    
    if curl -f -s "$url" > /dev/null 2>&1; then
        echo "  ✅ $service_name is responding"
        echo "  📋 Response:"
        curl -s "$url" | head -10
    else
        echo "  ❌ $service_name is NOT responding"
        echo "  📋 curl error details:"
        curl -v "$url" 2>&1 | head -10
    fi
    
    echo ""
}

# Function to check logs
check_logs() {
    local log_file=$1
    local service_name=$2
    
    echo "📋 Checking $service_name logs ($log_file)..."
    
    if [ -f "$log_file" ]; then
        echo "  ✅ Log file exists"
        echo "  📄 File size: $(stat -c%s "$log_file") bytes"
        echo "  📄 Last modified: $(stat -c%y "$log_file")"
        echo "  📋 Last 20 lines:"
        tail -20 "$log_file"
    else
        echo "  ❌ Log file does NOT exist: $log_file"
    fi
    
    echo ""
}

# Function to check environment
check_environment() {
    echo "🌍 Checking environment..."
    
    echo "  📋 Python version:"
    python3 --version || echo "    ❌ Python3 not found"
    
    echo "  📋 Pip version:"
    pip --version || echo "    ❌ Pip not found"
    
    echo "  📋 Virtual environment:"
    if [ -d "emlinh_mng/venv" ]; then
        echo "    ✅ Virtual environment exists"
        echo "    📋 Activate and check packages:"
        cd emlinh_mng
        source venv/bin/activate
        pip list | grep -E "(flask|gunicorn|sqlalchemy)" || echo "    ⚠️ Key packages not found"
        deactivate
        cd ..
    else
        echo "    ❌ Virtual environment NOT found"
    fi
    
    echo "  📋 Environment variables:"
    echo "    FLASK_ENV: ${FLASK_ENV:-not set}"
    echo "    DATABASE_URL: ${DATABASE_URL:-not set}"
    echo "    SECRET_KEY: ${SECRET_KEY:+set (hidden)}"
    echo "    WORKSPACE_ROOT: ${WORKSPACE_ROOT:-not set}"
    
    echo ""
}

# Function to test Flask app manually
test_flask_app() {
    echo "🧪 Testing Flask app manually..."
    
    if [ ! -d "emlinh_mng" ]; then
        echo "  ❌ emlinh_mng directory not found"
        return 1
    fi
    
    cd emlinh_mng
    
    if [ ! -d "venv" ]; then
        echo "  ❌ Virtual environment not found"
        cd ..
        return 1
    fi
    
    echo "  🔍 Activating virtual environment..."
    source venv/bin/activate
    
    echo "  🔍 Testing WSGI import..."
    python -c "
import sys
sys.path.insert(0, 'src')
try:
    from wsgi import application
    print('    ✅ WSGI import successful')
except Exception as e:
    print(f'    ❌ WSGI import failed: {e}')
    import traceback
    traceback.print_exc()
" || echo "    ❌ WSGI test failed"
    
    echo "  🔍 Testing Flask app creation..."
    python -c "
import sys
sys.path.insert(0, 'src')
try:
    from app.app import create_app
    app, socketio = create_app()
    print('    ✅ Flask app creation successful')
    print(f'    ✅ App config: {app.config.get(\"FLASK_ENV\", \"default\")}')
except Exception as e:
    print(f'    ❌ Flask app creation failed: {e}')
    import traceback
    traceback.print_exc()
" || echo "    ❌ Flask app test failed"
    
    deactivate
    cd ..
    
    echo ""
}

# Function to check disk space and permissions
check_system_resources() {
    echo "💾 Checking system resources..."
    
    echo "  📋 Disk space:"
    df -h . | head -2
    
    echo "  📋 Memory usage:"
    free -h
    
    echo "  📋 File permissions:"
    ls -la | head -10
    
    echo "  📋 Directory permissions:"
    ls -ld emlinh_mng 2>/dev/null || echo "    ❌ emlinh_mng directory not found"
    ls -ld emlinh-remotion 2>/dev/null || echo "    ❌ emlinh-remotion directory not found"
    
    echo ""
}

# Main execution
echo "📍 Current directory: $(pwd)"
echo "📅 Current time: $(date)"
echo ""

# Check basic system resources
check_system_resources

# Check environment
check_environment

# Test Flask app manually
test_flask_app

# Check services
check_service "gunicorn" "5000"
check_service "python" ""

# Test connectivity
test_connectivity "http://localhost:5000/health" "Flask Health Check"
test_connectivity "http://localhost:5000/" "Flask Root Page"

# Check logs
check_logs "emlinh_mng/flask.log" "Flask Application"
check_logs "emlinh_mng/error.log" "Gunicorn Error"
check_logs "emlinh_mng/access.log" "Gunicorn Access"

# Check PID files
echo "📋 Checking PID files..."
if [ -f "flask.pid" ]; then
    echo "  ✅ flask.pid exists: $(cat flask.pid)"
    if kill -0 $(cat flask.pid) 2>/dev/null; then
        echo "    ✅ Process is running"
    else
        echo "    ❌ Process is NOT running"
    fi
else
    echo "  ❌ flask.pid does NOT exist"
fi

if [ -f "emlinh_mng/gunicorn.pid" ]; then
    echo "  ✅ gunicorn.pid exists: $(cat emlinh_mng/gunicorn.pid)"
    if kill -0 $(cat emlinh_mng/gunicorn.pid) 2>/dev/null; then
        echo "    ✅ Process is running"
    else
        echo "    ❌ Process is NOT running"
    fi
else
    echo "  ❌ gunicorn.pid does NOT exist"
fi

echo ""

# Suggestions
echo "💡 === TROUBLESHOOTING SUGGESTIONS === 💡"
echo ""
echo "Nếu Flask app không start được:"
echo "1. Kiểm tra lỗi import: cd emlinh_mng && source venv/bin/activate && python -c 'from wsgi import application'"
echo "2. Kiểm tra dependencies: cd emlinh_mng && source venv/bin/activate && pip list"
echo "3. Test app trực tiếp: cd emlinh_mng && source venv/bin/activate && python src/app/run.py"
echo "4. Kiểm tra database: cd emlinh_mng && source venv/bin/activate && python -c 'from src.app.app import create_app; from src.app.extensions import db; app, _ = create_app(); app.app_context().push(); db.create_all()'"
echo ""
echo "Nếu Gunicorn crash:"
echo "1. Start với debug mode: cd emlinh_mng && source venv/bin/activate && gunicorn --bind 0.0.0.0:5000 --workers 1 --timeout 60 --log-level debug wsgi:application"
echo "2. Kiểm tra config: cd emlinh_mng && source venv/bin/activate && gunicorn --check-config -c gunicorn.conf.py wsgi:application"
echo "3. Test bằng Flask dev server: cd emlinh_mng && source venv/bin/activate && FLASK_ENV=development python src/app/run.py"
echo ""
echo "Để restart application:"
echo "1. Stop: pkill -f gunicorn; pkill -f 'python.*app.py'"
echo "2. Start: ./start_app.sh"
echo "3. Check: ./status_app.sh"
echo ""
echo "🎯 Chạy script này thường xuyên để monitor trạng thái deployment!" 