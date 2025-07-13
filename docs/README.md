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

## 🚀 Quick Start

### 1. Clone và Setup Environment
```bash
git clone <repository-url>
cd emlinh_projects

# Tự động tạo .env files
make setup-env

# Hoặc chạy development mode (sẽ tự tạo .env)
make dev
```

### 2. Manual Setup (alternative)

#### Emlinh Management System
```bash
cd emlinh_mng
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Tạo .env file (xem phần Cấu hình)
python src/app/run.py
```

#### Emlinh Remotion
```bash
cd emlinh-remotion
npm install
npm start
```

### 3. Docker Setup (Recommended)
```bash
# Development
make dev

# Production
make deploy
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
Tạo file `.env` trong thư mục root và `emlinh_mng`:

#### Tự động tạo .env:
```bash
make setup-env
```

#### Hoặc tạo thủ công:
```bash
# Core application settings
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///app.db
FLASK_ENV=development

# Workspace configuration
WORKSPACE_ROOT=/path/to/your/workspace

# AI/ML services
OLLAMA_BASE_URL=http://192.168.1.10:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
EMBEDDING_DIMENSION=768

# OpenAI API
OPENAI_API_KEY=your-openai-api-key-here

# SQLAlchemy settings
SQLALCHEMY_ECHO=True
```

### Docker Setup
```bash
# Development
make dev

# Production
make deploy

# Xem logs
make logs
```

## 🚀 CI/CD GitHub Actions

### Thiết lập GitHub Secrets
Cần thiết lập các secrets sau trong GitHub repository:

```
SECRET_KEY=your-production-secret-key
DATABASE_URL=your-production-database-url
OLLAMA_BASE_URL=http://your-ollama-server:11434
OPENAI_API_KEY=your-openai-api-key
OLLAMA_EMBED_MODEL=nomic-embed-text (optional)
EMBEDDING_DIMENSION=768 (optional)
SQLALCHEMY_ECHO=False (optional)
```

### Workflow
- **Push to main**: Tự động build, test và deploy
- **Pull Request**: Chạy tests và build check
- **Self-hosted runner**: Deploy trên server riêng

### Makefile Commands
```bash
make help           # Xem tất cả commands
make build          # Build Docker images
make test           # Chạy tests
make deploy         # Deploy production
make dev            # Chạy development mode
make clean          # Dọn dẹp containers
make status         # Kiểm tra trạng thái
make logs           # Xem logs
```

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

## 📄 License

Dự án được phát hành dưới MIT License. 