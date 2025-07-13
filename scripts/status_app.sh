#!/bin/bash
echo "📊 === APPLICATION STATUS === 📊"
echo "📅 Check time: $(date)"
echo ""

# Check Flask process
echo "🔍 Flask Application Status:"
if [ -f "flask.pid" ]; then
  PID=$(cat flask.pid)
  if kill -0 $PID 2>/dev/null; then
    echo "  ✅ Flask app is running (PID: $PID)"
    echo "  📋 Process details:"
    ps aux | grep $PID | grep -v grep
  else
    echo "  ❌ Flask app is not running (PID file exists but process dead)"
  fi
else
  echo "  ❌ Flask app is not running (no PID file)"
fi
echo ""

# Check Gunicorn processes
echo "🔍 Gunicorn Processes:"
GUNICORN_COUNT=$(pgrep -f gunicorn | wc -l)
if [ $GUNICORN_COUNT -gt 0 ]; then
  echo "  ✅ Found $GUNICORN_COUNT Gunicorn processes"
  ps aux | grep gunicorn | grep -v grep
else
  echo "  ❌ No Gunicorn processes found"
fi
echo ""

# Check port 5000
echo "🔍 Port 5000 Status:"
if netstat -tulpn | grep ":5000 " >/dev/null; then
  echo "  ✅ Port 5000 is in use"
  netstat -tulpn | grep ":5000 "
else
  echo "  ❌ Port 5000 is not in use"
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
  echo "  📋 curl details:"
  curl -v http://localhost:5000/health 2>&1 | head -10
fi
echo ""

# Check logs
echo "🔍 Recent Logs:"
if [ -f "emlinh_mng/flask.log" ]; then
  echo "  📋 Last 5 lines of flask.log:"
  tail -5 emlinh_mng/flask.log
else
  echo "  ⚠️ No flask.log found"
fi
echo ""

if [ -f "emlinh_mng/error.log" ]; then
  echo "  📋 Last 5 lines of error.log:"
  tail -5 emlinh_mng/error.log
else
  echo "  ⚠️ No error.log found"
fi
echo ""

# Summary
echo "📊 === SUMMARY === 📊"
if [ -f "flask.pid" ] && kill -0 $(cat flask.pid) 2>/dev/null && curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
  echo "🎉 Application is HEALTHY and RUNNING!"
  echo "🔗 Access at: http://localhost:5000"
else
  echo "⚠️ Application has issues. Check logs and processes above."
  echo "💡 Try: ./debug_deployment.sh for detailed diagnostics"
  echo "🔄 Try: ./start_app.sh to restart"
fi 