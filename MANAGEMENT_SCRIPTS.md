# 🚀 EmLinh Application Management Scripts

This document describes the application management scripts for the EmLinh project. These scripts allow you to easily start, stop, and monitor the Flask application in both development and production environments.

## 📋 Available Scripts

### 1. `start_app.sh` - Start the Application

Starts the EmLinh Flask application with Gunicorn server.

```bash
./start_app.sh
```

**Features:**
- ✅ Pre-flight checks (virtual environment, dependencies, configuration)
- ✅ Automatic virtual environment setup if missing
- ✅ Dependency installation if required
- ✅ WSGI and Flask app validation
- ✅ Gunicorn configuration creation
- ✅ Health check verification
- ✅ Process monitoring and PID management

### 2. `stop_app.sh` - Stop the Application

Gracefully stops all application processes.

```bash
./stop_app.sh
```

**Features:**
- ✅ Graceful shutdown with SIGTERM
- ✅ Force kill if needed (SIGKILL)
- ✅ Cleanup of PID files
- ✅ Comprehensive process termination

### 3. `status_app.sh` - Check Application Status

Provides comprehensive status information about the running application.

```bash
./status_app.sh
```

**Features:**
- ✅ Process status and PID information
- ✅ Port usage verification
- ✅ Health endpoint testing
- ✅ Log file analysis
- ✅ Environment configuration check
- ✅ Disk space monitoring
- ✅ Virtual environment validation

## 🔧 Usage Examples

### Starting the Application
```bash
# Navigate to project root
cd /path/to/emlinh-project

# Start the application
./start_app.sh
```

### Checking Status
```bash
# Check if application is running
./status_app.sh

# Exit code 0 = healthy, 1 = issues
echo $?
```

### Stopping the Application
```bash
# Gracefully stop the application
./stop_app.sh
```

### Restart Application
```bash
# Full restart cycle
./stop_app.sh && ./start_app.sh
```

## 🌍 Environment Requirements

### Required Environment Variables
The application requires these environment variables (can be set in `.env` file):

```bash
# Core configuration
SECRET_KEY=your-secret-key
FLASK_ENV=development|production
DATABASE_URL=sqlite:///emlinh_local.db

# OpenAI API (required for TTS service)
OPENAI_API_KEY=your-openai-api-key

# Optional configurations
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
EMBEDDING_DIMENSION=768
```

### Directory Structure
The scripts expect this project structure:
```
emlinh-project/
├── start_app.sh           # Application start script
├── stop_app.sh            # Application stop script
├── status_app.sh          # Application status script
├── .env                   # Environment configuration
├── emlinh_mng/            # Flask application directory
│   ├── venv/              # Virtual environment (auto-created)
│   ├── src/               # Source code
│   ├── wsgi.py            # WSGI entry point
│   └── requirements.txt   # Python dependencies
└── public/                # Public assets
    ├── audios/
    └── models/
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Script Permission Errors
```bash
# Make scripts executable
chmod +x start_app.sh stop_app.sh status_app.sh
```

#### 2. Virtual Environment Issues
```bash
# Remove and recreate virtual environment
rm -rf emlinh_mng/venv
./start_app.sh  # Will auto-create venv
```

#### 3. Port Already in Use
```bash
# Check what's using port 5000
sudo netstat -tulpn | grep :5000

# Kill processes using the port
sudo fuser -k 5000/tcp

# Or use stop script
./stop_app.sh
```

#### 4. Missing Dependencies
```bash
# Reinstall dependencies
cd emlinh_mng
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

#### 5. OpenAI API Key Issues
```bash
# Check environment configuration
grep OPENAI_API_KEY .env
grep OPENAI_API_KEY emlinh_mng/.env

# Set a test key for development
export OPENAI_API_KEY="sk-test-key-for-development"
```

### Debug Commands

```bash
# View real-time logs
tail -f emlinh_mng/flask.log

# Check gunicorn processes
ps aux | grep gunicorn

# Test health endpoint manually
curl -v http://localhost:5000/health

# Test WSGI import manually
cd emlinh_mng
source venv/bin/activate
python -c "import sys; sys.path.insert(0, 'src'); from wsgi import application; print('OK')"
```

## 🎯 CI/CD Integration

These scripts are designed to work seamlessly with GitHub Actions self-hosted runners:

```yaml
# In your GitHub Actions workflow
- name: Start Application
  run: ./start_app.sh

- name: Check Application Status
  run: ./status_app.sh

- name: Stop Application (cleanup)
  run: ./stop_app.sh
  if: always()
```

## 📊 Exit Codes

- **0**: Success / Application healthy
- **1**: Error / Application unhealthy
- **Other**: Specific error conditions

## 🛡️ Security Considerations

1. **Environment Variables**: Never commit `.env` files with real secrets
2. **File Permissions**: Ensure scripts have appropriate execute permissions
3. **Process Isolation**: Scripts run applications with current user permissions
4. **Port Binding**: Default binding to `0.0.0.0:5000` (configure as needed)

## 📈 Monitoring

The status script provides comprehensive monitoring including:
- Process health and resource usage
- Database connectivity
- HTTP endpoint availability
- Log file analysis
- Disk space monitoring
- Configuration validation

## 🔄 Development vs Production

### Development Mode
```bash
# Set development environment
echo "FLASK_ENV=development" >> .env
./start_app.sh
```

### Production Mode
```bash
# Set production environment
echo "FLASK_ENV=production" >> .env
./start_app.sh
```

The scripts automatically adapt to the environment configuration and provide appropriate logging and error handling for each mode.