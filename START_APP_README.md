# EmLinh Application Startup Scripts

## Scripts có sẵn:

### 1. `start_app.sh` - Script chính (Production-ready)
- Sử dụng Gunicorn với fallback Flask development server
- Tự động cài đặt dependencies
- Kiểm tra health endpoint
- **Khuyến nghị sử dụng**

```bash
./start_app.sh
```

### 2. `start_app_simple.sh` - Script đơn giản (Development)
- Chỉ sử dụng Flask development server
- Nhanh chóng và đơn giản
- **Sử dụng khi debug hoặc testing**

```bash
./start_app_simple.sh
```

### 3. `test_env.sh` - Test environment
- Kiểm tra virtual environment
- Test Flask installation
- **Chạy trước khi sử dụng các script khác**

```bash
./test_env.sh
```

### 4. `debug_virtual_env.sh` - Debug chi tiết
- Kiểm tra toàn bộ environment
- Hiển thị thông tin chi tiết
- **Sử dụng khi gặp lỗi**

```bash
./debug_virtual_env.sh
```

## Scripts quản lý:

### 5. `stop_app.sh` - Dừng ứng dụng
```bash
./stop_app.sh
```

### 6. `status_app.sh` - Kiểm tra trạng thái
```bash
./status_app.sh
```

## Khắc phục lỗi "ModuleNotFoundError: No module named 'flask'":

1. **Chạy debug trước:**
   ```bash
   ./debug_virtual_env.sh
   ```

2. **Thử script đơn giản:**
   ```bash
   ./start_app_simple.sh
   ```

3. **Nếu vẫn lỗi, chạy script chính:**
   ```bash
   ./start_app.sh
   ```

## Lưu ý:
- Tất cả scripts sẽ tự động tạo virtual environment nếu chưa có
- Dependencies sẽ được cài đặt tự động
- Ứng dụng sẽ chạy trên http://localhost:5000
- Kiểm tra logs tại `emlinh_mng/flask.log` 