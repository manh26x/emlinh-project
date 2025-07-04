#!/usr/bin/env python3
"""
Debug script for Flask SQLAlchemy initialization
"""

import sys
import os

# Change to correct directory
os.chdir('emlinh_mng')

# Add current directory to path so 'src.app' can be imported
sys.path.insert(0, '.')

print("🔍 Starting Flask SQLAlchemy debug...")
print(f"📋 Current directory: {os.getcwd()}")
print(f"📋 Python path: {sys.path[:3]}")

try:
    print("📋 Step 1: Set environment variables first...")
    # Clear any existing DATABASE_URL to force SQLite usage
    if 'DATABASE_URL' in os.environ:
        del os.environ['DATABASE_URL']
    
    os.environ['DATABASE_URL'] = 'sqlite:///debug_test.db'
    os.environ['SECRET_KEY'] = 'debug-secret-key'
    os.environ['FLASK_ENV'] = 'development'
    print("✅ Environment variables set")
    
    print("📋 Step 2: Import extensions...")
    from src.app.extensions import db
    print("✅ Extensions import successful")
    
    print("📋 Step 3: Import models...")
    from src.app.models import Chat, Video, Idea, Vector
    print("✅ Models import successful")
    
    print("📋 Step 4: Import app factory...")
    from src.app.app import create_app
    print("✅ App factory import successful")
    
    print("📋 Step 5: Create app...")
    app, socketio = create_app()
    print("✅ App creation successful")
    print(f"✅ App config ENV: {app.config.get('FLASK_ENV', 'default')}")
    print(f"✅ App config DATABASE_URL: {app.config.get('SQLALCHEMY_DATABASE_URI', 'not set')}")
    
    print("📋 Step 6: Test app context and database...")
    with app.app_context():
        print("✅ App context created")
        
        # Test database connection
        print("📋 Testing database query...")
        result = db.session.execute(db.text('SELECT 1')).scalar()
        if result == 1:
            print("✅ Database connection test passed")
        else:
            print("⚠️ Database connection test failed")
            
        print("📋 Testing database tables...")
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"✅ Database tables: {tables}")
            
        print("✅ All tests passed! Flask app and database are working correctly.")
        
except Exception as e:
    print(f"❌ Error occurred: {e}")
    import traceback
    print("📋 Full traceback:")
    traceback.print_exc()
    sys.exit(1)
finally:
    # Clean up
    if os.path.exists('debug_test.db'):
        os.remove('debug_test.db')
    print("🧹 Cleanup completed") 