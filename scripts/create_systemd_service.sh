#!/bin/bash
echo "🔧 Creating systemd service for EmLinh application..."

# Variables
SERVICE_NAME="emlinh-app"
WORK_DIR="$(pwd)/emlinh_mng"
USER="$(whoami)"
PYTHON_PATH="$WORK_DIR/venv/bin/python"
GUNICORN_PATH="$WORK_DIR/venv/bin/gunicorn"

echo "📍 Working directory: $WORK_DIR"
echo "📍 User: $USER"
echo "📍 Python path: $PYTHON_PATH"
echo "📍 Gunicorn path: $GUNICORN_PATH"

# Create systemd service file
echo "📝 Creating systemd service file..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=EmLinh Flask Application
After=network.target

[Service]
Type=exec
User=$USER
Group=$USER
WorkingDirectory=$WORK_DIR
Environment=PATH=$WORK_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=PYTHONPATH=$WORK_DIR/src
ExecStart=$GUNICORN_PATH --bind 0.0.0.0:5000 --workers 2 --timeout 60 --log-level info wsgi:application
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Systemd service file created at /etc/systemd/system/${SERVICE_NAME}.service"

# Reload systemd and enable service
echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "🔧 Enabling EmLinh service..."
sudo systemctl enable ${SERVICE_NAME}

# Create management scripts for systemd
echo "📝 Creating systemd management scripts..."

# Start script
cat > start_app_systemd.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting EmLinh application via systemd..."

SERVICE_NAME="emlinh-app"

# Start the service
sudo systemctl start $SERVICE_NAME

# Wait for service to start
sleep 3

# Check status
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ Service started successfully"
    echo "📍 Status:"
    systemctl status $SERVICE_NAME --no-pager -l
    
    # Health check
    echo "🔍 Performing health check..."
    for i in {1..10}; do
        if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
            echo "✅ Health check passed!"
            echo "🎉 Application is running via systemd!"
            echo "🔗 App URL: http://localhost:5000"
            exit 0
        fi
        echo "⏳ Health check attempt $i/10..."
        sleep 3
    done
    
    echo "⚠️ Service running but health check failed"
    echo "📋 Service logs:"
    journalctl -u $SERVICE_NAME --no-pager -n 20
else
    echo "❌ Failed to start service"
    echo "📋 Service status:"
    systemctl status $SERVICE_NAME --no-pager -l
    echo "📋 Service logs:"
    journalctl -u $SERVICE_NAME --no-pager -n 20
    exit 1
fi
EOF

# Stop script
cat > stop_app_systemd.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping EmLinh application via systemd..."

SERVICE_NAME="emlinh-app"

sudo systemctl stop $SERVICE_NAME

echo "✅ Service stopped"
echo "📍 Final status:"
systemctl status $SERVICE_NAME --no-pager -l || true
EOF

# Status script  
cat > status_app_systemd.sh << 'EOF'
#!/bin/bash
echo "📊 === EMLINH SYSTEMD SERVICE STATUS === 📊"
echo "📅 Check time: $(date)"
echo ""

SERVICE_NAME="emlinh-app"

# Service status
echo "🔍 Service Status:"
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "  ✅ Service is active"
    systemctl status $SERVICE_NAME --no-pager -l
else
    echo "  ❌ Service is not active"
    systemctl status $SERVICE_NAME --no-pager -l || true
fi
echo ""

# Health check
echo "🔍 Health Check:"
if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
    echo "  ✅ Health check passed"
    echo "  📋 Health response:"
    curl -s http://localhost:5000/health | jq . 2>/dev/null || curl -s http://localhost:5000/health
else
    echo "  ❌ Health check failed"
fi
echo ""

# Port status
echo "🔍 Port 5000 Status:"
if netstat -tulpn | grep ":5000 " >/dev/null; then
    echo "  ✅ Port 5000 is in use"
    netstat -tulpn | grep ":5000 "
else
    echo "  ❌ Port 5000 is not in use"
fi
echo ""

# Recent logs
echo "🔍 Recent Service Logs (last 10 lines):"
journalctl -u $SERVICE_NAME --no-pager -n 10 || echo "  ❌ No logs available"
echo ""

# Summary
echo "📊 === SUMMARY === 📊"
if systemctl is-active --quiet $SERVICE_NAME && curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
    echo "🎉 Application is HEALTHY and RUNNING via systemd!"
    echo "🔗 Access at: http://localhost:5000"
    echo "📋 Manage with: sudo systemctl {start|stop|restart|status} $SERVICE_NAME"
else
    echo "⚠️ Application has issues. Check logs above."
    echo "🔧 Try: sudo systemctl restart $SERVICE_NAME"
fi
EOF

# Make scripts executable
chmod +x start_app_systemd.sh stop_app_systemd.sh status_app_systemd.sh

echo "✅ Systemd management scripts created:"
echo "   - start_app_systemd.sh: Start via systemd"
echo "   - stop_app_systemd.sh: Stop via systemd"
echo "   - status_app_systemd.sh: Check systemd status"
echo ""
echo "🎯 Usage:"
echo "   ./start_app_systemd.sh     # Start the service"
echo "   ./status_app_systemd.sh    # Check status"
echo "   ./stop_app_systemd.sh      # Stop the service"
echo ""
echo "🔧 Manual systemd commands:"
echo "   sudo systemctl start $SERVICE_NAME"
echo "   sudo systemctl status $SERVICE_NAME"
echo "   sudo systemctl stop $SERVICE_NAME"
echo "   journalctl -u $SERVICE_NAME -f    # Follow logs"
echo ""
echo "✅ Systemd service setup completed!" 