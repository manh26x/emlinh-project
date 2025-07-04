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
    # Sử dụng /app làm default trong container, fallback về thư mục hiện tại
    WORKSPACE_ROOT = os.environ.get('WORKSPACE_ROOT')
    if not WORKSPACE_ROOT:
        # Thử các path có thể, nhưng không test write permission
        possible_paths = ['/app', '/home/mike/Documents/Code/emlinh_projects', os.getcwd()]
        for path in possible_paths:
            if os.path.exists(path):
                WORKSPACE_ROOT = path
                break
        
        # Nếu không tìm được path nào, sử dụng /tmp
        if not WORKSPACE_ROOT:
            WORKSPACE_ROOT = '/tmp/emlinh_workspace'
    
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
            # Tạo từng thư mục trung gian từ root
            path_parts = directory.split('/')
            current_path = ''
            
            for part in path_parts:
                if part:  # Skip empty parts
                    current_path = os.path.join(current_path, part) if current_path else part
                    if current_path and not os.path.exists(current_path):
                        try:
                            os.makedirs(current_path, exist_ok=True)
                            if current_path not in created_dirs:
                                created_dirs.append(current_path)
                        except (OSError, PermissionError) as e:
                            if current_path not in failed_dirs:
                                failed_dirs.append(current_path)
                                print(f"Info: Skipping directory creation for {current_path} (parent not writable)")
                            break
            
            # Kiểm tra kết quả cuối cùng
            if os.path.exists(directory) and os.access(directory, os.W_OK):
                print(f"✅ Directory ready: {directory}")
            else:
                print(f"⚠️ Directory not accessible: {directory}")
        
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