class UIManager {
    constructor() {
        this.initializeElements();
    }
    
    initializeElements() {
        this.chatForm = document.getElementById('chatForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.typingIndicator = document.getElementById('typingIndicator');
    }
    
    addUserMessage(message) {
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        const messageHtml = `
            <div class="message user-message mb-3">
                <div class="d-flex justify-content-end">
                    <div class="message-content">
                        <div class="bg-primary text-white rounded p-3">
                            ${this.escapeHtml(message)}
                        </div>
                        <small class="text-muted d-block text-end">${timestamp}</small>
                    </div>
                    <div class="avatar bg-secondary text-white rounded-circle ms-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                        👤
                    </div>
                </div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        this.scrollToBottom();
    }
    
    addAIMessage(message, timestamp) {
        const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('vi-VN') : new Date().toLocaleTimeString('vi-VN');
        const messageHtml = `
            <div class="message ai-message mb-3">
                <div class="d-flex">
                    <div class="avatar bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                        🤖
                    </div>
                    <div class="message-content">
                        <div class="bg-light rounded p-3">
                            ${this.formatMessage(message)}
                        </div>
                        <small class="text-muted">${timeStr}</small>
                    </div>
                </div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
    }
    
    formatMessage(message) {
        // Convert line breaks and format basic markdown
        let formatted = this.escapeHtml(message)
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Look for various video ID patterns and embed video player
        let videoIdMatch = null;
        let videoId = null;
        let videoTitle = 'Video AI';
        
        // Pattern 1: 🆔 Video ID: number
        videoIdMatch = formatted.match(/🆔 <strong>Video ID:<\/strong> (\d+)/);
        if (!videoIdMatch) {
            // Pattern 2: /videos/number URL
            videoIdMatch = formatted.match(/\/videos\/(\d+)/);
        }
        if (!videoIdMatch) {
            // Pattern 3: Video ID number (simple)
            videoIdMatch = formatted.match(/Video ID[:\s]+(\d+)/i);
        }
        if (!videoIdMatch) {
            // Pattern 4: Look for "tại đây: /videos/number"
            videoIdMatch = formatted.match(/tại đây:\s*\/videos\/(\d+)/);
        }
        
        if (videoIdMatch) {
            videoId = videoIdMatch[1];
            
            // Extract video title and topic from message
            const titleMatch = formatted.match(/<strong>Chủ đề:<\/strong> ([^<]+)/) ||
                             formatted.match(/chủ đề ([^!]+)/i) ||
                             formatted.match(/về ([^!]+)/i);
            if (titleMatch) {
                videoTitle = titleMatch[1].trim();
            }
            
            // Add video player embed
            formatted += `<br><br><div class="video-embed-container mt-3">
                <div class="video-player-wrapper bg-light rounded p-3">
                    <h6 class="mb-3">🎬 ${this.escapeHtml(videoTitle)}</h6>
                    <video controls class="embedded-video w-100" style="max-height: 400px; border-radius: 8px;" preload="metadata">
                        <source src="/api/videos/${videoId}/file" type="video/mp4">
                        <source src="/videos/${videoId}" type="video/mp4">
                        Trình duyệt của bạn không hỗ trợ video HTML5.
                    </video>
                    <div class="video-controls mt-3 d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="window.chatManager?.downloadVideo(${videoId}) || alert('Tính năng chưa sẵn sàng')">
                            <i class="fas fa-download"></i> Tải về
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.chatManager?.viewVideoDetail(${videoId}) || window.open('/videos/${videoId}', '_blank')">
                            <i class="fas fa-info-circle"></i> Chi tiết
                        </button>
                        <a href="/videos" class="btn btn-sm btn-outline-success">
                            <i class="fas fa-film"></i> Video Library
                        </a>
                    </div>
                </div>
            </div>`;
        }
        
        return formatted;
    }
    
    showError(message) {
        this.addAIMessage(`❌ ${message}`, null);
    }
    
    clearChat() {
        this.chatMessages.innerHTML = '';
    }
    
    addWelcomeMessage() {
        const welcomeMessage = `
            <div class="message ai-message mb-3">
                <div class="d-flex">
                    <div class="avatar bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                        🤖
                    </div>
                    <div class="message-content">
                        <div class="bg-light rounded p-3">
                            Xin chào! Tôi là AI Assistant của bạn. Tôi có thể giúp bạn:
                            <ul class="mb-0 mt-2">
                                <li><strong>Trò chuyện</strong>: Thảo luận ý tưởng và nhận tư vấn</li>
                                <li><strong>Brainstorm</strong>: Tạo ra nhiều ý tưởng sáng tạo</li>
                                <li><strong>Lập kế hoạch</strong>: Xây dựng kế hoạch chi tiết cho content</li>
                            </ul>
                        </div>
                        <small class="text-muted">Vừa xong</small>
                    </div>
                </div>
            </div>
        `;
        this.chatMessages.innerHTML = welcomeMessage;
    }
    
    showTypingIndicator() {
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        this.typingIndicator.style.display = 'none';
    }
    
    setLoadingState(loading) {
        this.sendButton.disabled = loading;
        this.messageInput.disabled = loading;
        
        if (loading) {
            this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }
    
    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }
    
    updateChatTypeUI(messageType) {
        const typeLabels = {
            'conversation': { icon: '💬', color: 'primary' },
            'brainstorm': { icon: '💡', color: 'success' },
            'planning': { icon: '📋', color: 'warning' }
        };
        
        const currentType = typeLabels[messageType];
        this.messageInput.placeholder = `${currentType.icon} Nhập tin nhắn ${messageType}...`;
    }
    
    setMessageInput(value) {
        this.messageInput.value = value;
        this.messageInput.focus();
    }
    
    getMessageInput() {
        return this.messageInput.value.trim();
    }
    
    clearMessageInput() {
        this.messageInput.value = '';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
} 