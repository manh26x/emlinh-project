class ChatHistoryManager {
    constructor() {
        this.currentFilter = 'all';
        this.currentSessionId = null;
        this.currentSession = null;
        this.sessions = [];
        this.searchTimeout = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        // Sidebar elements
        this.sessionsList = document.getElementById('sessionsList');
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        
        // Filter buttons
        this.filterAll = document.getElementById('filterAll');
        this.filterFavorite = document.getElementById('filterFavorite');
        this.filterArchived = document.getElementById('filterArchived');
        
        // Main content elements
        this.chatHeader = document.getElementById('chatHeader');
        this.chatActions = document.getElementById('chatActions');
        this.chatMessagesContainer = document.getElementById('chatMessagesContainer');
        this.continueChat = document.getElementById('continueChat');
        
        // Action buttons
        this.editSessionBtn = document.getElementById('editSessionBtn');
        this.favoriteBtn = document.getElementById('favoriteBtn');
        this.archiveBtn = document.getElementById('archiveBtn');
        this.deleteSessionBtn = document.getElementById('deleteSessionBtn');
        this.continueChatBtn = document.getElementById('continueChatBtn');
        
        // Welcome screen buttons
        this.startNewChatBtn = document.getElementById('startNewChatBtn');
        this.viewAllSessionsBtn = document.getElementById('viewAllSessionsBtn');
        
        // Modal elements
        this.editSessionModal = new bootstrap.Modal(document.getElementById('editSessionModal'));
        this.deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        this.sessionTitle = document.getElementById('sessionTitle');
        this.sessionDescription = document.getElementById('sessionDescription');
        this.sessionTags = document.getElementById('sessionTags');
        this.saveSessionBtn = document.getElementById('saveSessionBtn');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    }
    
    setupEventListeners() {
        // Search functionality
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.searchBtn.addEventListener('click', () => this.handleSearch(this.searchInput.value));
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch(e.target.value);
            }
        });
        
        // Filter buttons
        this.filterAll.addEventListener('click', () => this.setFilter('all'));
        this.filterFavorite.addEventListener('click', () => this.setFilter('favorite'));
        this.filterArchived.addEventListener('click', () => this.setFilter('archived'));
        
        // Control buttons
        this.refreshBtn.addEventListener('click', () => this.loadSessions());
        this.newChatBtn.addEventListener('click', () => this.createNewChat());
        this.startNewChatBtn.addEventListener('click', () => this.createNewChat());
        this.viewAllSessionsBtn.addEventListener('click', () => this.loadSessions());
        
        // Session actions
        this.editSessionBtn.addEventListener('click', () => this.editCurrentSession());
        this.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        this.archiveBtn.addEventListener('click', () => this.toggleArchive());
        this.deleteSessionBtn.addEventListener('click', () => this.deleteCurrentSession());
        this.continueChatBtn.addEventListener('click', () => this.continueChatSession());
        
        // Modal actions
        this.saveSessionBtn.addEventListener('click', () => this.saveSessionChanges());
        this.confirmDeleteBtn.addEventListener('click', () => this.confirmDeleteSession());
    }
    
    async init() {
        await this.loadSessions();
    }
    
    async loadSessions() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/chat/sessions');
            const data = await response.json();
            
            if (data.success) {
                this.sessions = data.sessions;
                this.renderSessions();
            } else {
                this.showError('Không thể tải danh sách cuộc hội thoại');
            }
        } catch (error) {
            console.error('Error loading sessions:', error);
            this.showError('Lỗi khi tải dữ liệu');
        }
    }
    
    showLoading() {
        this.sessionsList.innerHTML = `
            <div class="p-3 text-center text-muted">
                <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
                <p>Đang tải lịch sử chat...</p>
            </div>
        `;
    }
    
    showError(message) {
        this.sessionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <h5>Có lỗi xảy ra</h5>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="chatHistoryManager.loadSessions()">
                    <i class="fas fa-sync-alt me-2"></i>Thử lại
                </button>
            </div>
        `;
    }
    
    renderSessions() {
        if (this.sessions.length === 0) {
            this.sessionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                                         <h5>Chưa có cuộc hội thoại nào</h5>
                     <p>Các cuộc hội thoại sẽ tự động xuất hiện ở đây khi bạn bắt đầu chat với AI</p>
                    <button class="btn btn-primary" onclick="chatHistoryManager.createNewChat()">
                        <i class="fas fa-plus me-2"></i>Bắt đầu chat mới
                    </button>
                </div>
            `;
            return;
        }
        
        const filteredSessions = this.filterSessions(this.sessions);
        
        if (filteredSessions.length === 0) {
            this.sessionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h5>Không tìm thấy kết quả</h5>
                    <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
            `;
            return;
        }
        
        const sessionsHtml = filteredSessions.map(session => this.renderSessionItem(session)).join('');
        this.sessionsList.innerHTML = sessionsHtml;
    }
    
    renderSessionItem(session) {
        const date = new Date(session.last_message_at);
        const timeAgo = this.formatTimeAgo(date);
        const badges = this.renderSessionBadges(session);
        
        // Lấy preview từ tin nhắn đầu tiên (sẽ được implement sau)
        const preview = session.description || 'Cuộc hội thoại với AI...';
        
        return `
            <div class="session-item p-3 border-bottom ${session.session_id === this.currentSessionId ? 'active' : ''}"
                 onclick="chatHistoryManager.selectSession('${session.session_id}')">
                <div class="session-title">${session.title || 'Cuộc hội thoại mới'}</div>
                <div class="session-preview">${this.truncateText(preview, 60)}</div>
                <div class="session-meta">
                    <span>
                        <i class="fas fa-comment-dots me-1"></i>
                        ${session.message_count} tin nhắn
                    </span>
                    <span>${timeAgo}</span>
                </div>
                ${badges}
                <div class="session-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); chatHistoryManager.quickEdit('${session.session_id}')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); chatHistoryManager.quickDelete('${session.session_id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    renderSessionBadges(session) {
        const badges = [];
        
        if (session.is_favorite) {
            badges.push('<span class="session-badge favorite"><i class="fas fa-star"></i></span>');
        }
        
        if (session.is_archived) {
            badges.push('<span class="session-badge archived"><i class="fas fa-archive"></i></span>');
        }
        
        if (session.tags && session.tags.length > 0) {
            session.tags.forEach(tag => {
                badges.push(`<span class="session-badge">${tag}</span>`);
            });
        }
        
        return badges.length > 0 ? `<div class="session-badges">${badges.join('')}</div>` : '';
    }
    
    filterSessions(sessions) {
        let filtered = sessions;
        
        // Apply filter
        switch (this.currentFilter) {
            case 'favorite':
                filtered = filtered.filter(s => s.is_favorite);
                break;
            case 'archived':
                filtered = filtered.filter(s => s.is_archived);
                break;
            default:
                filtered = filtered.filter(s => !s.is_archived);
                break;
        }
        
        // Apply search if there's a search term
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(s => 
                (s.title && s.title.toLowerCase().includes(searchTerm)) ||
                (s.description && s.description.toLowerCase().includes(searchTerm))
            );
        }
        
        return filtered;
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update filter buttons
        document.querySelectorAll('.btn-outline-primary, .btn-outline-warning, .btn-outline-secondary').forEach(btn => {
            btn.classList.remove('active');
        });
        
        switch (filter) {
            case 'favorite':
                this.filterFavorite.classList.add('active');
                break;
            case 'archived':
                this.filterArchived.classList.add('active');
                break;
            default:
                this.filterAll.classList.add('active');
                break;
        }
        
        this.renderSessions();
    }
    
    async handleSearch(query) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.renderSessions();
        }, 300);
    }
    
    async selectSession(sessionId) {
        this.currentSessionId = sessionId;
        this.currentSession = this.sessions.find(s => s.session_id === sessionId);
        
        // Update active state in sidebar
        document.querySelectorAll('.session-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[onclick*="${sessionId}"]`).classList.add('active');
        
        // Load and display chat messages
        await this.loadChatMessages(sessionId);
        
        // Update header and show actions
        this.updateChatHeader();
        this.showChatActions();
    }
    
    async loadChatMessages(sessionId) {
        try {
            const response = await fetch(`/api/chat/history/${sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderChatMessages(data.history);
            } else {
                this.showChatError('Không thể tải tin nhắn');
            }
        } catch (error) {
            console.error('Error loading chat messages:', error);
            this.showChatError('Lỗi khi tải tin nhắn');
        }
    }
    
    renderChatMessages(messages) {
        if (messages.length === 0) {
            this.chatMessagesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h5>Chưa có tin nhắn nào</h5>
                    <p>Cuộc hội thoại này chưa có tin nhắn</p>
                </div>
            `;
            return;
        }
        
        const messagesHtml = messages.map(msg => this.renderChatMessage(msg)).join('');
        this.chatMessagesContainer.innerHTML = `<div class="p-3">${messagesHtml}</div>`;
        
        // Scroll to bottom
        this.chatMessagesContainer.scrollTop = this.chatMessagesContainer.scrollHeight;
        
        // Show continue chat button
        this.continueChat.style.display = 'block';
    }
    
    renderChatMessage(message) {
        const date = new Date(message.timestamp);
        const timeStr = date.toLocaleTimeString('vi-VN');
        
        return `
            <div class="chat-message user d-flex justify-content-end mb-3">
                <div>
                    <div class="message-bubble user">
                        ${this.escapeHtml(message.user_message)}
                    </div>
                    <div class="message-time text-end">${timeStr}</div>
                </div>
            </div>
            <div class="chat-message ai d-flex justify-content-start mb-3">
                <div class="me-2">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                        🤖
                    </div>
                </div>
                <div>
                    <div class="message-bubble ai">
                        ${this.formatAIMessage(message.ai_response)}
                    </div>
                    <div class="message-time">${timeStr}</div>
                </div>
            </div>
        `;
    }
    
    formatAIMessage(message) {
        // Basic formatting for AI messages
        return message.replace(/\n/g, '<br>');
    }
    
    showChatError(message) {
        this.chatMessagesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle text-danger"></i>
                <h5>Có lỗi xảy ra</h5>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="chatHistoryManager.loadChatMessages('${this.currentSessionId}')">
                    <i class="fas fa-sync-alt me-2"></i>Thử lại
                </button>
            </div>
        `;
    }
    
    updateChatHeader() {
        if (this.currentSession) {
            this.chatHeader.innerHTML = `
                <div>
                    <h6 class="mb-0">${this.currentSession.title || 'Cuộc hội thoại mới'}</h6>
                    <small class="text-muted">
                        ${this.currentSession.message_count} tin nhắn • 
                        ${this.formatTimeAgo(new Date(this.currentSession.last_message_at))}
                    </small>
                </div>
            `;
        }
    }
    
    showChatActions() {
        this.chatActions.style.display = 'flex';
        
        // Update button states
        if (this.currentSession) {
            this.favoriteBtn.innerHTML = this.currentSession.is_favorite 
                ? '<i class="fas fa-star text-warning"></i>' 
                : '<i class="far fa-star"></i>';
            
            this.archiveBtn.innerHTML = this.currentSession.is_archived 
                ? '<i class="fas fa-inbox"></i>' 
                : '<i class="fas fa-archive"></i>';
        }
    }
    
    createNewChat() {
        window.location.href = '/chat';
    }
    
    continueChatSession() {
        if (this.currentSessionId) {
            window.location.href = `/chat?session_id=${this.currentSessionId}`;
        }
    }
    
    editCurrentSession() {
        if (!this.currentSession) return;
        
        this.sessionTitle.value = this.currentSession.title || '';
        this.sessionDescription.value = this.currentSession.description || '';
        this.sessionTags.value = this.currentSession.tags ? this.currentSession.tags.join(', ') : '';
        
        this.editSessionModal.show();
    }
    
    async saveSessionChanges() {
        if (!this.currentSessionId) return;
        
        try {
            const response = await fetch(`/api/chat/sessions/${this.currentSessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: this.sessionTitle.value.trim(),
                    description: this.sessionDescription.value.trim(),
                    tags: this.sessionTags.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.editSessionModal.hide();
                await this.loadSessions();
                this.showNotification('Đã cập nhật thành công', 'success');
            } else {
                this.showNotification('Lỗi khi cập nhật: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error saving session:', error);
            this.showNotification('Lỗi khi cập nhật', 'error');
        }
    }
    
    async toggleFavorite() {
        if (!this.currentSession) return;
        
        try {
            const response = await fetch(`/api/chat/sessions/${this.currentSessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_favorite: !this.currentSession.is_favorite
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentSession.is_favorite = !this.currentSession.is_favorite;
                this.showChatActions();
                await this.loadSessions();
                this.showNotification('Đã cập nhật thành công', 'success');
            } else {
                this.showNotification('Lỗi khi cập nhật: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            this.showNotification('Lỗi khi cập nhật', 'error');
        }
    }
    
    async toggleArchive() {
        if (!this.currentSession) return;
        
        try {
            const response = await fetch(`/api/chat/sessions/${this.currentSessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    is_archived: !this.currentSession.is_archived
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentSession.is_archived = !this.currentSession.is_archived;
                this.showChatActions();
                await this.loadSessions();
                this.showNotification('Đã cập nhật thành công', 'success');
            } else {
                this.showNotification('Lỗi khi cập nhật: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error toggling archive:', error);
            this.showNotification('Lỗi khi cập nhật', 'error');
        }
    }
    
    deleteCurrentSession() {
        if (!this.currentSession) return;
        this.deleteConfirmModal.show();
    }
    
    async confirmDeleteSession() {
        if (!this.currentSessionId) return;
        
        try {
            const response = await fetch(`/api/chat/sessions/${this.currentSessionId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.deleteConfirmModal.hide();
                await this.loadSessions();
                this.clearChatDisplay();
                this.showNotification('Đã xóa cuộc hội thoại', 'success');
            } else {
                this.showNotification('Lỗi khi xóa: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            this.showNotification('Lỗi khi xóa', 'error');
        }
    }
    
    clearChatDisplay() {
        this.currentSessionId = null;
        this.currentSession = null;
        this.chatActions.style.display = 'none';
        this.continueChat.style.display = 'none';
        this.chatHeader.innerHTML = `
            <h6 class="mb-0 text-muted">
                <i class="fas fa-comments me-2"></i>
                Chọn một cuộc hội thoại để xem chi tiết
            </h6>
        `;
        this.chatMessagesContainer.innerHTML = `
            <div class="p-4 text-center h-100 d-flex flex-column justify-content-center">
                <div class="mb-4">
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 80px; height: 80px; background: linear-gradient(45deg, #6366f1, #8b5cf6);">
                        <i class="fas fa-comments text-white" style="font-size: 2rem;"></i>
                    </div>
                    <h4 class="text-muted mb-3">Chào mừng đến với Lịch sử Chat</h4>
                    <p class="text-muted mb-4">Tất cả cuộc hội thoại được tự động lưu. Chọn một cuộc hội thoại từ danh sách bên trái để xem chi tiết và tiếp tục trò chuyện.</p>
                    <div class="d-flex gap-2 justify-content-center">
                        <button class="btn btn-primary" onclick="chatHistoryManager.createNewChat()">
                            <i class="fas fa-plus me-2"></i>Bắt đầu chat mới
                        </button>
                        <button class="btn btn-outline-secondary" onclick="chatHistoryManager.loadSessions()">
                            <i class="fas fa-list me-2"></i>Xem tất cả
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Quick actions from session list
    quickEdit(sessionId) {
        this.currentSessionId = sessionId;
        this.currentSession = this.sessions.find(s => s.session_id === sessionId);
        this.editCurrentSession();
    }
    
    quickDelete(sessionId) {
        this.currentSessionId = sessionId;
        this.currentSession = this.sessions.find(s => s.session_id === sessionId);
        this.deleteCurrentSession();
    }
    
    // Utility functions
    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} ngày trước`;
        if (hours > 0) return `${hours} giờ trước`;
        if (minutes > 0) return `${minutes} phút trước`;
        return 'Vừa xong';
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Make it globally available
window.chatHistoryManager = null; 