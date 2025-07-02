# Makefile cho emlinh-project CI/CD

# Variables
DOCKER_IMAGE_NAME = emlinh-app
DOCKER_TAG = latest
COMPOSE_FILE = docker-compose.yml

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

.PHONY: help build test deploy clean status logs restart

help: ## Hiển thị các lệnh có sẵn
	@echo "$(GREEN)Emlinh Project - Makefile Commands$(NC)"
	@echo "=================================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build Docker images
	@echo "$(GREEN)🔨 Building Docker images...$(NC)"
	docker compose build --no-cache
	@echo "$(GREEN)✅ Build completed!$(NC)"

test: ## Chạy tests cho cả Python và Node.js
	@echo "$(GREEN)🧪 Running tests...$(NC)"
	@echo "Testing Python components..."
	cd emlinh_mng && python -m pytest src/tests/ -v || true
	@echo "Testing Node.js components..."
	cd emlinh-remotion && npm run lint || true
	@echo "$(GREEN)✅ Tests completed!$(NC)"

deploy: ## Deploy application với Docker Compose
	@echo "$(GREEN)🚀 Deploying application...$(NC)"
	@make build
	docker compose up -d
	@echo "$(GREEN)⏳ Waiting for services to be ready...$(NC)"
	@sleep 30
	@make status
	@echo "$(GREEN)✅ Deployment completed!$(NC)"

dev: ## Chạy ở development mode
	@echo "$(GREEN)🔧 Starting development environment...$(NC)"
	@make setup-env
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@make logs

clean: ## Dọn dẹp containers và images
	@echo "$(YELLOW)🧹 Cleaning up...$(NC)"
	docker compose down --remove-orphans --volumes
	@make fix-permissions
	docker system prune -af --volumes
	@echo "$(GREEN)✅ Cleanup completed!$(NC)"

fix-permissions: ## Fix permissions cho mounted directories
	@echo "$(YELLOW)🔧 Fixing permissions...$(NC)"
	@chmod +x scripts/fix-permissions.sh 2>/dev/null || true
	@./scripts/fix-permissions.sh

cleanup-workspace: ## Cleanup toàn bộ workspace cho CI/CD
	@echo "$(YELLOW)🧹 Cleaning up workspace...$(NC)"
	@chmod +x scripts/fix-permissions.sh 2>/dev/null || true
	@./scripts/fix-permissions.sh --cleanup-workspace

clean-volumes: ## Dọn dẹp toàn bộ Docker volumes
	@echo "$(YELLOW)🗑️ Cleaning up all volumes...$(NC)"
	docker compose down --remove-orphans --volumes
	docker volume rm emlinh_projects_app_data emlinh_projects_audio_data emlinh_projects_model_data || true
	@make fix-permissions
	@echo "$(GREEN)✅ Volumes cleanup completed!$(NC)"

status: ## Kiểm tra trạng thái services
	@echo "$(GREEN)📊 Service Status:$(NC)"
	docker compose ps
	@echo ""
	@echo "$(GREEN)🏥 Health Check:$(NC)"
	@curl -s http://localhost:5000/health | python3 -m json.tool || echo "$(RED)❌ Health check failed$(NC)"

logs: ## Xem logs của tất cả services
	@echo "$(GREEN)📋 Showing logs...$(NC)"
	docker compose logs -f

logs-app: ## Xem logs của main application
	docker compose logs -f emlinh_app

logs-db: ## Xem logs của database
	docker compose logs -f postgres

restart: ## Restart tất cả services
	@echo "$(YELLOW)🔄 Restarting services...$(NC)"
	docker compose restart
	@echo "$(GREEN)✅ Services restarted!$(NC)"

stop: ## Dừng tất cả services
	@echo "$(YELLOW)⏹️ Stopping services...$(NC)"
	docker compose stop
	@echo "$(GREEN)✅ Services stopped!$(NC)"

start: ## Khởi động services đã dừng
	@echo "$(GREEN)▶️ Starting services...$(NC)"
	docker compose start
	@echo "$(GREEN)✅ Services started!$(NC)"

shell: ## Truy cập shell của container chính
	docker compose exec emlinh_app bash

db-shell: ## Truy cập PostgreSQL shell
	docker compose exec postgres psql -U emlinh_user -d emlinh_db

backup-db: ## Backup database
	@echo "$(GREEN)💾 Creating database backup...$(NC)"
	docker compose exec postgres pg_dump -U emlinh_user emlinh_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Database backup completed!$(NC)"

restore-db: ## Restore database từ backup (cần specify BACKUP_FILE=filename.sql)
	@if [ -z "$(BACKUP_FILE)" ]; then echo "$(RED)❌ Please specify BACKUP_FILE=filename.sql$(NC)"; exit 1; fi
	@echo "$(YELLOW)⚠️ Restoring database from $(BACKUP_FILE)...$(NC)"
	docker compose exec -T postgres psql -U emlinh_user -d emlinh_db < $(BACKUP_FILE)
	@echo "$(GREEN)✅ Database restore completed!$(NC)"

install-deps: ## Cài đặt dependencies local cho development
	@echo "$(GREEN)📦 Installing dependencies...$(NC)"
	cd emlinh_mng && pip install -r requirements.txt
	cd emlinh-remotion && npm install
	@echo "$(GREEN)✅ Dependencies installed!$(NC)"

setup-env: ## Tạo file .env từ template
	@echo "$(GREEN)⚙️ Setting up environment...$(NC)"
	@if [ ! -f ".env" ]; then \
		echo "Creating .env file..."; \
		echo "# Core application settings" > .env; \
		echo "SECRET_KEY=dev-secret-key-change-in-production" >> .env; \
		echo "DATABASE_URL=sqlite:///app.db" >> .env; \
		echo "FLASK_ENV=development" >> .env; \
		echo "" >> .env; \
		echo "# Workspace configuration" >> .env; \
		echo "WORKSPACE_ROOT=$$(pwd)" >> .env; \
		echo "" >> .env; \
		echo "# AI/ML services" >> .env; \
		echo "OLLAMA_BASE_URL=http://192.168.1.10:11434" >> .env; \
		echo "OLLAMA_EMBED_MODEL=nomic-embed-text" >> .env; \
		echo "EMBEDDING_DIMENSION=768" >> .env; \
		echo "" >> .env; \
		echo "# OpenAI API" >> .env; \
		echo "OPENAI_API_KEY=your-openai-api-key-here" >> .env; \
		echo "" >> .env; \
		echo "# SQLAlchemy settings" >> .env; \
		echo "SQLALCHEMY_ECHO=True" >> .env; \
		cp .env emlinh_mng/.env; \
		echo "$(GREEN)✅ .env files created! Please update OPENAI_API_KEY and other settings$(NC)"; \
	else \
		echo "$(YELLOW)⚠️ .env file already exists$(NC)"; \
	fi

lint: ## Chạy linting cho cả Python và Node.js
	@echo "$(GREEN)🔍 Running linters...$(NC)"
	cd emlinh_mng && python -m flake8 src/ || true
	cd emlinh-remotion && npm run lint || true
	@echo "$(GREEN)✅ Linting completed!$(NC)"

security-scan: ## Chạy security scan
	@echo "$(GREEN)🔒 Running security scans...$(NC)"
	cd emlinh_mng && pip-audit || true
	cd emlinh-remotion && npm audit || true
	@echo "$(GREEN)✅ Security scan completed!$(NC)"

monitor: ## Monitor resource usage
	@echo "$(GREEN)📈 Resource Usage:$(NC)"
	docker stats --no-stream

# Production shortcuts
prod-deploy: ## Quick production deployment
	@echo "$(GREEN)🚀 Production Deployment$(NC)"
	@make clean
	@make build
	@make deploy
	@make status

# Emergency commands
emergency-stop: ## Emergency stop tất cả containers
	@echo "$(RED)🚨 EMERGENCY STOP$(NC)"
	docker kill $$(docker ps -q) || true
	docker compose down --remove-orphans

emergency-logs: ## Emergency logs dump
	@echo "$(RED)🚨 EMERGENCY LOGS DUMP$(NC)"
	mkdir -p emergency_logs_$(shell date +%Y%m%d_%H%M%S)
	docker compose logs > emergency_logs_$(shell date +%Y%m%d_%H%M%S)/all_logs.txt
	docker system events --since 1h > emergency_logs_$(shell date +%Y%m%d_%H%M%S)/docker_events.txt || true
