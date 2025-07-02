import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.app.app import create_app

app, socketio = create_app()

if __name__ == '__main__':
    # Detect environment
    is_production = os.environ.get('FLASK_ENV') == 'production'
    is_docker = os.path.exists('/.dockerenv')
    
    # Configure based on environment
    if is_production or is_docker:
        # Production/Docker environment
        socketio.run(
            app, 
            debug=False, 
            host='0.0.0.0', 
            port=5000, 
            allow_unsafe_werkzeug=True
        )
    else:
        # Development environment
        socketio.run(app, debug=True, host='0.0.0.0', port=5000)