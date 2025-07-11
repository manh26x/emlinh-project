"""
Flask extensions initialization
Separate file to avoid circular imports
"""

from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect
from flask_socketio import SocketIO

# Initialize extensions
db = SQLAlchemy()
csrf = CSRFProtect()
socketio = SocketIO(
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=1e8,
    async_mode='threading'
) 