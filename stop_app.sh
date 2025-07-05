#!/bin/bash
echo "🛑 Stopping EmLinh applications..."
if [ -f "flask.pid" ]; then
  kill $(cat flask.pid) 2>/dev/null || true
  rm -f flask.pid
  echo "✅ Flask app stopped"
fi
pkill -f "gunicorn" 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true
echo "✅ All applications stopped" 