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
    }
    
    getSessionId() {
        return this.sessionId;
    }
    
    startNewSession() {
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