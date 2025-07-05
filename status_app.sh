#!/bin/bash
#
# Status script for EmLinh applications
# This script provides comprehensive status information
#

echo "📊 === APPLICATION STATUS === 📊"
echo "📅 Check time: $(date)"
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

# Initialize status variables
flask_running=false
health_check_passed=false
port_in_use=false

# Check Flask process
echo "🔍 Flask Application Status:"
if [ -f "flask.pid" ]; then
    PID=$(cat flask.pid)
    if kill -0 $PID 2>/dev/null; then
        log_success "Flask app is running (PID: $PID)"
        flask_running=true
        echo "  📋 Process details:"
        ps aux | grep $PID | grep -v grep || log_warning "Process details not available"
    else
        log_error "Flask app is not running (PID file exists but process dead)"
        echo "  📋 Stale PID file: $PID"
    fi
else
    log_error "Flask app is not running (no PID file)"
fi
echo ""

# Check Gunicorn processes
echo "🔍 Gunicorn Processes:"
GUNICORN_COUNT=$(pgrep -f gunicorn | wc -l)
if [ $GUNICORN_COUNT -gt 0 ]; then
    log_success "Found $GUNICORN_COUNT Gunicorn processes"
    ps aux | grep gunicorn | grep -v grep
else
    log_error "No Gunicorn processes found"
fi
echo ""

# Check port 5000
echo "🔍 Port 5000 Status:"
if netstat -tulpn 2>/dev/null | grep ":5000 " >/dev/null; then
    log_success "Port 5000 is in use"
    port_in_use=true
    netstat -tulpn 2>/dev/null | grep ":5000 "
else
    log_error "Port 5000 is not in use"
fi
echo ""

# Health check
echo "🔍 Health Check:"
if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
    log_success "Health check passed"
    health_check_passed=true
    echo "  📋 Health response:"
    curl -s http://localhost:5000/health 2>/dev/null | jq . 2>/dev/null || curl -s http://localhost:5000/health 2>/dev/null
else
    log_error "Health check failed"
    echo "  📋 curl details:"
    curl -v http://localhost:5000/health 2>&1 | head -10
fi
echo ""

# Check virtual environment
echo "🔍 Virtual Environment:"
if [ -d "emlinh_mng/venv" ]; then
    log_success "Virtual environment exists"
    echo "  📋 Python version in venv:"
    cd emlinh_mng
    source venv/bin/activate 2>/dev/null && {
        python --version
        echo "  📋 Key packages:"
        pip list | grep -E "(flask|gunicorn|sqlalchemy)" 2>/dev/null || log_warning "Key packages not found"
        deactivate
    } || log_warning "Failed to activate virtual environment"
    cd ..
else
    log_error "Virtual environment NOT found"
fi
echo ""

# Check configuration files
echo "🔍 Configuration Files:"
if [ -f "emlinh_mng/.env" ]; then
    log_success ".env file exists"
else
    log_warning ".env file not found"
fi

if [ -f "emlinh_mng/gunicorn.conf.py" ]; then
    log_success "gunicorn.conf.py exists"
else
    log_warning "gunicorn.conf.py not found"
fi

if [ -f "emlinh_mng/wsgi.py" ]; then
    log_success "wsgi.py exists"
else
    log_error "wsgi.py not found"
fi
echo ""

# Check logs
echo "🔍 Recent Logs:"
if [ -f "emlinh_mng/flask.log" ]; then
    echo "  📋 Last 5 lines of flask.log:"
    tail -5 emlinh_mng/flask.log
else
    log_warning "No flask.log found"
fi
echo ""

if [ -f "emlinh_mng/error.log" ]; then
    echo "  📋 Last 5 lines of error.log:"
    tail -5 emlinh_mng/error.log
else
    log_warning "No error.log found"
fi
echo ""

if [ -f "emlinh_mng/access.log" ]; then
    echo "  📋 Last 3 lines of access.log:"
    tail -3 emlinh_mng/access.log
else
    log_info "No access.log found"
fi
echo ""

# Environment variables check
echo "🔍 Environment Variables:"
echo "  FLASK_ENV: ${FLASK_ENV:-not set}"
echo "  DATABASE_URL: ${DATABASE_URL:+set (hidden)}"
echo "  SECRET_KEY: ${SECRET_KEY:+set (hidden)}"
echo "  WORKSPACE_ROOT: ${WORKSPACE_ROOT:-not set}"
echo "  HOST_EXECUTION: ${HOST_EXECUTION:-not set}"
echo ""

# Disk space check
echo "🔍 Disk Space:"
df -h . | tail -1 | awk '{print "  Available space: " $4 " (" $5 " used)"}'
echo ""

# Summary
echo "📊 === SUMMARY === 📊"
if [ "$flask_running" = true ] && [ "$health_check_passed" = true ]; then
    echo "🎉 Application is HEALTHY and RUNNING!"
    echo "🔗 Access at: http://localhost:5000"
    echo ""
    echo "💡 Quick actions:"
    echo "   - View logs: tail -f emlinh_mng/flask.log"
    echo "   - Stop app: ./stop_app.sh"
    echo "   - Debug: ./debug_deployment.sh"
elif [ "$flask_running" = true ]; then
    log_warning "Application is running but health check failed"
    echo "💡 Troubleshooting:"
    echo "   - Check logs: cat emlinh_mng/flask.log"
    echo "   - Check errors: cat emlinh_mng/error.log"
    echo "   - Restart: ./stop_app.sh && ./start_app.sh"
else
    log_error "Application is NOT running"
    echo "💡 Next steps:"
    echo "   - Start app: ./start_app.sh"
    echo "   - Debug issues: ./debug_deployment.sh"
    echo "   - Check requirements: cd emlinh_mng && source venv/bin/activate && pip list"
fi
echo ""

# Exit with appropriate code
if [ "$flask_running" = true ] && [ "$health_check_passed" = true ]; then
    exit 0
else
    exit 1
fi