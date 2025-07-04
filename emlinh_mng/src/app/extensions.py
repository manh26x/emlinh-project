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
socketio = SocketIO(cors_allowed_origins="*") 