#!/bin/bash
echo "🚀 Starting EmLinh application (Simple Flask Development Server)..."
echo "📅 Start time: $(date)"
echo ""

cd emlinh_mng

# Check and create virtual environment
if [ ! -d "venv" ]; then
    echo "💡 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing Flask and dependencies..."
pip install flask python-dotenv

# Export environment variables for Flask
export FLASK_APP=src/app/app.py
export FLASK_ENV=development
export PYTHONPATH="$(pwd)/src:$PYTHONPATH"

echo "📍 Python path: $(which python)"
echo "📍 Flask app: $FLASK_APP"
echo "📍 PYTHONPATH: $PYTHONPATH"

# Test Flask import
echo "🔍 Testing Flask import..."
python -c "import flask; print(f'✅ Flask {flask.__version__} ready')"

# Test WSGI import
echo "🔍 Testing WSGI import..."
python -c "import sys; sys.path.insert(0, 'src'); from wsgi import application; print('✅ WSGI import successful')"

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "flask" 2>/dev/null || true
pkill -f "gunicorn" 2>/dev/null || true
sleep 2

# Start Flask development server
echo "🚀 Starting Flask development server..."
nohup python -m flask run --host=0.0.0.0 --port=5000 > flask.log 2>&1 &

# Store PID
echo $! > ../flask.pid
echo "✅ Flask development server started (PID: $(cat ../flask.pid))"

# Wait and verify
echo "⏳ Waiting for app to be ready..."
sleep 5

if kill -0 $(cat ../flask.pid) 2>/dev/null; then
  echo "✅ Process is running"
  
  # Test health endpoint
  for i in {1..10}; do
    if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
      echo "✅ Health check passed"
      echo "🎉 Application started successfully!"
      echo "🔗 App URL: http://localhost:5000"
      echo "⚠️  Note: Using Flask development server (not for production)"
      exit 0
    fi
    echo "⏳ Waiting for health check... ($i/10)"
    sleep 5
  done
  
  echo "⚠️ App started but health check failed"
  echo "📋 Recent logs:"
  tail -10 flask.log
else
  echo "❌ Process died after startup"
  echo "📋 Logs:"
  cat flask.log
  exit 1
fi 