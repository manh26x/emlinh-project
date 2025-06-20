# Emlinh Management System

Hệ thống quản lý thông minh với Flask backend và CrewAI tích hợp.

## 🚀 Tính năng

- ✅ Flask web framework với PostgreSQL
- 🤖 CrewAI integration cho AI agents
- 🎨 Modern UI với Tailwind CSS
- 📱 Responsive design
- ⚡ Real-time notifications
- 🔄 Async API calls với loading states

## 📁 Cấu trúc dự án

```
emlinh_mng/
├── app.py                 # Flask app factory
├── config.py              # App configuration
├── crewai_service.py      # CrewAI services và agents
├── models.py              # Database models
├── routes.py              # API routes
├── run.py                 # Application entry point
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── static/               # Static assets
│   ├── css/
│   │   └── custom.css    # Custom styles và animations
│   ├── js/
│   │   └── app.js        # Frontend JavaScript utilities
│   └── img/              # Images
└── templates/            # Jinja2 templates
    ├── base.html         # Base template với common layout
    └── index.html        # Homepage
```

## 🛠️ Frontend Architecture

### Tailwind CSS
- **Framework**: Tailwind CSS CDN cho rapid prototyping
- **Icons**: Font Awesome 6.0
- **Fonts**: Inter font family từ Google Fonts
- **Components**: Custom components trong `custom.css`

### JavaScript Structure
- **Modular approach**: Organized trong namespaces (Utils, CrewAI)
- **API handling**: Centralized fetch wrapper với error handling
- **UI components**: Toast notifications, loading spinners
- **Event handling**: Form submissions, button clicks

### Template Organization
- **Base template**: `base.html` cho common layout
- **Block system**: Sử dụng Jinja2 blocks cho modularity
- **Component reuse**: Navigation, footer, scripts

## 🔧 Cài đặt

### 1. Clone và setup
```bash
git clone <repo-url>
cd emlinh_mng
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment setup
```bash
cp .env.example .env
# Chỉnh sửa .env với các giá trị thực tế
```

### 4. Database setup
```bash
# Tạo PostgreSQL database
# Cập nhật DATABASE_URL trong .env
```

### 5. Run application
```bash
python run.py
```

## 🤖 CrewAI Features

### Content Creation
- **Endpoint**: `POST /api/crewai/content`
- **Function**: Tạo nội dung từ chủ đề với Research + Writer agents
- **Usage**: Form trên homepage

### Data Analysis  
- **Endpoint**: `POST /api/crewai/analyze`
- **Function**: Phân tích dữ liệu với Data Analyst agent
- **Types**: General, Financial, Market, Technical

## 🎨 UI Components

### Toast Notifications
```javascript
Utils.showToast('Message', 'success'); // hoặc 'error'
```

### Loading States
```javascript
Utils.showLoading('element-id');
Utils.hideLoading('element-id', 'new-content');
```

### API Calls
```javascript
const result = await Utils.fetchAPI('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
});
```

## 📝 Environment Variables

```bash
# Flask
FLASK_ENV=development
SECRET_KEY=your-secret-key

# Database
DATABASE_URL=postgresql://user:pass@localhost/dbname

# AI Services
OPENAI_API_KEY=your-openai-key
CREWAI_TELEMETRY_OPT_OUT=true
```

## 🚀 Development Guidelines

### Frontend
- Sử dụng Tailwind utility classes
- Custom styles trong `custom.css` cho components tái sử dụng
- JavaScript modules trong `app.js`
- Responsive design mobile-first

### Backend
- RESTful API design
- Error handling với proper HTTP status codes
- Service pattern cho business logic
- Database models với SQLAlchemy

### Code Organization
- Separation of concerns
- Reusable components
- Clean code principles
- Documentation

## 📚 Tech Stack

- **Backend**: Flask, SQLAlchemy, PostgreSQL
- **AI**: CrewAI, OpenAI API
- **Frontend**: Tailwind CSS, Vanilla JavaScript
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Inter)

## 🔗 API Endpoints

- `GET /` - Homepage
- `GET /health` - Health check
- `POST /api/crewai/content` - Generate content
- `POST /api/crewai/analyze` - Analyze data

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.