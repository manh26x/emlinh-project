class SessionManager {
    constructor() {
        this.sessionId = null;
        this.sessionIdDisplay = document.getElementById('sessionId');
        this.newSessionBtn = document.getElementById('newSessionBtn');
        
        this.generateSessionId();
        this.bindEvents();
    }
    
    bindEvents() {
        if (this.newSessionBtn) {
            this.newSessionBtn.addEventListener('click', () => {
                this.startNewSession();
            });
        }
    }
    
    generateSessionId() {
        this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        if (this.sessionIdDisplay) {
            this.sessionIdDisplay.textContent = this.sessionId;
        }
        
        // Join session with SocketManager if available
        if (window.socketManager) {
            window.socketManager.joinSession(this.sessionId);
        }
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