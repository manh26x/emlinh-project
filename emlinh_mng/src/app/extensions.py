"""
Flask extensions initialization
Separate file to avoid circular imports
"""

from flask_sqlalchemy import SQLAlchemy
from flask_wtf.csrf import CSRFProtect

# Initialize extensions
db = SQLAlchemy()
csrf = CSRFProtect() 