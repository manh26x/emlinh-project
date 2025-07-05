#!/bin/bash
#
# Stop script for EmLinh applications
# This script stops all running application processes
#

echo "🛑 Stopping EmLinh applications..."
echo "📅 Stop time: $(date)"
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

# Stop Flask app using PID file
if [ -f "flask.pid" ]; then
    PID=$(cat flask.pid)
    if kill -0 $PID 2>/dev/null; then
        log_info "Stopping Flask app (PID: $PID)..."
        kill $PID 2>/dev/null
        
        # Wait for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 $PID 2>/dev/null; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if kill -0 $PID 2>/dev/null; then
            log_warning "Forcing shutdown of Flask app..."
            kill -9 $PID 2>/dev/null || true
        fi
        
        log_success "Flask app stopped"
    else
        log_warning "Flask PID file exists but process is not running"
    fi
    
    # Remove PID file
    rm -f flask.pid
else
    log_info "No Flask PID file found"
fi

# Stop any remaining gunicorn processes
log_info "Stopping any remaining Gunicorn processes..."
pkill -f "gunicorn" 2>/dev/null && log_success "Gunicorn processes stopped" || log_info "No Gunicorn processes found"

# Stop any remaining Python app processes
log_info "Stopping any remaining Python app processes..."
pkill -f "python.*app.py" 2>/dev/null && log_success "Python app processes stopped" || log_info "No Python app processes found"

# Stop any Flask dev server processes
pkill -f "flask.*run" 2>/dev/null && log_success "Flask dev server processes stopped" || log_info "No Flask dev server processes found"

# Remove Gunicorn PID file if it exists
if [ -f "emlinh_mng/gunicorn.pid" ]; then
    rm -f emlinh_mng/gunicorn.pid
    log_success "Gunicorn PID file removed"
fi

echo ""
log_success "All applications stopped successfully"
echo ""
echo "💡 To start applications again: ./start_app.sh"
echo "💡 To check status: ./status_app.sh"