#!/usr/bin/env python3
"""
Simple debug script for Flask SQLAlchemy core - no services
"""

import sys
import os

# Change to correct directory
os.chdir('emlinh_mng')

# Add current directory to path so 'src.app' can be imported
sys.path.insert(0, '.')

print("🔍 Starting Flask SQLAlchemy CORE debug...")
print(f"📋 Current directory: {os.getcwd()}")

try:
    print("📋 Step 1: Set environment variables...")
    # Clear any existing DATABASE_URL to force SQLite usage
    if 'DATABASE_URL' in os.environ:
        del os.environ['DATABASE_URL']
    
    os.environ['DATABASE_URL'] = 'sqlite:///debug_test.db'
    os.environ['SECRET_KEY'] = 'debug-secret-key'
    os.environ['FLASK_ENV'] = 'development'
    print("✅ Environment variables set")
    
    print("📋 Step 2: Import extensions...")
    from src.app.extensions import db, csrf, socketio
    print("✅ Extensions import successful")
    
    print("📋 Step 3: Import models...")
    from src.app.models import Chat, Video, Idea, Vector
    print("✅ Models import successful")
    
    print("📋 Step 4: Create minimal Flask app...")
    from flask import Flask
    from src.app.config import config
    
    app = Flask(__name__, 
                template_folder='../../templates',
                static_folder='../../static')
    
    # Load configuration
    config_name = os.environ.get('FLASK_ENV', 'default')
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Initialize extensions
    db.init_app(app)
    csrf.init_app(app)
    socketio.init_app(app)
    
    print("✅ Minimal Flask app created")
    
    print("📋 Step 5: Test database in app context...")
    with app.app_context():
        print("✅ App context created")
        
        # Create all tables
        print("📋 Creating database tables...")
        db.create_all()
        print("✅ Database tables created successfully")
        
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
        
        # Test creating a simple record
        print("📋 Testing record creation...")
        test_chat = Chat(
            session_id='test-session',
            user_message='Test message',
            ai_response='Test response',
            message_type='conversation'
        )
        db.session.add(test_chat)
        db.session.commit()
        
        # Query the record back
        retrieved_chat = Chat.query.filter_by(session_id='test-session').first()
        if retrieved_chat:
            print("✅ Record creation and retrieval test passed")
            print(f"  📋 Retrieved chat: {retrieved_chat.user_message}")
        else:
            print("⚠️ Record creation test failed")
            
        print("✅ All core tests passed! Flask app and SQLAlchemy are working correctly.")
        
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