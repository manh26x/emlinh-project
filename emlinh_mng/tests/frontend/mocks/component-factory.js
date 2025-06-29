/**
 * Centralized Mock Component Factory
 * Provides consistent, working mocks for all application components
 */

class MockComponentFactory {
    static createSessionManager() {
        return {
            getSessionId: jest.fn(() => 'test-session-123'),
            generateSessionId: jest.fn(() => {
                const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                return id;
            })
        };
    }
    
    static createUIManager() {
        return {
            // Core properties
            chatForm: document.getElementById('chatForm'),
            messageInput: document.getElementById('messageInput'),
            sendButton: document.getElementById('sendButton'),
            chatMessages: document.getElementById('chatMessages'),
            messagesContainer: document.getElementById('messagesContainer'),
            typingIndicator: document.getElementById('typingIndicator'),
            
            // Message methods
            addUserMessage: jest.fn((message) => {
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'user-message bg-primary text-white p-2 mb-2 rounded';
                    messageDiv.innerHTML = `<i class="fas fa-user me-2"></i>👤 ${message}`;
                    chatMessages.appendChild(messageDiv);
                }
            }),
            
            addAIMessage: jest.fn((message, timestamp) => {
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'ai-message bg-light p-2 mb-2 rounded';
                    messageDiv.innerHTML = `<i class="fas fa-robot me-2"></i>🤖 ${message}`;
                    chatMessages.appendChild(messageDiv);
                }
            }),
            
            addAIMessageWithVideo: jest.fn((message, videoHtml, videoData) => {
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'ai-message bg-light p-2 mb-2 rounded';
                    messageDiv.innerHTML = `<i class="fas fa-robot me-2"></i>🤖 ${message}${videoHtml}`;
                    chatMessages.appendChild(messageDiv);
                }
            }),
            
            // Formatting
            formatMessage: jest.fn((message) => {
                return message
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`(.*?)`/g, '<code>$1</code>')
                    .replace(/🆔 Video ID: (\d+)/g, '<div class="video-embed-container embedded-video" data-video-id="$1">Video Embedded</div>')
                    .replace(/\/videos\/(\d+)/g, '<div class="video-embed-container embedded-video" data-video-id="$1">Video Embedded</div>');
            }),
            
            // Error handling
            showError: jest.fn((message) => {
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'ai-message bg-light p-2 mb-2 rounded text-danger';
                    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>❌ ${message}`;
                    chatMessages.appendChild(errorDiv);
                }
            }),
            
            // Chat management
            clearChat: jest.fn(() => {
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                }
            }),
            
            addWelcomeMessage: jest.fn(() => {
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    const welcomeDiv = document.createElement('div');
                    welcomeDiv.className = 'ai-message bg-light p-2 mb-2 rounded';
                    welcomeDiv.innerHTML = `
                        <i class="fas fa-robot me-2"></i>🤖 Xin chào! Tôi là AI Assistant
                        <div class="mt-2">
                            <small>
                                <strong>Tính năng:</strong><br>
                                💬 Trò chuyện<br>
                                💡 Brainstorm<br>
                                📋 Lập kế hoạch
                            </small>
                        </div>
                    `;
                    chatMessages.appendChild(welcomeDiv);
                }
            }),
            
            // Typing indicator
            showTypingIndicator: jest.fn((message, progress) => {
                const indicator = document.getElementById('typingIndicator');
                if (indicator) {
                    indicator.style.display = 'block';
                    if (message) {
                        indicator.innerHTML = `
                            <div class="typing-indicator p-2">
                                <i class="fas fa-circle-notch fa-spin me-2"></i>
                                ${message}${progress ? ` ${progress}%` : ''}
                            </div>
                        `;
                    } else {
                        indicator.innerHTML = `
                            <div class="typing-indicator p-2">
                                <i class="fas fa-circle-notch fa-spin me-2"></i>
                                AI đang soạn tin nhắn...
                            </div>
                        `;
                    }
                }
            }),
            
            hideTypingIndicator: jest.fn(() => {
                const indicator = document.getElementById('typingIndicator');
                if (indicator) {
                    indicator.style.display = 'none';
                    indicator.innerHTML = '';
                }
            }),
            
            updateTypingIndicator: jest.fn((message, progress) => {
                const indicator = document.getElementById('typingIndicator');
                if (indicator && indicator.style.display !== 'none') {
                    indicator.innerHTML = `
                        <div class="typing-indicator p-2">
                            <i class="fas fa-circle-notch fa-spin me-2"></i>
                            ${message.replace(/\n/g, '<br>')}${progress ? ` ${progress}%` : ''}
                        </div>
                    `;
                }
            }),
            
            // Loading state
            setLoadingState: jest.fn((loading) => {
                const sendButton = document.getElementById('sendButton');
                const messageInput = document.getElementById('messageInput');
                
                if (sendButton) {
                    sendButton.disabled = loading;
                    sendButton.innerHTML = loading 
                        ? '<i class="fas fa-spinner fa-spin"></i> Đang gửi...'
                        : '<i class="fas fa-paper-plane"></i> Gửi';
                }
                
                if (messageInput) {
                    messageInput.disabled = loading;
                }
            }),
            
            // Chat type UI
            updateChatTypeUI: jest.fn((type) => {
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    const placeholders = {
                        conversation: '💬 Nhập tin nhắn conversation...',
                        brainstorm: '💡 Nhập ý tưởng brainstorm...',
                        planning: '📋 Nhập kế hoạch planning...'
                    };
                    messageInput.placeholder = placeholders[type] || placeholders.conversation;
                }
            }),
            
            // Input management
            setMessageInput: jest.fn((value) => {
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.value = value;
                    messageInput.focus();
                }
            }),
            
            getMessageInput: jest.fn(() => {
                const messageInput = document.getElementById('messageInput');
                return messageInput ? messageInput.value.trim() : '';
            }),
            
            clearMessageInput: jest.fn(() => {
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.value = '';
                }
            }),
            
            // Scroll management  
            scrollToBottom: jest.fn(() => {
                const container = document.getElementById('messagesContainer');
                if (container) {
                    setTimeout(() => {
                        container.scrollTop = container.scrollHeight;
                    }, 100);
                }
            }),
            
            // HTML escaping
            escapeHtml: jest.fn((unsafe) => {
                if (unsafe === null) return 'null';
                if (unsafe === undefined) return 'undefined';
                return String(unsafe)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            })
        };
    }
    
    static createNotificationManager() {
        return {
            toastContainer: document.querySelector('.toast-container'),
            
            showNotification: jest.fn((message, type = 'info') => {
                const container = document.querySelector('.toast-container');
                if (container) {
                    const toast = document.createElement('div');
                    toast.className = `toast show bg-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} text-white`;
                    toast.setAttribute('role', 'alert');
                    toast.setAttribute('aria-live', 'assertive');
                    toast.setAttribute('aria-atomic', 'true');
                    
                    toast.innerHTML = `
                        <div class="toast-header">
                            <strong class="me-auto">Thông báo</strong>
                            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                        </div>
                        <div class="toast-body">${message}</div>
                    `;
                    
                    container.appendChild(toast);
                    
                    // Auto remove after 3 seconds
                    setTimeout(() => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    }, 3000);
                }
            }),
            
            showSuccess: jest.fn((message) => {
                const mockNotificationManager = MockComponentFactory.createNotificationManager();
                mockNotificationManager.showNotification(message, 'success');
            }),
            
            showError: jest.fn((message) => {
                const mockNotificationManager = MockComponentFactory.createNotificationManager();
                mockNotificationManager.showNotification(message, 'error');
            }),
            
            showWarning: jest.fn((message) => {
                const mockNotificationManager = MockComponentFactory.createNotificationManager();
                mockNotificationManager.showNotification(message, 'warning');
            }),
            
            showInfo: jest.fn((message) => {
                const mockNotificationManager = MockComponentFactory.createNotificationManager();
                mockNotificationManager.showNotification(message, 'info');
            })
        };
    }
    
    static createVideoManager() {
        return {
            notificationManager: MockComponentFactory.createNotificationManager(),
            socket: {
                on: jest.fn(),
                emit: jest.fn(),
                connected: true
            },
            currentVideoJob: null,
            
            generateSessionId: jest.fn(() => {
                return 'video-session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            }),
            
            createVideo: jest.fn(async (topic, duration = 15, voice = 'nova', background = 'office') => {
                const mockResponse = {
                    success: true,
                    video: {
                        id: Math.floor(Math.random() * 1000),
                        title: topic,
                        duration: duration,
                        voice: voice,
                        background: background
                    }
                };
                
                // Simulate API call
                global.fetch.mockResolvedValueOnce({
                    json: async () => mockResponse
                });
                
                const response = await global.fetch('/api/videos/create');
                const data = await response.json();
                
                if (data.success) {
                    const container = document.getElementById('messagesContainer');
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                    }
                }
                
                return data;
            }),
            
            downloadVideo: jest.fn((videoId) => {
                // Mock download functionality
                console.log(`Downloading video ${videoId}`);
                
                // Create mock download link
                const link = document.createElement('a');
                link.href = `/api/videos/${videoId}/download`;
                link.download = `video-${videoId}.mp4`;
                link.click();
            }),
            
            handleVideoProgress: jest.fn((data) => {
                const { job_id, step, progress, message } = data;
                
                if (job_id !== this.currentVideoJob) return;
                
                const progressMessage = this.formatProgressMessage(step, progress, message);
                const uiManager = MockComponentFactory.createUIManager();
                uiManager.updateTypingIndicator(progressMessage, progress);
            }),
            
            formatProgressMessage: jest.fn((step, progress, message) => {
                const stepMessages = {
                    'analyzing': '🔍 Đang phân tích nội dung...',
                    'script_generation': '📝 Đang tạo script...',
                    'audio_generation': '🎤 Đang tạo audio...',
                    'video_generation': '🎬 Đang tạo video...',
                    'finalizing': '✨ Đang hoàn thiện...'
                };
                
                const stepMessage = stepMessages[step] || `📋 ${step}...`;
                return message ? `${stepMessage}\n${message}` : stepMessage;
            }),
            
            escapeHtml: jest.fn((unsafe) => {
                if (unsafe === null) return 'null';
                if (unsafe === undefined) return 'undefined';
                return String(unsafe)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            })
        };
    }
    
    static createChatCore(dependencies) {
        return {
            sessionManager: dependencies.session,
            uiManager: dependencies.ui,
            notificationManager: dependencies.notification,
            isLoading: false,
            currentMessageType: 'conversation',
            
            sendMessage: jest.fn(async (message) => {
                if (!message.trim() || this.isLoading) return;
                
                this.uiManager.addUserMessage(message);
                this.setLoading(true);
                this.uiManager.showTypingIndicator();
                
                try {
                    const response = await global.fetch('/api/chat/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: message,
                            session_id: this.sessionManager.getSessionId(),
                            type: this.currentMessageType
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        try {
                            const parsedResponse = JSON.parse(data.ai_response);
                            if (parsedResponse.type === 'video_created') {
                                this.handleVideoCreatedResponse(parsedResponse);
                            } else if (parsedResponse.type === 'redirect_video_creation') {
                                this.handleVideoCreationRedirect(parsedResponse);
                            } else {
                                this.uiManager.addAIMessage(parsedResponse.message || JSON.stringify(parsedResponse), data.timestamp);
                            }
                        } catch (jsonError) {
                            this.uiManager.addAIMessage(data.ai_response, data.timestamp);
                        }
                        
                        if (data.idea_created) {
                            this.notificationManager.showNotification('💡 Đã tạo ý tưởng mới!', 'success');
                            window.dispatchEvent(new CustomEvent('ideasUpdated'));
                        }
                    } else {
                        this.uiManager.showError('Lỗi: ' + (data.message || 'Không thể gửi tin nhắn'));
                    }
                } catch (error) {
                    this.uiManager.showError('Lỗi kết nối: ' + error.message);
                } finally {
                    this.uiManager.hideTypingIndicator();
                    this.setLoading(false);
                    this.uiManager.scrollToBottom();
                }
            }),
            
            setMessageType: jest.fn((type) => {
                this.currentMessageType = type;
                this.uiManager.updateChatTypeUI(type);
            }),
            
            setLoading: jest.fn((loading) => {
                this.isLoading = loading;
                this.uiManager.setLoadingState(loading);
            }),
            
            createVideoDisplayHTML: jest.fn((video) => {
                return `
                    <div class="video-embed-container">
                        <div class="video-header">
                            <h6>🎬 Video đã tạo</h6>
                        </div>
                        <video controls class="w-100">
                            <source src="/api/videos/${video.id}/file" type="video/mp4">
                        </video>
                        <div class="video-info">
                            <strong>Thời lượng: ${video.duration}s</strong><br>
                            Giọng đọc: <strong>${video.voice}</strong><br>
                            Background: <strong>${video.background}</strong><br>
                            Composition: <strong>${video.composition}</strong>
                        </div>
                    </div>
                `;
            }),
            
            truncateText: jest.fn((text, maxLength) => {
                if (text.length <= maxLength) return text;
                return text.substring(0, maxLength) + '...';
            }),
            
            useQuickPrompt: jest.fn((prompt, type) => {
                this.setMessageType(type);
                this.uiManager.setMessageInput(prompt);
                setTimeout(() => {
                    if (this.uiManager.getMessageInput() === prompt) {
                        this.sendMessage(prompt);
                    }
                }, 500);
            }),
            
            handleVideoCreatedResponse: jest.fn((responseData) => {
                const { message, video } = responseData;
                const videoHtml = this.createVideoDisplayHTML(video);
                this.uiManager.addAIMessageWithVideo(message, videoHtml, video);
                this.notificationManager.showSuccess('🎬 Video đã được tạo thành công!');
                window.dispatchEvent(new CustomEvent('videosUpdated'));
            }),
            
            handleVideoCreationRedirect: jest.fn(async (responseData) => {
                const { message, video_request } = responseData;
                this.uiManager.addAIMessage(message);
                
                try {
                    const response = await global.fetch('/api/chat/create-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...video_request,
                            session_id: this.sessionManager.getSessionId()
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        console.log('✅ Video creation initiated with job_id:', result.job_id);
                    } else {
                        this.notificationManager.showError('❌ Lỗi khởi tạo tạo video: ' + result.message);
                        this.uiManager.addAIMessage('❌ Có lỗi xảy ra khi tạo video: ' + result.message);
                    }
                } catch (error) {
                    this.notificationManager.showError('❌ Lỗi kết nối khi tạo video');
                    this.uiManager.addAIMessage('❌ Lỗi kết nối khi tạo video: ' + error.message);
                }
            })
        };
    }
    
    static createAll() {
        return {
            session: this.createSessionManager(),
            ui: this.createUIManager(),
            notification: this.createNotificationManager(),
            video: this.createVideoManager()
        };
    }
}

// Export cho test environment
if (typeof global !== 'undefined') {
    global.MockComponentFactory = MockComponentFactory;
}

// Export cho browser environment  
if (typeof window !== 'undefined') {
    window.MockComponentFactory = MockComponentFactory;
}