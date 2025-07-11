from flask import Flask, request
from src.app.config import config
from src.app.extensions import db, csrf
import os

def create_app(config_name=None):
    """Application factory pattern"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    app = Flask(__name__, 
                template_folder='../../templates',  # Đường dẫn tới thư mục templates
                static_folder='../../static')       # Đường dẫn tới thư mục static
    
    # Load configuration
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Initialize extensions with app
    db.init_app(app)
    csrf.init_app(app)
    
    # Import models first, then create database tables
    import src.app.models
    
    # Create database tables after models are imported
    with app.app_context():
        db.create_all()
    
    # Register routes
    from src.app.routes import register_routes
    register_routes(app)
    
    return app

