#!/bin/bash
echo "🚀 Starting EmLinh application as proper daemon..."
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
echo "📦 Installing dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    pip install flask gunicorn python-dotenv
fi

# Install FFmpeg if not available
echo "🎬 Checking FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo "📥 Installing FFmpeg..."
    sudo apt-get update
    sudo apt-get install -y ffmpeg
    echo "✅ FFmpeg installed"
else
    echo "✅ FFmpeg already available"
fi

# Verify FFmpeg installation
if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg version: $(ffmpeg -version | head -n1)"
else
    echo "⚠️ FFmpeg not available - audio conversion may fail"
fi

# Install Rhubarb Lip Sync if not available
echo "🎤 Checking Rhubarb Lip Sync..."
if ! command -v rhubarb &> /dev/null; then
    echo "📥 Installing Rhubarb Lip Sync..."
    cd /tmp
    wget https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v1.13.0/rhubarb-lip-sync-1.13.0-linux.zip
    unzip rhubarb-lip-sync-1.13.0-linux.zip
    find . -name "rhubarb" -type f -exec chmod +x {} \;
    find . -name "rhubarb" -type f -exec sudo ln -sf {} /usr/local/bin/rhubarb \;
    rm rhubarb-lip-sync-1.13.0-linux.zip
    cd - > /dev/null
    echo "✅ Rhubarb Lip Sync installed"
else
    echo "✅ Rhubarb Lip Sync already available"
fi

# Verify Rhubarb installation
if command -v rhubarb &> /dev/null; then
    echo "✅ Rhubarb version: $(rhubarb --version 2>/dev/null || echo 'version info not available')"
else
    echo "⚠️ Rhubarb not available - lip sync will use fallback"
fi

# Verify installations
echo "🔍 Verifying installations..."
python -c "import flask; print(f'✅ Flask {flask.__version__} ready')"
python -c "import gunicorn; print(f'✅ Gunicorn {gunicorn.__version__} ready')"

# Test WSGI import
echo "🔍 Testing WSGI import..."
python -c "import sys; sys.path.insert(0, 'src'); from wsgi import application; print('✅ WSGI import successful')"

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "gunicorn.*wsgi:application" 2>/dev/null || true
sleep 3

# Create daemon script
echo "🔧 Creating daemon launcher..."
cat > daemon_launcher.sh << 'EOF'
#!/bin/bash

# Change to application directory
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Set environment variables
export PYTHONPATH="$(pwd)/src:$PYTHONPATH"

# Start Gunicorn with proper daemon configuration
if [ -f "gunicorn.conf.py" ]; then
    exec gunicorn -c gunicorn.conf.py wsgi:application
else
    exec gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 60 --log-level info --daemon --pid ../flask.pid --log-file flask.log wsgi:application
fi
EOF

chmod +x daemon_launcher.sh

# Method 1: Use setsid to create new session (most reliable for CI/CD)
echo "🚀 Starting Gunicorn as daemon using setsid..."
setsid bash -c "
    cd $(pwd)
    source venv/bin/activate
    export PYTHONPATH='$(pwd)/src:\$PYTHONPATH'
    
    if [ -f 'gunicorn.conf.py' ]; then
        gunicorn -c gunicorn.conf.py wsgi:application --daemon --pid ../flask.pid --log-file flask.log
    else
        gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 60 --log-level info --daemon --pid ../flask.pid --log-file flask.log wsgi:application
    fi
" > /dev/null 2>&1 < /dev/null &

# Wait for daemon to start
echo "⏳ Waiting for daemon to start..."
sleep 5

# Check if PID file exists and process is running
if [ -f "../flask.pid" ]; then
    PID=$(cat ../flask.pid)
    if kill -0 $PID 2>/dev/null; then
        echo "✅ Daemon started successfully (PID: $PID)"
        echo "📍 Process details:"
        ps aux | grep $PID | grep -v grep || echo "Process details not available"
    else
        echo "❌ PID file exists but process not running"
        echo "📋 Recent logs:"
        tail -20 flask.log 2>/dev/null || echo "No logs available"
        exit 1
    fi
else
    echo "❌ PID file not created"
    echo "📋 Checking for Gunicorn processes:"
    ps aux | grep gunicorn | grep -v grep || echo "No Gunicorn processes found"
    echo "📋 Recent logs:"
    tail -20 flask.log 2>/dev/null || echo "No logs available"
    exit 1
fi

# Health check with extended timeout
echo "⏳ Waiting for application to be ready..."
for i in {1..20}; do
    if curl -f -s http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Health check passed!"
        echo "🎉 Daemon application started successfully!"
        echo "🔗 App URL: http://localhost:5000"
        echo "📍 PID: $(cat ../flask.pid)"
        echo "📋 Process is detached from CI/CD session"
        exit 0
    fi
    echo "⏳ Health check attempt $i/20..."
    sleep 3
done

echo "⚠️ Application started but health check failed"
echo "📋 Process status:"
if [ -f "../flask.pid" ] && kill -0 $(cat ../flask.pid) 2>/dev/null; then
    echo "  ✅ Process is still running (PID: $(cat ../flask.pid))"
else
    echo "  ❌ Process is not running"
fi

echo "📋 Recent logs:"
tail -20 flask.log 2>/dev/null || echo "No logs available"

echo "📋 Port status:"
netstat -tulpn | grep 5000 || echo "Port 5000 not in use" 