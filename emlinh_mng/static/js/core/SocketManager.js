class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.eventListeners = new Map();
        this.sessionId = null;
        
        this.initialize();
    }
    
    initialize() {
        try {
            console.log('🔌 Initializing SocketManager...');
            this.socket = io({
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true,
                timeout: 60000,
                forceNew: false
            });
            
            this.setupEventHandlers();
            
        } catch (error) {
            console.error('❌ Failed to initialize SocketManager:', error);
        }
    }
    
    setupEventHandlers() {
        this.socket.on('connect', () => {
            console.log('🔌 SocketIO connected - SID:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Auto-join session if we have one
            if (this.sessionId) {
                this.joinSession(this.sessionId);
            }
            
            // Notify listeners
            this.notifyListeners('connect', { socketId: this.socket.id });
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('🔌 SocketIO disconnected - Reason:', reason);
            this.isConnected = false;
            
            // Notify listeners
            this.notifyListeners('disconnect', { reason });
            
            // Auto-reconnect logic
            if (reason === 'io server disconnect') {
                // Server disconnected us, try to reconnect
                this.socket.connect();
            } else if (this.reconnectAttempts < this.maxReconnectAttempts) {
                // Client disconnected, try to reconnect with exponential backoff
                this.reconnectAttempts++;
                const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                
                setTimeout(() => {
                    this.socket.connect();
                }, delay);
            } else {
                console.error('❌ Max reconnection attempts reached');
            }
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('❌ SocketIO connection error:', error);
            this.notifyListeners('connect_error', { error });
        });
        
        // Handle video progress events
        this.socket.on('video_progress', (data) => {
            console.log('📺 Video progress received:', data);
            this.notifyListeners('video_progress', data);
        });
    }
    
    joinSession(sessionId) {
        if (!this.isConnected) {
            console.warn('⚠️ Cannot join session: not connected');
            return false;
        }
        
        this.sessionId = sessionId;
        this.socket.emit('join_session', { session_id: sessionId });
        console.log('📋 Joining session:', sessionId);
        return true;
    }
    
    leaveSession(sessionId) {
        if (!this.isConnected) {
            console.warn('⚠️ Cannot leave session: not connected');
            return false;
        }
        
        this.socket.emit('leave_session', { session_id: sessionId });
        console.log('📋 Leaving session:', sessionId);
        
        if (this.sessionId === sessionId) {
            this.sessionId = null;
        }
        return true;
    }
    
    // Event listener management
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    notifyListeners(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }
    
    // Utility methods
    isSocketConnected() {
        return this.isConnected && this.socket && this.socket.connected;
    }
    
    getSocketId() {
        return this.socket ? this.socket.id : null;
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Create global instance
window.socketManager = new SocketManager(); 