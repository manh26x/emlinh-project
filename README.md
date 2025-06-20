# Emlinh Projects

Dự án tích hợp gồm hai thành phần chính:

## 🎥 Emlinh Remotion Video Creator
Công cụ tạo video tự động với AI Avatar và lip-sync, sử dụng Remotion framework.

**Tính năng:**
- Tạo video với AI Avatar 3D
- Lip-sync tự động với audio
- Hiệu ứng nền đa dạng
- Render video chất lượng cao

**Công nghệ:**
- Remotion (React-based video framework)
- Three.js cho 3D rendering
- TypeScript/JavaScript

## 💬 Emlinh Management System
Hệ thống quản lý AI chat với tích hợp CrewAI và vector search.

**Tính năng:**
- Chat với AI đa chế độ (conversation, planning, brainstorm)
- Tích hợp CrewAI cho multi-agent workflow
- Vector embeddings để tìm kiếm nội dung tương tự
- Quản lý ý tưởng và video production
- Web interface hiện đại

**Công nghệ:**
- Flask (Python web framework)
- SQLAlchemy (Database ORM)
- CrewAI (Multi-agent AI framework)
- Embedding service cho vector search
- HTML/CSS/JavaScript frontend

## 🚀 Cài đặt và Chạy

### Emlinh Management System
```bash
cd emlinh_mng
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc venv\Scripts\activate  # Windows
pip install -r requirements.txt
python src/app/run.py
```

### Emlinh Remotion
```bash
cd emlinh-remotion
npm install
npm start
```

## 📁 Cấu trúc Dự án

```
emlinh_projects/
├── emlinh_mng/          # Flask management system
│   ├── src/
│   │   ├── app/         # Flask application
│   │   ├── services/    # Business logic services
│   │   └── tests/       # Unit tests
│   ├── static/          # CSS, JS, assets
│   ├── templates/       # HTML templates
│   └── sql/             # Database migrations
├── emlinh-remotion/     # Remotion video creator
│   ├── src/             # React components
│   ├── public/          # Static assets
│   └── tests/           # Tests
└── README.md           # This file
```

## 🔧 Cấu hình

### Environment Variables
Tạo file `.env` trong thư mục `emlinh_mng`:
```
OPENAI_API_KEY=your_openai_key
DATABASE_URL=sqlite:///instance/app.db
SECRET_KEY=your_secret_key
```

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📄 License

Dự án được phát hành dưới MIT License. 