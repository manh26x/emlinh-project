#!/bin/bash

echo "🧪 === QUICK LOCAL TEST === 🧪"
echo ""

cd emlinh_mng

# Test 1: Virtual environment
echo "🔍 Testing virtual environment..."
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found, creating..."
    python3 -m venv venv
fi

source venv/bin/activate

# Test 2: Dependencies
echo "🔍 Testing dependencies..."
pip install -r requirements.txt || {
    echo "⚠️ requirements.txt failed, installing individually..."
    pip install Flask Flask-SQLAlchemy Flask-WTF Flask-SocketIO python-dotenv psycopg2-binary requests
}

# Test 3: Environment setup
echo "🔍 Setting up test environment..."
export DATABASE_URL="sqlite:///test_local.db"
export SECRET_KEY="test-local-secret"
export FLASK_ENV="development"

# Test 4: WSGI import
echo "🔍 Testing WSGI import..."
python -c "
import sys
sys.path.insert(0, 'src')
try:
    from wsgi import application
    print('✅ WSGI import successful')
except Exception as e:
    print(f'❌ WSGI import failed: {e}')
    exit(1)
"

# Test 5: Flask app creation
echo "🔍 Testing Flask app creation..."
python -c "
import sys
import os
sys.path.insert(0, 'src')
os.environ['DATABASE_URL'] = 'sqlite:///test_local.db'
os.environ['SECRET_KEY'] = 'test-local-secret'
try:
    from app.app import create_app
    app, socketio = create_app()
    print('✅ Flask app creation successful')
except Exception as e:
    print(f'❌ Flask app creation failed: {e}')
    import traceback
    traceback.print_exc()
    exit(1)
"

# Test 6: Database
echo "🔍 Testing database..."
python -c "
import sys
import os
sys.path.insert(0, 'src')
os.environ['DATABASE_URL'] = 'sqlite:///test_local.db'
os.environ['SECRET_KEY'] = 'test-local-secret'
try:
    from app.app import create_app
    from app.extensions import db
    app, socketio = create_app()
    with app.app_context():
        db.create_all()
        result = db.session.execute(db.text('SELECT 1')).scalar()
        if result == 1:
            print('✅ Database test successful')
        else:
            raise Exception('Database query failed')
except Exception as e:
    print(f'❌ Database test failed: {e}')
    exit(1)
"

# Test 7: Start app (optional)
echo "🔍 Would you like to start the Flask app? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🚀 Starting Flask app..."
    python src/app/run.py
fi

# Cleanup
rm -f test_local.db

echo ""
echo "✅ All local tests passed!"
echo "🎉 Your app should work in deployment!" 