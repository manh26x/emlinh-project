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
                this.uiManager.addAIMessage(data.ai_response, data.timestamp);
                
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