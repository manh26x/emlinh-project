class ChatCore {
    constructor(sessionManager, uiManager, notificationManager) {
        this.sessionManager = sessionManager;
        this.uiManager = uiManager;
        this.notificationManager = notificationManager;
        this.isLoading = false;
        this.currentMessageType = 'conversation';
    }
    
    async sendMessage(message) {
        if (this.isLoading || !message.trim()) return;
        
        // Add user message to UI
        this.uiManager.addUserMessage(message);
        this.setLoading(true);
        
        try {
            this.uiManager.showTypingIndicator();
            
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: this.sessionManager.getSessionId(),
                    type: this.currentMessageType
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Kiểm tra xem AI response có phải là JSON không
                const aiResponse = data.ai_response;
                
                try {
                    // Thử parse JSON response
                    const parsedResponse = JSON.parse(aiResponse);
                    
                    if (parsedResponse.type === 'video_created') {
                        // Hiển thị video đã tạo
                        this.handleVideoCreatedResponse(parsedResponse);
                    } else if (parsedResponse.type === 'error') {
                        // Hiển thị lỗi
                        this.uiManager.addAIMessage(parsedResponse.message, data.timestamp);
                        this.notificationManager.showError(parsedResponse.message);
                    } else {
                        // JSON response khác
                        this.uiManager.addAIMessage(parsedResponse.message || JSON.stringify(parsedResponse), data.timestamp);
                    }
                } catch (jsonError) {
                    // Không phải JSON, hiển thị như text thường
                    this.uiManager.addAIMessage(aiResponse, data.timestamp);
                }
                
                if (data.idea_created) {
                    this.notificationManager.showNotification('💡 Đã tạo ý tưởng mới!', 'success');
                    // Trigger idea refresh event
                    window.dispatchEvent(new CustomEvent('ideasUpdated'));
                }
            } else {
                this.uiManager.showError('Lỗi: ' + (data.message || 'Không thể gửi tin nhắn'));
            }
            
        } catch (error) {
            console.error('Chat error:', error);
            this.uiManager.showError('Lỗi kết nối: ' + error.message);
        } finally {
            this.uiManager.hideTypingIndicator();
            this.setLoading(false);
            this.uiManager.scrollToBottom();
        }
    }
    
    handleVideoCreatedResponse(responseData) {
        const { message, video } = responseData;
        
        // Tạo HTML để hiển thị video
        const videoHtml = this.createVideoDisplayHTML(video);
        
        // Thêm message với video embed
        this.uiManager.addAIMessageWithVideo(message, videoHtml, video);
        
        // Hiển thị notification thành công
        this.notificationManager.showSuccess('🎬 Video đã được tạo thành công!');
        
        // Trigger video refresh event để cập nhật danh sách video
        window.dispatchEvent(new CustomEvent('videosUpdated'));
    }
    
    createVideoDisplayHTML(video) {
        return `
            <div class="video-embed-container mt-3">
                <div class="card border-primary">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">
                            <i class="fas fa-video me-2"></i>
                            Video đã tạo
                        </h6>
                        <div class="video-actions">
                            <button class="btn btn-sm btn-outline-light me-2" onclick="chatManager.downloadVideo(${video.id})" title="Tải xuống">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-light" onclick="chatManager.viewVideoDetail(${video.id})" title="Xem chi tiết">
                                <i class="fas fa-external-link-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body p-0">
                        <div class="video-player-container position-relative">
                            <video 
                                controls 
                                preload="metadata"
                                class="w-100"
                                style="max-height: 400px; background: #000;"
                                poster="/static/images/video-thumbnail.jpg"
                            >
                                <source src="/api/videos/${video.id}/file" type="video/mp4">
                                Trình duyệt của bạn không hỗ trợ video HTML5.
                            </video>
                            <div class="video-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style="background: rgba(0,0,0,0.1); pointer-events: none;">
                                <div class="spinner-border text-light d-none video-loading" role="status">
                                    <span class="visually-hidden">Đang tải...</span>
                                </div>
                            </div>
                        </div>
                        <div class="video-info p-3 bg-light">
                            <div class="row g-2">
                                <div class="col-md-6">
                                    <small class="text-muted">
                                        <i class="fas fa-clock me-1"></i>
                                        Thời lượng: <strong>${video.duration}s</strong>
                                    </small>
                                </div>
                                <div class="col-md-6">
                                    <small class="text-muted">
                                        <i class="fas fa-microphone me-1"></i>
                                        Giọng đọc: <strong>${video.voice}</strong>
                                    </small>
                                </div>
                                <div class="col-md-6">
                                    <small class="text-muted">
                                        <i class="fas fa-palette me-1"></i>
                                        Background: <strong>${video.background}</strong>
                                    </small>
                                </div>
                                <div class="col-md-6">
                                    <small class="text-muted">
                                        <i class="fas fa-desktop me-1"></i>
                                        Composition: <strong>${video.composition}</strong>
                                    </small>
                                </div>
                            </div>
                            ${video.script ? `
                                <div class="mt-2">
                                    <small class="text-muted">
                                        <i class="fas fa-scroll me-1"></i>
                                        <strong>Script:</strong>
                                    </small>
                                    <div class="script-preview mt-1 p-2 bg-white rounded border">
                                        <small class="text-dark">${this.truncateText(video.script, 200)}</small>
                                        ${video.script.length > 200 ? `
                                            <button class="btn btn-sm btn-link p-0 ms-1" onclick="this.parentElement.querySelector('.script-full').classList.toggle('d-none'); this.classList.toggle('d-none');">
                                                <small>Xem thêm</small>
                                            </button>
                                            <div class="script-full d-none">
                                                <small class="text-dark">${video.script}</small>
                                                <button class="btn btn-sm btn-link p-0 ms-1" onclick="this.parentElement.classList.add('d-none'); this.parentElement.parentElement.querySelector('button').classList.remove('d-none');">
                                                    <small>Thu gọn</small>
                                                </button>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.uiManager.setLoadingState(loading);
    }
    
    setMessageType(type) {
        this.currentMessageType = type;
        this.uiManager.updateChatTypeUI(type);
    }
    
    useQuickPrompt(prompt, type) {
        this.setMessageType(type);
        this.uiManager.setMessageInput(prompt);
        
        // Auto-send after a short delay
        setTimeout(() => {
            if (this.uiManager.getMessageInput() === prompt) {
                this.sendMessage(prompt);
            }
        }, 500);
    }
} 