#!/bin/bash
echo "🧪 Testing environment..."

cd emlinh_mng

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found"
    echo "💡 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

echo "📍 Python path: $(which python)"
echo "📍 Python version: $(python --version)"

# Check if Flask is available
python -c "import flask; print(f'✅ Flask {flask.__version__} available')" 2>/dev/null || {
    echo "❌ Flask not found, installing..."
    pip install flask gunicorn python-dotenv
}

# Check if requirements.txt exists and install
if [ -f "requirements.txt" ]; then
    echo "📦 Installing from requirements.txt..."
    pip install -r requirements.txt
fi

# Test WSGI import
echo "🔍 Testing WSGI import..."
python -c "import sys; sys.path.insert(0, 'src'); from wsgi import application; print('✅ WSGI import successful')" || {
    echo "❌ WSGI import failed"
    echo "📋 Available packages:"
    pip list | grep -E "(flask|gunicorn|python-dotenv)"
}

echo "🎉 Environment test completed!" 