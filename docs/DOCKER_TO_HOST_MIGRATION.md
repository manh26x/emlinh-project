# Tài liệu Migration từ Docker sang Direct Host Execution

## Tổng quan
Tài liệu này mô tả quá trình refactor toàn bộ workflow GitHub Actions từ việc sử dụng Docker containers sang chạy trực tiếp trên self-hosted runner.

## Files được refactor
1. **`.github/workflows/deploy.yml`** - Main deployment workflow (hoàn toàn refactor từ Docker)
2. **`.github/workflows/facebook-service-tests.yml`** - Facebook service testing workflow (cập nhật để rõ ràng về không sử dụng Docker)

## Thay đổi chính

### 1. Loại bỏ Docker Components
- ❌ Xóa tất cả các environment variables liên quan đến Docker:
  - `DOCKER_BUILDKIT: 1`
  - `COMPOSE_DOCKER_CLI_BUILD: 1`
- ❌ Xóa tất cả các Docker commands:
  - `docker build`
  - `docker compose up/down`
  - `docker system prune`
  - `docker image prune`

### 2. Environment Variables mới
```yaml
env:
  FLASK_PORT: 5000
  NODE_PORT: 3000
  PYTHON_VERSION: '3.10'
  NODE_VERSION: '18'
  FACEBOOK_ACCESS_TOKEN: test_token_for_deploy_pipeline
  FACEBOOK_API_VERSION: v18.0
```

### 3. Cấu trúc Jobs mới

#### Test Job
- **Pre-checkout cleanup**: Dừng tất cả processes Python/Node thay vì Docker containers
- **Environment setup**: Sử dụng GitHub Actions để setup Python và Node.js
- **Dependencies**: Cài đặt trực tiếp với pip và npm
- **Testing**: Chạy tests trực tiếp trên host
- **Flask startup test**: Thêm test startup application

#### Deploy Job
- **Process management**: Sử dụng pkill để quản lý processes thay vì Docker
- **Application startup**: Sử dụng Gunicorn để chạy Flask app
- **Health checks**: Curl trực tiếp đến localhost thay vì containers
- **Management scripts**: Tạo scripts để start/stop/status applications

#### Notification Job
- **Status monitoring**: Kiểm tra processes qua PID files và health endpoints
- **Cleanup**: Xóa temporary files nhưng giữ running applications

## Thay đổi chi tiết

### 1. Process Management
```bash
# Thay vì
docker compose down --remove-orphans

# Bây giờ sử dụng
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "flask.*run" 2>/dev/null || true
pkill -f "gunicorn" 2>/dev/null || true
```

### 2. Application Startup
```bash
# Thay vì Docker
docker compose build --no-cache
docker compose up -d

# Bây giờ chạy trực tiếp
nohup gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 60 --pythonpath src app.app:app > flask.log 2>&1 &
echo $! > flask.pid
```

### 3. Health Checks
```bash
# Thay vì kiểm tra Docker containers
docker compose ps | grep -q "healthy\|Up"

# Bây giờ kiểm tra trực tiếp
curl -f http://localhost:5000/health
kill -0 $(cat flask.pid) 2>/dev/null
```

### 4. Environment Configuration
Thêm cấu hình cho direct host execution:
```bash
# Host execution configuration (no Docker)
WORKSPACE_ROOT=${{ github.workspace }}
HOST_EXECUTION=true

# Application ports for direct host execution
FLASK_PORT=5000
NODE_PORT=3000
```

## Management Scripts

### start_app.sh
```bash
#!/bin/bash
echo "🚀 Starting EmLinh applications on host..."

cd emlinh_mng
nohup gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 60 --pythonpath src app.app:app > flask.log 2>&1 &
echo $! > ../flask.pid
echo "✅ Flask app started (PID: $(cat ../flask.pid))"

echo "🎉 Applications started successfully!"
```

### stop_app.sh
```bash
#!/bin/bash
echo "🛑 Stopping EmLinh applications..."

if [ -f "flask.pid" ]; then
  kill $(cat flask.pid) 2>/dev/null || true
  rm -f flask.pid
  echo "✅ Flask app stopped"
fi

pkill -f "gunicorn" 2>/dev/null || true
pkill -f "python.*app.py" 2>/dev/null || true

echo "✅ All applications stopped"
```

### status_app.sh
```bash
#!/bin/bash
echo "📊 Application Status:"

if [ -f "flask.pid" ] && kill -0 $(cat flask.pid) 2>/dev/null; then
  echo "✅ Flask app is running (PID: $(cat flask.pid))"
  curl -s http://localhost:5000/health && echo " - Health check passed"
else
  echo "❌ Flask app is not running"
fi
```

## Lợi ích của Direct Host Execution

### 1. Performance
- ✅ Loại bỏ overhead của Docker layers
- ✅ Truy cập trực tiếp đến filesystem
- ✅ Không cần Docker image building time

### 2. Simplicity
- ✅ Dễ debug và troubleshoot
- ✅ Logs trực tiếp accessible
- ✅ Không cần quản lý Docker volumes

### 3. Resource Usage
- ✅ Sử dụng ít memory hơn
- ✅ Không cần Docker daemon
- ✅ Faster startup time

### 4. Development Experience
- ✅ Easier local testing
- ✅ Direct access to application files
- ✅ Simplified deployment process

## Troubleshooting

### 1. Application không start
```bash
# Check logs
cat emlinh_mng/flask.log

# Check dependencies
pip list

# Check port availability
netstat -tulpn | grep 5000

# Test manual startup
cd emlinh_mng && python src/app/run.py
```

### 2. Permission issues
```bash
# Fix permissions
sudo chown -R $USER:$USER .
chmod -R 755 .

# Recreate directories
mkdir -p public/audios public/models emlinh_mng/instance
chmod -R 755 public/ emlinh_mng/instance/
```

### 3. Process management
```bash
# Check running processes
ps aux | grep gunicorn
ps aux | grep python

# Kill processes manually
pkill -f gunicorn
pkill -f "python.*app.py"
```

## Thay đổi cho facebook-service-tests.yml

File `facebook-service-tests.yml` đã sử dụng self-hosted runner từ đầu nhưng được cập nhật để rõ ràng về việc không sử dụng Docker:

### Cập nhật thực hiện:
1. **Title**: Thêm "(Direct Host Execution)" vào tên workflow
2. **Environment Variables**: Thêm `PYTHON_VERSION: '3.10'` và comment về không sử dụng Docker
3. **Job Comments**: Thêm comment `# Direct host execution (no Docker containers)` cho tất cả jobs
4. **Step Names**: Cập nhật tên steps để rõ ràng về "direct host execution"
5. **Success Notification**: Cập nhật để hiển thị thông tin về execution mode

### Ví dụ thay đổi:
```yaml
# Trước
name: Facebook Service Tests
runs-on: self-hosted

# Sau  
name: Facebook Service Tests (Direct Host Execution)
runs-on: self-hosted  # Direct host execution (no Docker containers)
```

## Migration Checklist

### Deploy.yml (Major Refactor)
- [x] Loại bỏ tất cả Docker environment variables
- [x] Thay thế Docker commands bằng direct process management
- [x] Cập nhật health checks cho direct host access
- [x] Tạo management scripts cho start/stop/status
- [x] Cập nhật environment configuration
- [x] Thêm proper error handling và logging
- [x] Cập nhật documentation và comments
- [x] Test deployment pipeline

### Facebook-service-tests.yml (Minor Updates)
- [x] Thêm comments rõ ràng về không sử dụng Docker
- [x] Cập nhật environment variables để consistent
- [x] Cập nhật job names và step descriptions
- [x] Thêm thông tin execution mode trong notifications
- [x] Đảm bảo Python version được parameterized

## Monitoring và Maintenance

### Daily Checks
```bash
# Check application status
./status_app.sh

# Check logs for errors
tail -f emlinh_mng/flask.log

# Check system resources
top
df -h
```

### Weekly Maintenance
```bash
# Clean up temporary files
rm -rf public/audios/* public/models/*
rm -rf emlinh-remotion/out/*

# Update dependencies
cd emlinh_mng && pip install --upgrade -r requirements.txt
cd emlinh-remotion && npm update
```

## Kết luận

Việc migration từ Docker sang direct host execution đã được hoàn thành thành công cho toàn bộ repository:

### Files đã được refactor:
1. **`.github/workflows/deploy.yml`**: Hoàn toàn refactor từ Docker-based sang direct host execution
2. **`.github/workflows/facebook-service-tests.yml`**: Cập nhật và clarify về việc không sử dụng Docker

### Lợi ích đạt được:
1. **Performance cải thiện**: Loại bỏ Docker overhead hoàn toàn
2. **Simplicity tăng**: Dễ debug và maintain hơn đáng kể
3. **Resource efficiency**: Sử dụng ít tài nguyên hệ thống hơn
4. **Better monitoring**: Truy cập trực tiếp logs và processes
5. **Consistency**: Tất cả workflows đều sử dụng direct host execution

### Tính năng mới:
- Management scripts (start_app.sh, stop_app.sh, status_app.sh)
- Process-based application management
- Direct health monitoring
- Improved error handling và logging
- Cleaner environment configuration

Toàn bộ CI/CD pipeline hiện đã được tối ưu cho self-hosted runner với direct host execution, đảm bảo tính ổn định, hiệu suất cao và dễ bảo trì cho môi trường production.