    #!/bin/bash
    echo "🚀 Starting EmLinh applications on host..."
    echo "📅 Start time: $(date)"
    echo ""

    # Pre-flight checks
    echo "🔍 Running pre-flight checks..."
    cd emlinh_mng
    echo ""

    # Check virtual environment
if [ ! -d "venv" ]; then
  echo "❌ Virtual environment not found"
  echo "💡 Creating virtual environment..."
  python3 -m venv venv
  echo "✅ Virtual environment created"
fi
echo ""

    # Activate virtual environment
source venv/bin/activate
echo "✅ Virtual environment activated"
echo "📍 Python path: $(which python)"
echo "📍 Python version: $(python --version)"
echo "📍 Pip path: $(which pip)"

# Ensure we're using the virtual environment's Python
export PYTHONPATH="$(pwd)/src:$PYTHONPATH"
export PATH="$(pwd)/venv/bin:$PATH"
echo "📍 PYTHONPATH: $PYTHONPATH"
echo "📍 PATH: $PATH"
echo ""

# Check and install dependencies if needed
echo "🔍 Checking dependencies..."
if [ -f "requirements.txt" ]; then
  echo "📦 Installing/updating dependencies..."
  pip install -r requirements.txt
  echo "✅ Dependencies installed"
else
  echo "⚠️ No requirements.txt found, installing basic dependencies..."
  pip install flask gunicorn python-dotenv
  echo "✅ Basic dependencies installed"
fi

# Verify Flask installation
echo "🔍 Verifying Flask installation..."
echo "📋 Current pip list:"
pip list | grep -i flask
echo "📋 Testing Flask import..."
python -c "import flask; print(f'✅ Flask {flask.__version__} installed successfully')" || {
  echo "❌ Flask installation failed"
  echo "💡 Retrying Flask installation..."
  pip install --force-reinstall flask
  echo "📋 After reinstall, pip list:"
  pip list | grep -i flask
  python -c "import flask; print(f'✅ Flask {flask.__version__} installed successfully')" || {
    echo "❌ Flask installation still failed"
    echo "📋 Python executable: $(which python)"
    echo "📋 Python version: $(python --version)"
    echo "📋 Site packages: $(python -c 'import site; print(site.getsitepackages())')"
    exit 1
  }
}
echo ""

# Test WSGI import
echo "🔍 Testing WSGI import..."
if [ ! -f "wsgi.py" ]; then
  echo "❌ wsgi.py not found"
  exit 1
fi
python -c "import sys; sys.path.insert(0, 'src'); from wsgi import application; print('✅ WSGI import successful')" || {
  echo "❌ WSGI import failed"
  echo "📋 Available Python packages:"
  pip list | grep -E "(flask|gunicorn)"
  exit 1
}
    echo ""

    # Stop any existing processes
    echo "🛑 Stopping existing processes..."
    pkill -f "gunicorn" 2>/dev/null || true
    sleep 2
    echo ""

    # Start Gunicorn with enhanced configuration
echo "🚀 Starting Gunicorn..."

# Double-check virtual environment is active
if [[ "$VIRTUAL_ENV" != "" ]]; then
  echo "✅ Virtual environment is active: $VIRTUAL_ENV"
else
  echo "❌ Virtual environment not detected, reactivating..."
  source venv/bin/activate
  export PYTHONPATH="$(pwd)/src:$PYTHONPATH"
  export PATH="$(pwd)/venv/bin:$PATH"
fi

# Use full path to ensure we use the virtual environment's gunicorn
GUNICORN_PATH="$(which gunicorn)"
if [ -z "$GUNICORN_PATH" ]; then
  echo "❌ Gunicorn not found, installing..."
  pip install gunicorn
  GUNICORN_PATH="$(which gunicorn)"
fi
echo "📍 Using Gunicorn at: $GUNICORN_PATH"

# Use explicit Python path for gunicorn
PYTHON_PATH="$(which python)"
echo "📍 Using Python at: $PYTHON_PATH"

# Test one more time before starting
echo "🔍 Final test before starting Gunicorn..."
$PYTHON_PATH -c "import sys; sys.path.insert(0, 'src'); from wsgi import application; print('✅ Final WSGI test successful')" || {
  echo "❌ Final WSGI test failed"
  echo "📋 Python sys.path:"
  $PYTHON_PATH -c "import sys; print('\n'.join(sys.path))"
  exit 1
}

# Start Gunicorn with explicit Python path
echo "🔍 Starting Gunicorn with Python module approach..."
if [ -f "gunicorn.conf.py" ]; then
  nohup $PYTHON_PATH -m gunicorn -c gunicorn.conf.py wsgi:application > flask.log 2>&1 &
else
  nohup $PYTHON_PATH -m gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 60 --log-level info wsgi:application > flask.log 2>&1 &
fi

# Store the PID immediately
GUNICORN_PID=$!
echo "🔍 Gunicorn started with PID: $GUNICORN_PID"

# Wait a moment and check if Gunicorn is still running
sleep 3
if ! kill -0 $GUNICORN_PID 2>/dev/null; then
  echo "❌ Gunicorn failed to start, trying Flask development server as fallback..."
  echo "📋 Gunicorn error logs:"
  cat flask.log 2>/dev/null || echo "No logs available"
  
  # Try Flask development server
  export FLASK_APP=src/app/app.py
  export FLASK_ENV=development
  nohup $PYTHON_PATH -m flask run --host=0.0.0.0 --port=5000 > flask.log 2>&1 &
  GUNICORN_PID=$!
  echo "🔍 Flask development server started with PID: $GUNICORN_PID"
fi
    echo ""

    # Store Flask PID
    echo $GUNICORN_PID > ../flask.pid
    echo "✅ Flask app started (PID: $(cat ../flask.pid))"
    echo ""

    # Wait and verify startup
    echo "⏳ Waiting for app to be ready..."
    sleep 5
    echo ""

    if kill -0 $(cat ../flask.pid) 2>/dev/null; then
    echo "✅ Process is running"
    
    # Test health endpoint
    for i in {1..12}; do
        if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Health check passed"
        echo "🎉 Applications started successfully!"
        echo "🔗 App URL: http://localhost:5000"
        exit 0
        fi
        echo "⏳ Waiting for health check... ($i/12)"
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