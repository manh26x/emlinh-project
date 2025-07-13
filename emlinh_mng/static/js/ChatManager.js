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
        
        // Edit session button
        const editSessionBtn = document.getElementById('editSessionBtn');
        if (editSessionBtn) {
            editSessionBtn.addEventListener('click', () => {
                this.showEditSessionModal();
            });
        }
        
        // View history button
        const viewHistoryBtn = document.getElementById('viewHistoryBtn');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', () => {
                window.location.href = '/chat-history';
            });
        }
        
        // Save session modal confirm
        const confirmSaveBtn = document.getElementById('confirmSaveBtn');
        if (confirmSaveBtn) {
            confirmSaveBtn.addEventListener('click', () => {
                this.saveCurrentSession();
            });
        }
        
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
    
    async showEditSessionModal() {
        const sessionId = this.sessionManager.getSessionId();
        if (!sessionId) {
            this.notificationManager.showError('Chưa có cuộc hội thoại để chỉnh sửa');
            return;
        }
        
        // Check if there are any messages
        const messages = document.querySelectorAll('.message:not(.ai-message:first-child)');
        if (messages.length === 0) {
            this.notificationManager.showError('Chưa có tin nhắn nào trong cuộc hội thoại');
            return;
        }
        
        try {
            // Load existing session info
            const response = await fetch(`/api/chat/sessions/${sessionId}`);
            const data = await response.json();
            
            if (data.success && data.session) {
                // Fill modal with existing data
                document.getElementById('sessionTitleInput').value = data.session.title || '';
                document.getElementById('sessionDescriptionInput').value = data.session.description || '';
                document.getElementById('sessionTagsInput').value = 
                    data.session.tags ? data.session.tags.join(', ') : '';
            } else {
                // If session doesn't exist yet, clear inputs (auto-created session might not be loaded yet)
                document.getElementById('sessionTitleInput').value = '';
                document.getElementById('sessionDescriptionInput').value = '';
                document.getElementById('sessionTagsInput').value = '';
            }
        } catch (error) {
            console.error('Error loading session:', error);
            // Clear inputs on error
            document.getElementById('sessionTitleInput').value = '';
            document.getElementById('sessionDescriptionInput').value = '';
            document.getElementById('sessionTagsInput').value = '';
        }
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('saveSessionModal'));
        modal.show();
    }
    
    async saveCurrentSession() {
        const sessionId = this.sessionManager.getSessionId();
        const title = document.getElementById('sessionTitleInput').value.trim();
        const description = document.getElementById('sessionDescriptionInput').value.trim();
        const tagsInput = document.getElementById('sessionTagsInput').value.trim();
        
        if (!sessionId) {
            this.notificationManager.showError('Không có session để cập nhật');
            return;
        }
        
        if (!title) {
            this.notificationManager.showError('Vui lòng nhập tiêu đề cuộc hội thoại');
            return;
        }
        
        try {
            // Parse tags
            const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            
            // Update existing session
            const response = await fetch(`/api/chat/sessions/${sessionId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                    tags: tags
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Hide modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('saveSessionModal'));
                modal.hide();
                
                this.notificationManager.showSuccess('Thông tin cuộc hội thoại đã được cập nhật');
            } else {
                this.notificationManager.showError('Lỗi khi cập nhật: ' + data.message);
            }
        } catch (error) {
            console.error('Error updating session:', error);
            this.notificationManager.showError('Lỗi khi cập nhật thông tin');
        }
    }
} 