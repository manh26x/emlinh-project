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
    # Sử dụng /app làm default trong container, fallback về thư mục hiện tại nếu không có quyền
    WORKSPACE_ROOT = os.environ.get('WORKSPACE_ROOT')
    if not WORKSPACE_ROOT:
        # Thử các path có thể
        possible_paths = ['/app', '/home/mike/Documents/Code/emlinh_projects', os.getcwd()]
        for path in possible_paths:
            try:
                # Kiểm tra xem có thể tạo thư mục test không
                test_dir = os.path.join(path, 'test_write_permission')
                os.makedirs(test_dir, exist_ok=True)
                os.rmdir(test_dir)
                WORKSPACE_ROOT = path
                break
            except (OSError, PermissionError):
                continue
        
        # Nếu không tìm được path nào có thể write, sử dụng /tmp
        if not WORKSPACE_ROOT:
            WORKSPACE_ROOT = '/tmp/emlinh_workspace'
            os.makedirs(WORKSPACE_ROOT, exist_ok=True)
    
    REMOTION_PATH = os.path.join(WORKSPACE_ROOT, 'emlinh-remotion')
    REMOTION_OUTPUT_DIR = os.path.join(WORKSPACE_ROOT, 'emlinh-remotion', 'out')
    AUDIO_OUTPUT_DIR = os.path.join(WORKSPACE_ROOT, 'emlinh-remotion', 'public', 'audios')
    
    # Đảm bảo các thư mục cần thiết tồn tại
    @classmethod
    def ensure_directories(cls):
        """Tạo các thư mục cần thiết nếu chưa tồn tại"""
        directories = [
            cls.REMOTION_OUTPUT_DIR,
            cls.AUDIO_OUTPUT_DIR
        ]
        
        for directory in directories:
            try:
                os.makedirs(directory, exist_ok=True)
            except (OSError, PermissionError) as e:
                print(f"Warning: Cannot create directory {directory}: {e}")
    
    # Ollama Embedding Configuration
    OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL') or 'http://192.168.1.10:11434'
    OLLAMA_EMBED_MODEL = os.environ.get('OLLAMA_EMBED_MODEL') or 'nomic-embed-text'
    EMBEDDING_DIMENSION = int(os.environ.get('EMBEDDING_DIMENSION', '768'))
    
    @staticmethod
    def init_app(app):
        """Initialize application with this configuration"""
        # Tạo các thư mục cần thiết khi khởi tạo app
        Config.ensure_directories()

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