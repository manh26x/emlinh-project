class SessionManager {
    constructor() {
        this.sessionId = null;
        this.sessionIdDisplay = document.getElementById('sessionId');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        
        this.initializeSession();
        this.bindEvents();
    }
    
    bindEvents() {
        if (this.newSessionBtn) {
            this.newSessionBtn.addEventListener('click', () => {
                this.startNewSession();
            });
        }
    }
    
    initializeSession() {
        // Check if session_id exists in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const sessionIdFromUrl = urlParams.get('session_id');
        
        if (sessionIdFromUrl) {
            console.log('📝 [SessionManager] Found session_id in URL:', sessionIdFromUrl);
            this.sessionId = sessionIdFromUrl;
            this.loadChatHistory(sessionIdFromUrl);
        } else {
            console.log('📝 [SessionManager] No session_id in URL, generating new session');
            this.generateSessionId();
        }
        
        if (this.sessionIdDisplay) {
            this.sessionIdDisplay.textContent = this.sessionId;
        }
        
        // Join session with SocketManager if available
        if (window.socketManager) {
            window.socketManager.joinSession(this.sessionId);
        }
    }
    
    generateSessionId() {
        this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async loadChatHistory(sessionId) {
        try {
            console.log('📜 [SessionManager] Loading chat history for session:', sessionId);
            
            const response = await fetch(`/api/chat/history/${sessionId}`);
            const data = await response.json();
            
            if (data.success && data.history && data.history.length > 0) {
                console.log('📜 [SessionManager] Found', data.history.length, 'messages in history');
                
                // Clear existing messages
                if (window.chatManager && window.chatManager.uiManager) {
                    window.chatManager.uiManager.clearChat();
                }
                
                // Load messages into chat
                this.displayChatHistory(data.history);
                
                // Show success notification
                if (window.chatManager && window.chatManager.notificationManager) {
                    window.chatManager.notificationManager.showSuccess(`Đã tải lại ${data.history.length} tin nhắn từ lịch sử`);
                }
                
                // Clean up URL parameter after loading
                this.cleanUpUrlParameter();
            } else {
                console.log('📜 [SessionManager] No chat history found for session:', sessionId);
                
                // Show welcome message for empty session
                if (window.chatManager && window.chatManager.uiManager) {
                    window.chatManager.uiManager.addWelcomeMessage();
                }
                
                // Clean up URL parameter even if no history found
                this.cleanUpUrlParameter();
            }
            
        } catch (error) {
            console.error('❌ [SessionManager] Error loading chat history:', error);
            if (window.chatManager && window.chatManager.notificationManager) {
                window.chatManager.notificationManager.showError('Không thể tải lịch sử chat');
            }
            
            // Show welcome message on error
            if (window.chatManager && window.chatManager.uiManager) {
                window.chatManager.uiManager.addWelcomeMessage();
            }
        }
    }
    
    displayChatHistory(messages) {
        if (!window.chatManager || !window.chatManager.uiManager) {
            console.error('❌ [SessionManager] UIManager not available');
            return;
        }
        
        const uiManager = window.chatManager.uiManager;
        
        messages.forEach(message => {
            if (message.user_message && message.user_message.trim()) {
                // Add user message
                uiManager.addUserMessage(message.user_message, message.timestamp);
            }
            
            if (message.ai_response && message.ai_response.trim()) {
                // Add AI response
                uiManager.addAIMessage(message.ai_response, message.timestamp);
            }
        });
        
        // Scroll to bottom after loading all messages
        setTimeout(() => {
            uiManager.scrollToBottom();
        }, 100);
    }
    
    cleanUpUrlParameter() {
        // Remove session_id from URL to keep it clean
        const url = new URL(window.location);
        url.searchParams.delete('session_id');
        
        // Update URL without reloading the page
        window.history.replaceState({}, '', url.toString());
        
        console.log('🧹 [SessionManager] Cleaned up URL parameter');
    }
    
    getSessionId() {
        return this.sessionId;
    }
    
    startNewSession() {
        // Leave current session if exists
        if (this.sessionId && window.socketManager) {
            window.socketManager.leaveSession(this.sessionId);
        }
        
        this.generateSessionId();
        
        // Dispatch event for other modules to handle
        window.dispatchEvent(new CustomEvent('newSession', {
            detail: { sessionId: this.sessionId }
        }));
        
        return this.sessionId;
    }
}

// Export for test environment
if (typeof global !== 'undefined') {
    global.SessionManager = SessionManager;
} 