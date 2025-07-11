#!/usr/bin/env python3
"""
WSGI entry point for the Flask application
Gunicorn will use this file to start the application
"""

import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.app.app import create_app

# Create Flask application instance
app = create_app()

# For Gunicorn, we need the application instance
application = app

if __name__ == "__main__":
    # This allows running the file directly for testing
    app.run(host='0.0.0.0', port=5000, debug=False) 