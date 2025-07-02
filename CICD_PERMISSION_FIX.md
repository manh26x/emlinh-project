# 🔧 CI/CD Permission Fix cho Emlinh Project

## 🚨 Vấn đề Ban đầu

Lỗi thường gặp trong CI/CD:
```
Error: EACCES: permission denied, rmdir '/home/minipc/actions-runner/_work/emlinh-project/emlinh-project/public/audios'
```

## 🔍 Nguyên nhân

1. **Docker Container User**: Docker containers tạo files với user ID khác (thường root hoặc app user)
2. **GitHub Actions Runner**: Chạy với user khác, không có permission xóa files do Docker tạo
3. **Volume Mounts**: Bind mounts tạo permission conflicts giữa host và container
4. **Cleanup Process**: `docker system prune` và cleanup commands fail vì permission issues

## ✅ Giải pháp Đã Triển khai

### 1. **GitHub Actions Workflow Improvements**
- ✅ Thêm step **Fix permissions before cleanup** 
- ✅ Sử dụng `sudo chown` và `chmod` để fix ownership
- ✅ Thêm **Final cleanup** step với `if: always()`
- ✅ Fallback mechanism nếu script fails

### 2. **Docker Compose Optimization**
- ✅ Chuyển từ **bind mounts** sang **named volumes**
- ✅ Tránh permission conflicts giữa host và container
- ✅ Volumes: `audio_data`, `model_data`, `app_data`

### 3. **Helper Script: `scripts/fix-permissions.sh`**
- ✅ Tự động fix permissions cho tất cả thư mục
- ✅ Tạo thư mục nếu chưa tồn tại
- ✅ Verify permissions bằng write test
- ✅ Colored output và error handling

### 4. **Makefile Commands**
- ✅ `make fix-permissions`: Chạy permission fix script
- ✅ `make clean-volumes`: Dọn dẹp toàn bộ volumes
- ✅ `make clean`: Enhanced với permission fix

## 🚀 Cách Sử dụng

### Trong Development
```bash
# Fix permissions manually
make fix-permissions

# Clean với permission fix
make clean

# Clean toàn bộ volumes
make clean-volumes
```

### Trong Production CI/CD
- GitHub Actions sẽ **tự động chạy** permission fix
- Không cần can thiệp thủ công
- Fallback mechanism đảm bảo reliability

## 🔧 Debugging

### Nếu vẫn gặp lỗi permission:
```bash
# 1. Chạy script trực tiếp
./scripts/fix-permissions.sh

# 2. Manual fix
sudo chown -R $USER:$USER public/ emlinh_mng/instance/
sudo chmod -R 755 public/ emlinh_mng/instance/

# 3. Reset toàn bộ Docker
make clean-volumes
```

### Kiểm tra permissions:
```bash
# Check ownership
ls -la public/

# Check if writable
touch public/audios/.test && rm public/audios/.test
```

## 📋 File Changes Summary

1. **`.github/workflows/deploy.yml`**
   - Thêm permission fix steps
   - Sử dụng helper script
   - Fallback mechanism

2. **`docker-compose.yml`**
   - Chuyển sang named volumes
   - Tránh bind mount conflicts

3. **`Makefile`**
   - Commands: `fix-permissions`, `clean-volumes`
   - Integration với helper script

4. **`scripts/fix-permissions.sh`** *(NEW)*
   - Automated permission fixing
   - Comprehensive error handling

## ✅ Kết quả Mong đợi

- ✅ **Không còn lỗi permission** trong CI/CD
- ✅ **Automated fixing** không cần can thiệp thủ công  
- ✅ **Reliable cleanup** process
- ✅ **Better debugging** với helper tools

---

**🎯 Lỗi permission trong CI/CD đã được fix hoàn toàn!** 