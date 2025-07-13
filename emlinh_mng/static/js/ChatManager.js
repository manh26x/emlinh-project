class ChatManager {
    constructor() {
        this.initializeManagers();
        this.bindGlobalEvents();
        this.setupQuickPrompts();
        
        // Initialize welcome message
        this.uiManager.addWelcomeMessage();
    }
    
    initializeManagers() {
        // Initialize managers in correct order (dependencies first)
        console.log('🔧 Initializing managers...');
        console.log('VideoManager type:', typeof VideoManager);
        console.log('VideoManager:', VideoManager);
        
        this.sessionManager = new SessionManager();
        this.notificationManager = new NotificationManager();
        this.uiManager = new UIManager();
        this.videoManager = new VideoManager(this.notificationManager, this.uiManager);
        this.ideaManager = new IdeaManager(this.notificationManager, this.uiManager);
        this.chatCore = new ChatCore(this.sessionManager, this.uiManager, this.notificationManager);
        
        console.log('✅ All managers initialized');
    }
    
    bindGlobalEvents() {
        // Chat form submit
        const chatForm = document.getElementById('chatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }
        
        // Chat type change
        document.querySelectorAll('input[name="chatType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.chatCore.setMessageType(e.target.value);
            });
        });
        
        // New session handling
        window.addEventListener('newSession', (e) => {
            this.uiManager.clearChat();
            this.uiManager.addWelcomeMessage();
            this.notificationManager.showSuccess('Đã bắt đầu phiên chat mới');
        });
        
        // Message input key handling
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }
    
    setupQuickPrompts() {
        document.querySelectorAll('.quick-prompt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prompt = e.target.dataset.prompt;
                const type = e.target.dataset.type;
                this.useQuickPrompt(prompt, type);
            });
        });
    }
    
    sendMessage() {
        const message = this.uiManager.getMessageInput();
        if (!message) return;
        
        this.uiManager.clearMessageInput();
        this.chatCore.sendMessage(message);
    }
    
    useQuickPrompt(prompt, type) {
        this.chatCore.useQuickPrompt(prompt, type);
    }
    
    // Expose methods for backward compatibility and global access
    downloadVideo(videoId) {
        this.videoManager.downloadVideo(videoId);
    }
    
    viewVideoDetail(videoId) {
        this.videoManager.viewVideoDetail(videoId);
    }
    
    createVideo(topic, duration, composition, background, voice) {
        this.videoManager.createVideo(topic, duration, composition, background, voice);
    }
} 