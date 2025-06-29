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
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔌 SocketIO connected');
                // Join session room để nhận updates
                this.socket.emit('join_session', { session_id: this.sessionId });
            });
            
            this.socket.on('disconnect', () => {
                console.log('🔌 SocketIO disconnected');
            });
            
            // Listen cho video progress updates
            this.socket.on('video_progress', (data) => {
                this.handleVideoProgress(data);
            });
            
        } catch (error) {
            console.error('❌ Failed to initialize SocketIO:', error);
        }
    }
    
    handleVideoProgress(data) {
        console.log('📺 Video progress:', data);
        
        if (!this.currentVideoJob || this.currentVideoJob !== data.job_id) {
            return;
        }
        
        const { step, message, progress, data: stepData } = data;
        
        // Cập nhật UI với progress
        this.updateVideoProgress(step, message, progress, stepData);
        
        // Nếu hoàn thành hoặc lỗi, clear current job
        if (step === 'completed' || step === 'failed') {
            this.currentVideoJob = null;
            this.uiManager.hideTypingIndicator();
            
            if (step === 'completed') {
                this.notificationManager.showSuccess('🎬 Video được tạo thành công!');
                // Hiển thị kết quả video
                if (stepData && stepData.video_id) {
                    this.uiManager.addAIMessage(`Video đã được tạo thành công! <a href="/videos/${stepData.video_id}" target="_blank">Xem video</a>`);
                }
            } else {
                this.notificationManager.showError('❌ Lỗi tạo video: ' + message);
                this.uiManager.addAIMessage('Xin lỗi, có lỗi xảy ra khi tạo video: ' + message);
            }
        }
    }
    
    updateVideoProgress(step, message, progress, stepData) {
        // Tạo progress message với emoji và format đẹp
        let progressMessage = this.formatProgressMessage(step, message, progress, stepData);
        
        // Cập nhật typing indicator với progress
        this.uiManager.updateTypingIndicator(progressMessage, progress);
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
        let formattedMessage = `${emoji} ${message}`;
        
        if (progress > 0) {
            formattedMessage += ` (${progress}%)`;
        }
        
        // Thêm thông tin chi tiết nếu có
        if (stepData) {
            if (stepData.script_preview) {
                formattedMessage += `\n📄 Nội dung: ${stepData.script_preview}`;
            }
            if (stepData.audio_file) {
                formattedMessage += `\n🎵 File âm thanh: ${stepData.audio_file.split('/').pop()}`;
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