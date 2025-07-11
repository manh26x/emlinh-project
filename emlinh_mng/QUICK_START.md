# Emlinh AI Assistant - Quick Start Guide

## 🚀 Khởi động nhanh

### Windows
```bash
# Cách 1: Sử dụng script batch
start_app_simple.bat

# Cách 2: Thủ công
.venv\Scripts\activate
python -m src.app.run
```

### Linux/Mac
```bash
# Cách 1: Sử dụng script shell
./start_app_simple.sh

# Cách 2: Thủ công
source .venv/bin/activate
python -m src.app.run
```

## 🌐 Truy cập ứng dụng

Sau khi khởi động thành công, truy cập:
- **Giao diện web**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 📋 Kiểm tra trạng thái

### Kiểm tra ứng dụng đang chạy
```bash
# Windows
netstat -an | findstr :5000

# Linux/Mac
netstat -an | grep :5000
```

### Kiểm tra database
```bash
curl http://localhost:5000/health
```

## 🧪 Chạy tests

```bash
# Frontend tests
npm test

# Python tests (nếu có)
python -m pytest
```

## 🔧 Cài đặt dependencies (nếu cần)

### Python dependencies
```bash
source .venv/Scripts/activate  # Windows
source .venv/bin/activate      # Linux/Mac
pip install -r requirements.txt
```

### Node.js dependencies
```bash
npm install
```

## 📁 Cấu trúc dự án

```
emlinh_mng/
├── src/app/           # Flask application
├── static/            # Static files (CSS, JS)
├── templates/         # HTML templates
├── tests/             # Test files
├── requirements.txt   # Python dependencies
├── package.json       # Node.js dependencies
└── wsgi.py           # WSGI entry point
```

## 🛠️ Troubleshooting

### Lỗi "No module named 'flask'"
- Đảm bảo virtual environment đã được kích hoạt
- Chạy: `pip install -r requirements.txt`

### Lỗi port 5000 đã được sử dụng
- Tìm và dừng process đang sử dụng port 5000
- Hoặc thay đổi port trong file `src/app/run.py`

### Lỗi database
- Chạy: `python create_tables.py` để tạo database

## 📞 Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Virtual environment đã được kích hoạt
2. Tất cả dependencies đã được cài đặt
3. Database đã được tạo
4. Port 5000 không bị chiếm dụng 