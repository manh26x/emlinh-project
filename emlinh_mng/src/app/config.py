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
    
    # Workspace and Path Configuration
    # Sử dụng environment variable hoặc auto-detect based on OS
    WORKSPACE_ROOT = os.environ.get('WORKSPACE_ROOT')
    if not WORKSPACE_ROOT:
        # Auto-detect workspace root based on OS and current location
        current_dir = os.getcwd()
        
        # Windows-specific paths
        if os.name == 'nt':  # Windows
            possible_paths = [
                current_dir,  # Current directory first
                os.path.join(os.path.expanduser('~'), 'Documents', 'emlinh-project'),
                os.path.join('C:', 'Users', 'Admin', 'Documents', 'emlinh-project'),
                os.path.join(current_dir, '..'),  # Parent directory
            ]
        else:  # Unix/Linux
            possible_paths = [
                '/app', 
                '/home/mike/Documents/Code/emlinh_projects', 
                current_dir,
                os.path.join(current_dir, '..')
            ]
        
        for path in possible_paths:
            if os.path.exists(path):
                WORKSPACE_ROOT = os.path.abspath(path)
                break
        
        # Fallback based on OS
        if not WORKSPACE_ROOT:
            if os.name == 'nt':  # Windows
                WORKSPACE_ROOT = os.path.join(os.path.expanduser('~'), 'emlinh_workspace')
            else:  # Unix/Linux
                WORKSPACE_ROOT = '/tmp/emlinh_workspace'
    
    # Normalize paths for current OS
    WORKSPACE_ROOT = os.path.normpath(WORKSPACE_ROOT)
    REMOTION_PATH = os.path.join(WORKSPACE_ROOT, 'emlinh-remotion')
    REMOTION_OUTPUT_DIR = os.path.join(WORKSPACE_ROOT, 'emlinh-remotion', 'out')
    AUDIO_OUTPUT_DIR = os.path.join(WORKSPACE_ROOT, 'emlinh-remotion', 'public', 'audios')
    
    # Đảm bảo các thư mục cần thiết tồn tại (chỉ trong môi trường có permission)
    @classmethod
    def ensure_directories(cls):
        """Tạo các thư mục cần thiết nếu chưa tồn tại và có quyền"""
        directories = [
            cls.REMOTION_OUTPUT_DIR,
            cls.AUDIO_OUTPUT_DIR
        ]
        
        created_dirs = []
        failed_dirs = []
        
        for directory in directories:
            # Use os.path.normpath to handle both Windows and Unix paths
            directory = os.path.normpath(directory)
            
            try:
                # Create directory and all parent directories
                os.makedirs(directory, exist_ok=True)
                if os.path.exists(directory) and os.access(directory, os.W_OK):
                    created_dirs.append(directory)
                    print(f"✅ Directory ready: {directory}")
                else:
                    failed_dirs.append(directory)
                    print(f"⚠️ Directory created but not writable: {directory}")
            except (OSError, PermissionError) as e:
                failed_dirs.append(directory)
                print(f"❌ Failed to create directory {directory}: {e}")
        
        if created_dirs:
            print(f"✅ Created directories: {', '.join(created_dirs)}")
        
        return len(failed_dirs) == 0
    
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
        # Tạo các thư mục cần thiết khi khởi tạo app
        success = Config.ensure_directories()
        if not success:
            print("⚠️ Some directories could not be created. App may have limited functionality.")
        else:
            print("✅ All required directories are ready.")

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