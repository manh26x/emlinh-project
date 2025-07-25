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
                    } else if (parsedResponse.type === 'redirect_video_creation') {
                        // Redirect đến video creation với realtime updates
                        this.handleVideoCreationRedirect(parsedResponse);
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
    
    async handleVideoCreationRedirect(responseData) {
        const { message, video_request } = responseData;
        
        // Hiển thị message đầu tiên
        this.uiManager.addAIMessage(message);
        
        // Bắt đầu video creation với realtime updates qua SSE
        try {
            // Thêm session_id vào video request
            const videoRequestWithSession = {
                ...video_request,
                session_id: this.sessionManager.getSessionId()
            };
            
            const response = await fetch('/api/chat/create-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(videoRequestWithSession)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ [ChatCore] Video creation initiated with job_id:', result.job_id);
                
                // Sử dụng VideoManager để handle SSE stream
                if (window.videoManager) {
                    console.log('📺 [ChatCore] Starting SSE stream via VideoManager');
                    window.videoManager.currentVideoJob = result.job_id;
                    window.videoManager.startProgressStream(result.job_id);
                    
                    // Hiển thị typing indicator với initial message
                    this.uiManager.showTypingIndicator('🎬 Đang tạo video... Vui lòng chờ trong giây lát');
                } else {
                    console.warn('⚠️ [ChatCore] VideoManager not available, using fallback');
                    this.uiManager.addAIMessage('🎬 Video đang được tạo, vui lòng chờ trong giây lát...');
                    
                    // Fallback: Check status periodically
                    this.startVideoStatusPolling(result.job_id);
                }
                
            } else {
                this.notificationManager.showError('❌ Lỗi khởi tạo tạo video: ' + result.message);
                this.uiManager.addAIMessage('❌ Có lỗi xảy ra khi tạo video: ' + result.message);
            }
            
        } catch (error) {
            console.error('❌ [ChatCore] Video creation error:', error);
            this.notificationManager.showError('❌ Lỗi kết nối khi tạo video');
            this.uiManager.addAIMessage('❌ Lỗi kết nối khi tạo video: ' + error.message);
        }
    }
    
    startVideoStatusPolling(jobId) {
        // Fallback polling method nếu SSE không hoạt động
        console.log('🔄 [ChatCore] Starting fallback status polling for job:', jobId);
        
        const pollInterval = 3000; // 3 seconds
        const maxAttempts = 120; // 6 minutes total
        let attempts = 0;
        
        const poll = async () => {
            try {
                attempts++;
                console.log(`🔄 [ChatCore] Polling attempt ${attempts}/${maxAttempts} for job:`, jobId);
                
                const response = await fetch(`/api/video-progress/${jobId}/status`);
                const data = await response.json();
                
                if (data.success) {
                    console.log('📊 [ChatCore] Job status:', data.status, 'Progress:', data.progress + '%');
                    
                    // Cập nhật progress message
                    this.uiManager.updateTypingIndicator(
                        `🎬 Đang tạo video... (${data.progress}%) - ${data.message}`,
                        data.progress
                    );
                    
                    // Kiểm tra nếu hoàn thành
                    if (data.is_completed) {
                        this.uiManager.hideTypingIndicator();
                        
                        if (data.status === 'completed') {
                            this.notificationManager.showSuccess('🎬 Video được tạo thành công!');
                            
                            let message = '🎉 **Video đã được tạo thành công!**';
                            if (data.video_id) {
                                message += `\n\n🆔 **Video ID:** ${data.video_id}`;
                                message += `\n📺 **Xem video:** [Tại đây](${data.video_url})`;
                            }
                            this.uiManager.addAIMessage(message);
                            
                        } else if (data.status === 'failed') {
                            this.notificationManager.showError('❌ Lỗi tạo video');
                            this.uiManager.addAIMessage('❌ **Lỗi tạo video:** ' + data.message);
                        }
                        
                        return; // Stop polling
                    }
                    
                    // Nếu chưa hoàn thành, tiếp tục polling
                    if (attempts < maxAttempts) {
                        setTimeout(poll, pollInterval);
                    } else {
                        console.warn('⏰ [ChatCore] Polling timeout for job:', jobId);
                        this.uiManager.hideTypingIndicator();
                        this.uiManager.addAIMessage('⏰ **Timeout:** Quá trình tạo video mất quá lâu. Vui lòng thử lại.');
                    }
                    
                } else {
                    console.error('❌ [ChatCore] Status check failed:', data.message);
                    if (attempts < maxAttempts) {
                        setTimeout(poll, pollInterval);
                    } else {
                        this.uiManager.hideTypingIndicator();
                        this.uiManager.addAIMessage('❌ **Lỗi:** Không thể kiểm tra trạng thái video. Vui lòng thử lại.');
                    }
                }
                
            } catch (error) {
                console.error('❌ [ChatCore] Polling error:', error);
                if (attempts < maxAttempts) {
                    setTimeout(poll, pollInterval);
                } else {
                    this.uiManager.hideTypingIndicator();
                    this.uiManager.addAIMessage('❌ **Lỗi kết nối:** Không thể kiểm tra trạng thái video.');
                }
            }
        };
        
        // Start polling
        poll();
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

// Export for test environment
if (typeof global !== 'undefined') {
    global.ChatCore = ChatCore;
} 