import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Flask application configuration class"""
    
    # Secret key for session management and CSRF protection
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database configuration
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Additional Flask-SQLAlchemy settings
    SQLALCHEMY_ECHO = os.environ.get('SQLALCHEMY_ECHO', 'False').lower() == 'true'
    
    # Ollama Embedding Configuration
    OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL') or 'http://192.168.1.10:11434'
    OLLAMA_EMBED_MODEL = os.environ.get('OLLAMA_EMBED_MODEL') or 'nomic-embed-text'
    EMBEDDING_DIMENSION = int(os.environ.get('EMBEDDING_DIMENSION', '768'))
    
    # Facebook API Configuration
    FACEBOOK_ACCESS_TOKEN = os.environ.get('FACEBOOK_ACCESS_TOKEN')
    FACEBOOK_API_VERSION = os.environ.get('FACEBOOK_API_VERSION') or 'v18.0'
    FACEBOOK_BASE_URL = f"https://graph.facebook.com/{FACEBOOK_API_VERSION if FACEBOOK_API_VERSION else 'v18.0'}"
    
    @staticmethod
    def init_app(app):
        """Initialize application with this configuration"""
        pass

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_ECHO = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Log to syslog in production
        import logging
        from logging.handlers import SysLogHandler
        syslog_handler = SysLogHandler()
        syslog_handler.setLevel(logging.WARNING)
        app.logger.addHandler(syslog_handler)

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}