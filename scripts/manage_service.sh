#!/bin/bash
# Service management script for emlinh

case "$1" in
  start)
    echo "🚀 Starting emlinh service..."
    sudo systemctl start emlinh
    sudo systemctl status emlinh --no-pager -l
    ;;
  stop)
    echo "🛑 Stopping emlinh service..."
    sudo systemctl stop emlinh
    sudo systemctl status emlinh --no-pager -l
    ;;
  restart)
    echo "🔄 Restarting emlinh service..."
    sudo systemctl restart emlinh
    sudo systemctl status emlinh --no-pager -l
    ;;
  status)
    echo "📊 emlinh service status:"
    sudo systemctl status emlinh --no-pager -l
    ;;
  logs)
    echo "📋 Recent emlinh service logs:"
    journalctl -u emlinh --no-pager -n 50
    ;;
  enable)
    echo "✅ Enabling emlinh service..."
    sudo systemctl enable emlinh
    ;;
  disable)
    echo "❌ Disabling emlinh service..."
    sudo systemctl disable emlinh
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs|enable|disable}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the emlinh service"
    echo "  stop    - Stop the emlinh service"
    echo "  restart - Restart the emlinh service"
    echo "  status  - Show service status"
    echo "  logs    - Show recent service logs"
    echo "  enable  - Enable service to start on boot"
    echo "  disable - Disable service from starting on boot"
    exit 1
    ;;
esac 