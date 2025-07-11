console.log('📁 VideoManager.js loaded');

class VideoManager {
    constructor(notificationManager, uiManager) {
        console.log('✅ VideoManager constructor called');
        this.notificationManager = notificationManager;
        this.uiManager = uiManager;
        this.sessionId = this.generateSessionId();
        this.currentVideoJob = null;
        this.initializeSocketIO();
        this.bindEvents();
    }
    
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9);
    }
    
    initializeSocketIO() {
        try {
            // Use global SocketManager instead of creating new connection
            if (window.socketManager) {
                console.log('🔌 Using global SocketManager');
                
                // Join session when connected
                if (window.socketManager.isSocketConnected()) {
                    window.socketManager.joinSession(this.sessionId);
                } else {
                    // Wait for connection
                    window.socketManager.addEventListener('connect', () => {
                        window.socketManager.joinSession(this.sessionId);
                    });
                }
                
                // Listen for video progress events
                window.socketManager.addEventListener('video_progress', (data) => {
                    this.handleVideoProgress(data);
                });
                
                // Listen for disconnect events
                window.socketManager.addEventListener('disconnect', (data) => {
                    console.log('🔌 VideoManager: Socket disconnected:', data.reason);
                });
                
            } else {
                console.error('❌ SocketManager not available');
            }
            
        } catch (error) {
            console.error('❌ Failed to initialize SocketIO:', error);
        }
    }
    
    handleVideoProgress(data) {
        console.log('📺 [VideoManager] Video progress received:', data);
        console.log('📺 [VideoManager] Current job:', this.currentVideoJob);
        console.log('📺 [VideoManager] Received job:', data.job_id);
        
        // TEMP FIX: Bỏ qua check job_id để đảm bảo UI luôn cập nhật
        // TODO: Fix job_id management sau khi debug xong
        
        const { step, message, progress, data: stepData } = data;
        
        console.log(`📺 [VideoManager] Processing step: ${step}, progress: ${progress}%`);
        
        // LUÔN hiển thị messages cho các bước quan trọng
        this.showStepMessage(step, message, progress, stepData);
        
        // LUÔN cập nhật typing indicator với progress hiện tại
        this.updateVideoProgress(step, message, progress, stepData);
        
        // Nếu hoàn thành hoặc lỗi, clear current job và hiển thị kết quả cuối
        if (step === 'completed' || step === 'failed') {
            console.log(`📺 [VideoManager] Video ${step}! Clearing job and showing final result.`);
            this.currentVideoJob = null;
            this.uiManager.hideTypingIndicator();
            
            if (step === 'completed') {
                this.notificationManager.showSuccess('🎬 Video được tạo thành công!');
                
                // Hiển thị message hoàn thành với link video
                let completionMessage = '🎉 **Video đã được tạo thành công!**';
                if (stepData && stepData.video_id) {
                    completionMessage += `\n\n🆔 **Video ID:** ${stepData.video_id}`;
                    completionMessage += `\n📺 **Xem video:** [Tại đây](/videos/${stepData.video_id})`;
                    
                    if (stepData.actual_duration) {
                        completionMessage += `\n⏱️ **Thời lượng thực tế:** ${stepData.actual_duration}s`;
                    }
                    if (stepData.topic) {
                        completionMessage += `\n📝 **Chủ đề:** ${stepData.topic}`;
                    }
                }
                
                console.log('📺 [VideoManager] Adding completion message:', completionMessage);
                this.uiManager.addAIMessage(completionMessage);
                
            } else {
                this.notificationManager.showError('❌ Lỗi tạo video: ' + message);
                this.uiManager.addAIMessage('❌ **Xin lỗi, có lỗi xảy ra khi tạo video:**\n' + message);
            }
        }
    }
    
    showStepMessage(step, message, progress, stepData) {
        console.log(`📺 [VideoManager] showStepMessage called - step: ${step}, message: ${message}`);
        
        // Chỉ hiển thị message cho các bước quan trọng để tránh spam
        const importantSteps = [
            'script_completed',
            'record_created', 
            'audio_completed',
            'video_rendering',
            'completed',
            'failed'
        ];
        
        console.log(`📺 [VideoManager] Is important step? ${importantSteps.includes(step)}`);
        
        if (importantSteps.includes(step)) {
            let stepMessage = this.formatProgressMessage(step, message, progress, stepData);
            
            // Thêm thông tin chi tiết cho các bước quan trọng
            if (step === 'script_completed' && stepData && stepData.script_preview) {
                stepMessage += `\n\n📄 **Nội dung script đã tạo:**\n_"${stepData.script_preview}"_`;
            }
            
            if (step === 'audio_completed' && stepData) {
                if (stepData.actual_duration) {
                    stepMessage += `\n⏱️ **Thời lượng thực tế:** ${stepData.actual_duration}s`;
                }
                if (stepData.original_duration) {
                    stepMessage += ` (dự kiến: ${stepData.original_duration}s)`;
                }
            }
            
            if (step === 'record_created' && stepData && stepData.video_id) {
                stepMessage += `\n🆔 **Video ID:** ${stepData.video_id}`;
            }
            
            console.log(`📺 [VideoManager] Adding step message for ${step}:`, stepMessage);
            // Thêm AI message để user thấy rõ tiến trình
            this.uiManager.addAIMessage(stepMessage);
        }
    }
    
    updateVideoProgress(step, message, progress, stepData) {
        // Tạo progress message với emoji và format đẹp
        let progressMessage = this.formatProgressMessage(step, message, progress, stepData);
        
        // Luôn hiển thị typing indicator với progress để user thấy tiến trình
        // Thêm thông tin step hiện tại
        progressMessage += `\n\n🔄 **Bước hiện tại:** ${this.getStepDescription(step)}`;
        
        // Cập nhật typing indicator với progress bar
        this.uiManager.updateTypingIndicator(progressMessage, progress);
        this.uiManager.scrollToBottom();
    }
    
    getStepDescription(step) {
        const stepDescriptions = {
            'request_received': 'Nhận yêu cầu tạo video',
            'initializing': 'Khởi tạo hệ thống',
            'generating_script': 'Tạo nội dung bài thuyết trình',
            'script_completed': 'Hoàn thành nội dung',
            'creating_record': 'Tạo bản ghi database',
            'record_created': 'Lưu thông tin video',
            'generating_audio': 'Tạo file âm thanh',
            'audio_completed': 'Hoàn thành âm thanh',
            'rendering_video': 'Bắt đầu render video',
            'video_rendering': 'Đang render video',
            'finalizing': 'Hoàn thiện video',
            'completed': 'Hoàn thành tất cả',
            'failed': 'Gặp lỗi'
        };
        return stepDescriptions[step] || step;
    }
    
    formatProgressMessage(step, message, progress, stepData) {
        const stepEmojis = {
            'request_received': '📋',
            'initializing': '🔧',
            'generating_script': '✍️',
            'script_completed': '📝',
            'creating_record': '💾',
            'record_created': '✅',
            'generating_audio': '🎵',
            'audio_completed': '🔊',
            'rendering_video': '🎬',
            'video_rendering': '⚡',
            'finalizing': '🎯',
            'completed': '🎉',
            'failed': '❌'
        };
        
        const emoji = stepEmojis[step] || '⚙️';
        let formattedMessage = `${emoji} **${message}**`;
        
        // Thêm progress percentage với visual bar
        if (progress > 0) {
            const progressBarLength = 20;
            const filledLength = Math.round((progress / 100) * progressBarLength);
            const emptyLength = progressBarLength - filledLength;
            const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
            
            formattedMessage += `\n\n📊 **Tiến độ:** ${progress}%`;
            formattedMessage += `\n\`${progressBar}\` ${progress}%`;
        }
        
        // Thêm thông tin chi tiết nếu có
        if (stepData) {
            if (stepData.topic) {
                formattedMessage += `\n🎯 **Chủ đề:** ${stepData.topic}`;
            }
            if (stepData.composition) {
                formattedMessage += `\n🎨 **Composition:** ${stepData.composition}`;
            }
            if (stepData.background) {
                formattedMessage += `\n🖼️ **Background:** ${stepData.background}`;
            }
            if (stepData.voice) {
                formattedMessage += `\n🗣️ **Giọng đọc:** ${stepData.voice}`;
            }
            if (stepData.actual_duration && stepData.original_duration) {
                formattedMessage += `\n⏱️ **Thời lượng:** ${stepData.actual_duration}s (dự kiến: ${stepData.original_duration}s)`;
            }
        }
        
        return formattedMessage;
    }
    
    bindEvents() {
        const createVideoBtn = document.getElementById('createVideoBtn');
        if (createVideoBtn) {
            createVideoBtn.addEventListener('click', () => {
                this.showVideoCreationModal();
            });
        }
    }
    
    showVideoCreationModal() {
        const topic = prompt('Nhập chủ đề video bạn muốn tạo:');
        if (!topic) return;
        
        this.createVideo(topic);
    }
    
    async createVideo(topic, duration = 15, composition = 'Scene-Landscape', background = 'office', voice = 'nova') {
        try {
            this.uiManager.addUserMessage(`Tạo video về: ${topic}`);
            this.uiManager.showTypingIndicator('🔧 Đang khởi tạo quy trình tạo video...', 5);
            
            const response = await fetch('/api/chat/create-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic: topic,
                    duration: duration,
                    composition: composition,
                    background: background,
                    voice: voice,
                    session_id: this.sessionId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Lưu job ID để track progress
                this.currentVideoJob = data.job_id;
                console.log('🎬 Video creation started, job ID:', data.job_id);
                
                // Progress sẽ được cập nhật qua SocketIO
                // Không cần addAIMessage ở đây vì sẽ được handle bởi progress events
                
            } else {
                this.uiManager.hideTypingIndicator();
                this.uiManager.addAIMessage(`❌ Lỗi tạo video: ${data.message}`);
                this.notificationManager.showError('Lỗi tạo video: ' + data.message);
            }
            
        } catch (error) {
            console.error('Video creation error:', error);
            this.uiManager.hideTypingIndicator();
            this.uiManager.addAIMessage(`❌ Lỗi kết nối khi tạo video: ${error.message}`);
            this.notificationManager.showError('Lỗi kết nối khi tạo video: ' + error.message);
        } finally {
            this.uiManager.scrollToBottom();
        }
    }
    
    downloadVideo(videoId) {
        const link = document.createElement('a');
        link.href = `/api/videos/${videoId}/file`;
        link.download = '';
        link.click();
        this.notificationManager.showInfo('Đang tải video...');
    }
    
    async viewVideoDetail(videoId) {
        try {
            const response = await fetch(`/api/videos/${videoId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showVideoDetailModal(data.video);
            } else {
                this.notificationManager.showError('Lỗi khi tải chi tiết video: ' + data.message);
            }
            
        } catch (error) {
            console.error('Error loading video detail:', error);
            this.notificationManager.showError('Lỗi kết nối khi tải chi tiết video');
        }
    }
    
    showVideoDetailModal(video) {
        const videoId = video.id;
        const modalHtml = `
            <div class="modal fade" id="videoDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Chi tiết Video</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <video controls class="w-100" style="max-height: 300px;">
                                        <source src="/api/videos/${videoId}/file" type="video/mp4">
                                        Trình duyệt không hỗ trợ video.
                                    </video>
                                </div>
                                <div class="col-md-6">
                                    <h5>${this.escapeHtml(video.title)}</h5>
                                    <p><strong>Chủ đề:</strong> ${this.escapeHtml(video.topic)}</p>
                                    <p><strong>Thời lượng:</strong> ${video.duration} giây</p>
                                    <p><strong>Trạng thái:</strong> <span class="badge bg-success">Hoàn thành</span></p>
                                    <p><strong>Ngày tạo:</strong> ${new Date(video.created_at).toLocaleDateString('vi-VN')}</p>
                                    ${video.script ? `
                                        <div class="mt-3">
                                            <h6>Script:</h6>
                                            <div class="bg-light p-3 rounded small">
                                                ${this.escapeHtml(video.script)}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                            <button type="button" class="btn btn-primary" onclick="videoManager.downloadVideo(${videoId})">
                                <i class="fas fa-download"></i> Tải về
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('videoDetailModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('videoDetailModal'));
        modal.show();
        
        // Clean up when modal is hidden
        document.getElementById('videoDetailModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for test environment
if (typeof global !== 'undefined') {
    global.VideoManager = VideoManager;
} 