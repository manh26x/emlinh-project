console.log('📁 VideoManager.js loaded');

class VideoManager {
    constructor(notificationManager, uiManager) {
        console.log('✅ VideoManager constructor called');
        this.notificationManager = notificationManager;
        this.uiManager = uiManager;
        this.sessionId = this.generateSessionId();
        this.currentVideoJob = null;
        this.currentEventSource = null; // SSE connection
        
        // Auto-reconnection properties
        this.currentJobId = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.lastEventId = null;
        this.isStreamActive = false;
        
        this.bindEvents();
        
        console.log('🎬 VideoManager initialized with session:', this.sessionId);
    }
    
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    startProgressStream(jobId) {
        console.log('📡 [VideoManager] Starting enhanced SSE stream for job:', jobId);
        
        // Initialize reconnection parameters
        this.currentJobId = jobId;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.lastEventId = null;
        this.isStreamActive = true;
        
        // Close existing stream if any
        if (this.currentEventSource) {
            console.log('📡 [VideoManager] Closing existing SSE stream');
            this.currentEventSource.close();
        }
        
        this.connectEventSource(jobId);
    }
    
    connectEventSource(jobId, isReconnect = false) {
        if (!this.isStreamActive) {
            console.log('📡 [VideoManager] Stream was stopped, aborting connection');
            return;
        }
        
        try {
            // Build URL with Last-Event-ID if reconnecting
            let url = `/api/video-progress/${jobId}`;
            if (isReconnect && this.lastEventId) {
                url += `?lastEventId=${this.lastEventId}`;
            }
            
            console.log(`📡 [VideoManager] ${isReconnect ? 'Reconnecting to' : 'Connecting to'} SSE: ${url}`);
            
            this.currentEventSource = new EventSource(url);
            
            this.currentEventSource.onopen = () => {
                console.log('📡 [VideoManager] SSE connection opened for job:', jobId);
                if (isReconnect) {
                    this.reconnectAttempts = 0; // Reset on successful reconnection
                    this.reconnectDelay = 1000; // Reset delay
                    console.log('✅ [VideoManager] Successfully reconnected to SSE stream');
                }
            };
            
            this.currentEventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('📺 [VideoManager] SSE event received:', data);
                    
                    // Store event ID for reconnection
                    if (event.lastEventId) {
                        this.lastEventId = event.lastEventId;
                    }
                    
                    this.handleSSEEvent(data, jobId);
                    
                } catch (e) {
                    console.error('❌ [VideoManager] Error parsing SSE data:', e);
                }
            };
            
            this.currentEventSource.onerror = (error) => {
                console.error('❌ [VideoManager] SSE error:', error);
                
                if (this.currentEventSource.readyState === EventSource.CLOSED) {
                    console.log('📡 [VideoManager] SSE connection closed');
                    this.attemptReconnection(jobId);
                } else if (this.currentEventSource.readyState === EventSource.CONNECTING) {
                    console.log('📡 [VideoManager] SSE connection in connecting state');
                }
            };
            
        } catch (error) {
            console.error('❌ [VideoManager] Error creating EventSource:', error);
            this.attemptReconnection(jobId);
        }
    }
    
    handleSSEEvent(data, jobId) {
        const { type } = data;
        
        switch (type) {
            case 'connected':
                console.log('📡 [VideoManager] SSE connected to job:', data.job_id);
                break;
                
            case 'heartbeat':
                console.log('💓 [VideoManager] Received heartbeat for job:', data.job_id);
                break;
                
            case 'error':
                console.error('❌ [VideoManager] SSE error:', data.message);
                this.uiManager.addAIMessage('❌ **Lỗi kết nối realtime:** ' + data.message);
                break;
                
            case 'timeout':
                console.warn('⏰ [VideoManager] SSE timeout for job:', data.job_id);
                this.uiManager.addAIMessage('⏰ **Timeout:** Không nhận được cập nhật trong 10 phút');
                this.stopProgressStream();
                break;
                
            case 'stream_end':
                console.log('🏁 [VideoManager] Stream ended for job:', data.job_id, 'Final step:', data.final_step);
                this.stopProgressStream();
                break;
                
            default:
                // Regular progress event
                this.handleVideoProgress(data);
                break;
        }
    }
    
    attemptReconnection(jobId) {
        if (!this.isStreamActive) {
            console.log('📡 [VideoManager] Stream was stopped, aborting reconnection');
            return;
        }
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ [VideoManager] Max reconnection attempts reached for job:', jobId);
            this.uiManager.addAIMessage('❌ **Mất kết nối:** Không thể tái kết nối sau nhiều lần thử. Hãy reload trang và thử lại.');
            this.stopProgressStream();
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`🔄 [VideoManager] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
        
        // Show reconnection message to user
        this.uiManager.addAIMessage(`🔄 **Đang tái kết nối...** (Lần thử ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (this.isStreamActive) {
                this.connectEventSource(jobId, true);
            }
        }, this.reconnectDelay);
        
        // Exponential backoff with jitter
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000) + Math.random() * 1000;
    }
    
    stopProgressStream() {
        console.log('📡 [VideoManager] Stopping SSE stream');
        
        // Mark stream as inactive to prevent reconnection
        this.isStreamActive = false;
        
        if (this.currentEventSource) {
            this.currentEventSource.close();
            this.currentEventSource = null;
        }
        
        // Reset reconnection parameters
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.lastEventId = null;
        this.currentJobId = null;
        
        console.log('📡 [VideoManager] SSE stream stopped and cleaned up');
    }
    
    async checkJobStatus(jobId) {
        """
        Fallback method để check job status nếu SSE fails
        """
        try {
            console.log('🔍 [VideoManager] Checking job status for:', jobId);
            
            const response = await fetch(`/api/video-progress/${jobId}/status`);
            const data = await response.json();
            
            if (data.success) {
                console.log('🔍 [VideoManager] Job status:', data);
                
                // Nếu job đã completed/failed, hiển thị kết quả
                if (data.is_completed) {
                    if (data.status === 'completed') {
                        this.notificationManager.showSuccess('🎬 Video được tạo thành công!');
                        
                        let message = '🎉 **Video đã được tạo thành công!**';
                        if (data.video_id) {
                            message += `\n\n🆔 **Video ID:** ${data.video_id}`;
                            message += `\n📺 **Xem video:** [Tại đây](${data.video_url})`;
                        }
                        this.uiManager.addAIMessage(message);
                        
                    } else if (data.status === 'failed') {
                        this.notificationManager.showError('❌ Video creation failed');
                        this.uiManager.addAIMessage('❌ **Lỗi tạo video:** ' + data.message);
                    }
                    
                    this.currentVideoJob = null;
                    this.uiManager.hideTypingIndicator();
                }
                
                return data;
            } else {
                console.warn('⚠️ [VideoManager] Job status check failed:', data.message);
                return null;
            }
            
        } catch (error) {
            console.error('❌ [VideoManager] Error checking job status:', error);
            return null;
        }
    }

    handleVideoProgress(data) {
        console.log('📺 [VideoManager] Video progress received:', data);
        console.log('📺 [VideoManager] Current job:', this.currentVideoJob);
        console.log('📺 [VideoManager] Received job:', data.job_id);
        
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
            this.stopProgressStream(); // Stop SSE stream
            
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
                    voice: voice
                    // Removed session_id - không cần cho SSE
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Lưu job ID và bắt đầu SSE stream
                this.currentVideoJob = data.job_id;
                console.log('🎬 [VideoManager] Video creation started, job ID:', data.job_id);
                
                // Bắt đầu SSE stream để nhận progress updates
                this.startProgressStream(data.job_id);
                
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