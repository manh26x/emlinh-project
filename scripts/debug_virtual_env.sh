#!/bin/bash
echo "🔍 === DEBUGGING VIRTUAL ENVIRONMENT === 🔍"
echo ""

cd emlinh_mng

echo "📍 Current directory: $(pwd)"
echo "📍 User: $(whoami)"
echo "📍 Current shell: $SHELL"
echo ""

echo "🔍 Checking virtual environment..."
if [ -d "venv" ]; then
    echo "✅ Virtual environment directory exists"
    echo "📂 Contents of venv/:"
    ls -la venv/
    echo ""
    echo "📂 Contents of venv/bin/:"
    ls -la venv/bin/ | head -10
    echo ""
else
    echo "❌ Virtual environment directory not found"
    echo "💡 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

echo "🔍 Before activation:"
echo "📍 which python3: $(which python3)"
echo "📍 which python: $(which python 2>/dev/null || echo 'python not found')"
echo "📍 which pip: $(which pip 2>/dev/null || echo 'pip not found')"
echo "📍 VIRTUAL_ENV: ${VIRTUAL_ENV:-'not set'}"
echo "📍 PATH: $PATH"
echo ""

echo "🔍 Activating virtual environment..."
source venv/bin/activate

echo "🔍 After activation:"
echo "📍 which python: $(which python)"
echo "📍 which pip: $(which pip)"
echo "📍 VIRTUAL_ENV: ${VIRTUAL_ENV:-'not set'}"
echo "📍 Python version: $(python --version)"
echo "📍 Pip version: $(pip --version)"
echo ""

echo "🔍 Checking Flask installation..."
python -c "import flask; print(f'✅ Flask {flask.__version__} found')" 2>/dev/null || {
    echo "❌ Flask not found"
    echo "💡 Installing Flask..."
    pip install flask
    echo "✅ Flask installed"
}

echo "🔍 Checking all Python packages:"
pip list | grep -E "(flask|gunicorn|python-dotenv)" || echo "No relevant packages found"
echo ""

echo "🔍 Testing WSGI import..."
python -c "
import sys
print('Python sys.path:')
for p in sys.path:
    print(f'  {p}')
print()
sys.path.insert(0, 'src')
try:
    from wsgi import application
    print('✅ WSGI import successful')
except Exception as e:
    print(f'❌ WSGI import failed: {e}')
    print('📋 Trying to import Flask directly...')
    try:
        import flask
        print(f'✅ Flask import successful: {flask.__version__}')
    except Exception as e2:
        print(f'❌ Flask import failed: {e2}')
"

echo ""
echo "🔍 === DEBUG COMPLETE === 🔍" 