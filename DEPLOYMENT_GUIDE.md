# 🚀 Hướng Dẫn Deployment - Emlinh Project

## 📋 Tổng Quan

Dự án này sử dụng Docker Compose để orchestrate hai services chính:
- **emlinh_mng**: Flask backend với Python
- **emlinh-remotion**: React Three Fiber frontend với Remotion

## 🛠️ Cài Đặt Trước Khi Deploy

### 1. Dependencies Hệ Thống

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose make curl git

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 2. Clone Repository

```bash
git clone https://github.com/manh26x/emlinh-project.git
cd emlinh-project
```

### 3. Cấu Hình Environment

```bash
# Copy template environment file
cp .env.example .env

# Chỉnh sửa .env với editor yêu thích
nano .env
```

## 🚀 Quick Start

### Sử Dụng Makefile (Khuyến Nghị)

```bash
# Xem tất cả commands có sẵn
make help

# Build và deploy một lần
make prod-deploy

# Kiểm tra status
make status
```

### Hoặc Sử Dụng Docker Compose Trực Tiếp

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f
```

## 📊 Kiểm Tra Deployment

### Health Check

```bash
# Kiểm tra health endpoint
curl http://localhost:5000/health

# Kết quả mong đợi:
{
  "status": "healthy",
  "timestamp": "2025-01-20T...",
  "services": {
    "database": "up",
    "flask": "up"
  }
}
```

### Service Status

```bash
# Kiểm tra tất cả containers
docker-compose ps

# Monitor resource usage
docker stats
```

## 🔧 Services & Ports

| Service | Port | Mô Tả |
|---------|------|--------|
| Flask App | 5000 | Main web application |
| Remotion Studio | 3000 | Video production interface |
| PostgreSQL | 5432 | Database (internal only) |
| Nginx | 80, 443 | Reverse proxy & load balancer |
| Ollama | 11434 | AI embeddings (internal only) |

## 🔧 Các Công Cụ Được Cài Đặt

### Rhubarb Lip Sync
- **Path**: `/usr/local/bin/rhubarb`
- **Version**: 1.13.0
- **Usage**: Automatic lip sync generation

### FFmpeg
- **Path**: `/usr/bin/ffmpeg`
- **Usage**: Video processing và encoding

## 🔄 GitHub Actions CI/CD

### Setup Self-Hosted Runner

```bash
# Trên server của bạn
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure runner
./config.sh --url https://github.com/manh26x/emlinh-project --token YOUR_TOKEN

# Install và start service
sudo ./svc.sh install
sudo ./svc.sh start
```

### Required GitHub Secrets

Đi tới repository → Settings → Secrets and variables → Actions, và thêm:

- `SECRET_KEY`: Flask secret key
- `DATABASE_URL`: Production database URL
- `OLLAMA_BASE_URL`: Ollama service URL

### Auto Deployment Workflow

- **Trigger**: Push/merge vào branch `main`
- **Actions**: Test → Build → Deploy → Verify
- **Notification**: Status report sau deployment

## 🔧 Quản Lý Production

### Backup Database

```bash
# Tạo backup
make backup-db

# Hoặc manual
docker-compose exec postgres pg_dump -U emlinh_user emlinh_db > backup.sql
```

### Restore Database

```bash
# Restore từ backup
make restore-db BACKUP_FILE=backup.sql
```

### Monitoring

```bash
# Real-time logs
make logs

# Resource monitoring
make monitor

# Service status
make status
```

### Scaling

```bash
# Scale application container
docker-compose up -d --scale emlinh_app=3

# Update nginx config để load balance
```

## 🚨 Troubleshooting

### Common Issues

1. **Port đã được sử dụng**
   ```bash
   sudo netstat -tulpn | grep :5000
   sudo kill -9 <PID>
   ```

2. **Docker permission denied**
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

3. **Database connection failed**
   ```bash
   docker-compose logs postgres
   make db-shell
   ```

4. **Container không start**
   ```bash
   docker-compose down
   make clean
   make build
   ```

### Emergency Commands

```bash
# Emergency stop tất cả
make emergency-stop

# Emergency logs dump
make emergency-logs

# Clean và restart từ đầu
make clean && make prod-deploy
```

## 📈 Performance Optimization

### Docker Build Cache

- Multi-stage build được tối ưu cho cache
- Dependencies được cache riêng biệt
- Rhubarb và FFmpeg được pre-install và cache

### Nginx Configuration

- Gzip compression enabled
- Static file caching
- Rate limiting
- Load balancing ready

### Database

- Connection pooling
- Health checks
- Automated backup

## 🔒 Security

### Production Checklist

- [ ] Đổi tất cả default passwords
- [ ] Setup SSL certificates
- [ ] Configure firewall rules
- [ ] Enable security headers
- [ ] Setup monitoring & alerting
- [ ] Regular security updates

### SSL Setup (Optional)

```bash
# Tạo thư mục SSL
mkdir ssl

# Copy certificates
cp your-cert.pem ssl/cert.pem
cp your-key.key ssl/key.pem

# Uncomment SSL section trong nginx.conf
```

## 📞 Support

Nếu gặp vấn đề, hãy:

1. Kiểm tra logs: `make logs`
2. Xem GitHub Actions logs
3. Tạo issue tại repository
4. Attach logs và error messages

## 🔄 Update & Maintenance

### Update Code

```bash
git pull origin main
make prod-deploy
```

### Update Dependencies

```bash
# Python dependencies
cd emlinh_mng && pip freeze > requirements.txt

# Node.js dependencies
cd emlinh-remotion && npm update

# Rebuild containers
make build
```