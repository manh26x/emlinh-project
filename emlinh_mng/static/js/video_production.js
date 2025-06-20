class VideoProductionManager {
    constructor() {
        this.currentJobId = null;
        this.currentTTSJobId = null;
        this.pollingInterval = null;
        this.ttsPollingInterval = null;
        this.init();
    }

    init() {
        this.loadCompositions();
        this.loadAudioFiles();
        this.loadRenderJobs();
        this.loadTTSJobs();
        this.setupEventListeners();
        this.startPolling();
        this.startTTSPolling();
    }

    setupEventListeners() {
        // Video form submission
        document.getElementById('video-config-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startRender();
        });

        // TTS form submission
        document.getElementById('tts-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startTTS();
        });

        // Auto-refresh jobs every 5 seconds
        setInterval(() => {
            this.loadRenderJobs();
            this.loadTTSJobs();
        }, 5000);
    }

    async loadCompositions() {
        try {
            const response = await fetch('/api/video/compositions');
            const data = await response.json();
            
            const select = document.getElementById('composition-select');
            select.innerHTML = '<option value="">Chọn composition...</option>';
            
            if (data.success && data.compositions) {
                data.compositions.forEach(comp => {
                    const option = document.createElement('option');
                    option.value = comp.id;
                    option.textContent = `${comp.id} - ${comp.description}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading compositions:', error);
            this.showToast('Lỗi khi tải compositions', 'error');
        }
    }

    async loadAudioFiles() {
        try {
            const response = await fetch('/api/video/audio-files');
            const data = await response.json();
            
            const select = document.getElementById('audio-select');
            select.innerHTML = '';
            
            if (data.success && data.audio_files) {
                data.audio_files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = file;
                    option.textContent = file === 'None' ? 'Không có audio' : file;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading audio files:', error);
            this.showToast('Lỗi khi tải danh sách audio', 'error');
        }
    }

    async loadRenderJobs() {
        try {
            const response = await fetch('/api/video/jobs');
            const data = await response.json();
            
            if (data.success) {
                this.displayRenderJobs(data.jobs);
            }
        } catch (error) {
            console.error('Error loading render jobs:', error);
        }
    }

    displayRenderJobs(jobs) {
        const container = document.getElementById('render-jobs-list');
        
        if (Object.keys(jobs).length === 0) {
            container.innerHTML = '<p class="text-muted">Chưa có render job nào</p>';
            return;
        }

        const jobsArray = Object.entries(jobs)
            .sort(([,a], [,b]) => new Date(b.start_time) - new Date(a.start_time));

        container.innerHTML = jobsArray.map(([jobId, job]) => this.renderJobCard(jobId, job)).join('');
    }

    renderJobCard(jobId, job) {
        const statusClass = this.getStatusClass(job.status);
        const statusIcon = this.getStatusIcon(job.status);
        const progress = job.progress || 0;
        
        return `
            <div class="job-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <h6 class="mb-1">${job.composition_id}</h6>
                        <small class="text-muted">Job ID: ${jobId}</small>
                    </div>
                    <span class="badge ${statusClass} status-badge">
                        <i class="${statusIcon} me-1"></i>
                        ${this.getStatusText(job.status)}
                    </span>
                </div>
                
                ${job.status === 'rendering' || job.status === 'starting' ? `
                    <div class="progress mb-2" style="height: 8px;">
                        <div class="progress-bar progress-animate bg-primary" 
                             style="width: ${progress}%"></div>
                    </div>
                    <small class="text-muted">${progress}% hoàn thành</small>
                ` : ''}
                
                ${job.status === 'completed' ? `
                    <div class="mt-2">
                        <small class="text-success">
                            <i class="fas fa-check-circle me-1"></i>
                            Render hoàn thành!
                        </small>
                        <br>
                        <small class="text-muted">File: ${job.output_path}</small>
                    </div>
                ` : ''}
                
                ${job.status === 'failed' ? `
                    <div class="mt-2">
                        <small class="text-danger">
                            <i class="fas fa-exclamation-circle me-1"></i>
                            Lỗi: ${job.error || 'Unknown error'}
                        </small>
                    </div>
                ` : ''}
                
                <div class="mt-2">
                    <small class="text-muted">
                        Bắt đầu: ${this.formatDateTime(job.start_time)}
                        ${job.end_time ? ` | Kết thúc: ${this.formatDateTime(job.end_time)}` : ''}
                    </small>
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        const classes = {
            'starting': 'bg-info',
            'rendering': 'bg-warning',
            'completed': 'bg-success',
            'failed': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusIcon(status) {
        const icons = {
            'starting': 'fas fa-hourglass-start',
            'rendering': 'fas fa-spinner fa-spin',
            'completed': 'fas fa-check-circle',
            'failed': 'fas fa-exclamation-circle'
        };
        return icons[status] || 'fas fa-question-circle';
    }

    getStatusText(status) {
        const texts = {
            'starting': 'Đang khởi động',
            'rendering': 'Đang render',
            'completed': 'Hoàn thành',
            'failed': 'Thất bại'
        };
        return texts[status] || 'Không xác định';
    }

    formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    }

    async startRender() {
        const compositionId = document.getElementById('composition-select').value;
        const duration = parseFloat(document.getElementById('duration-input').value);
        const audioFile = document.getElementById('audio-select').value;
        const background = document.getElementById('background-select').value;
        const outputName = document.getElementById('output-name').value.trim();

        if (!compositionId) {
            this.showToast('Vui lòng chọn composition', 'error');
            return;
        }

        // Loại bỏ tham số camera để sử dụng default values
        const renderData = {
            composition_id: compositionId,
            props: {
                durationInSeconds: duration,
                audioFileName: audioFile || 'None',
                backgroundScene: background
            }
        };

        if (outputName) {
            renderData.output_name = outputName;
        }

        try {
            // Disable form
            this.setFormDisabled(true);

            const response = await fetch('/api/video/render', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(renderData)
            });

            const data = await response.json();

            if (data.success) {
                this.currentJobId = data.job_id;
                this.showToast(data.message, 'success');
                this.startPolling();
                
                // Update current status
                document.getElementById('current-render-status').innerHTML = `
                    <div class="alert alert-info">
                        <strong>Đang render:</strong> ${compositionId}
                        <br>
                        <small>Job ID: ${data.job_id}</small>
                    </div>
                `;
            } else {
                this.showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Error starting render:', error);
            this.showToast('Lỗi khi bắt đầu render', 'error');
        } finally {
            // Re-enable form after 2 seconds
            setTimeout(() => this.setFormDisabled(false), 2000);
        }
    }

    setFormDisabled(disabled) {
        const form = document.getElementById('video-config-form');
        const inputs = form.querySelectorAll('input, select, button');
        inputs.forEach(input => {
            input.disabled = disabled;
        });
    }

    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(() => {
            if (this.currentJobId) {
                this.checkJobStatus();
            }
        }, 2000);
    }

    async checkJobStatus() {
        if (!this.currentJobId) return;

        try {
            const response = await fetch(`/api/video/status/${this.currentJobId}`);
            const data = await response.json();

            if (data.success) {
                const status = data.status;
                
                if (status.status === 'completed' || status.status === 'failed') {
                    this.currentJobId = null;
                    
                    if (status.status === 'completed') {
                        this.showToast('Render hoàn thành thành công!', 'success');
                        document.getElementById('current-render-status').innerHTML = `
                            <div class="alert alert-success">
                                <strong>Hoàn thành:</strong> ${status.composition_id}
                                <br>
                                <small>File: ${status.output_path}</small>
                            </div>
                        `;
                    } else {
                        this.showToast('Render thất bại: ' + (status.error || 'Unknown error'), 'error');
                        document.getElementById('current-render-status').innerHTML = `
                            <div class="alert alert-danger">
                                <strong>Thất bại:</strong> ${status.composition_id}
                                <br>
                                <small>Lỗi: ${status.error || 'Unknown error'}</small>
                            </div>
                        `;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking job status:', error);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('notification-toast');
        const toastBody = document.getElementById('toast-message');
        const toastHeader = toast.querySelector('.toast-header i');
        
        // Update icon and color based on type
        toastHeader.className = type === 'error' ? 'fas fa-exclamation-circle text-danger me-2' :
                               type === 'success' ? 'fas fa-check-circle text-success me-2' :
                               'fas fa-info-circle text-primary me-2';
        
        toastBody.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    // TTS Methods
    async loadTTSJobs() {
        try {
            const response = await fetch('/api/tts/jobs');
            const data = await response.json();
            
            if (data.success) {
                this.displayTTSJobs(data.jobs);
            }
        } catch (error) {
            console.error('Error loading TTS jobs:', error);
        }
    }

    displayTTSJobs(jobs) {
        const container = document.getElementById('tts-jobs-list');
        
        if (Object.keys(jobs).length === 0) {
            container.innerHTML = '<p class="text-muted">Chưa có TTS job nào</p>';
            return;
        }

        const jobsArray = Object.entries(jobs)
            .sort(([,a], [,b]) => new Date(b.start_time) - new Date(a.start_time))
            .slice(0, 3); // Chỉ hiển thị 3 jobs gần nhất

        container.innerHTML = `
            <h6 class="mb-3">TTS Jobs gần đây:</h6>
            ${jobsArray.map(([jobId, job]) => this.renderTTSJobCard(jobId, job)).join('')}
        `;
    }

    renderTTSJobCard(jobId, job) {
        const statusClass = this.getTTSStatusClass(job.status);
        const statusIcon = this.getTTSStatusIcon(job.status);
        const progress = job.progress || 0;
        
        return `
            <div class="card mb-2 border-success">
                <div class="card-body py-2">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <small class="fw-bold">${job.filename || 'TTS Job'}</small>
                            <br>
                            <small class="text-muted">${job.text ? job.text.substring(0, 50) + '...' : ''}</small>
                        </div>
                        <div class="col-md-3">
                            <span class="badge ${statusClass}">
                                <i class="${statusIcon} me-1"></i>
                                ${this.getTTSStatusText(job.status)}
                            </span>
                            ${job.status === 'generating_speech' || job.status === 'converting_to_wav' || job.status === 'converting_to_ogg' || job.status === 'generating_lip_sync' ? `
                                <div class="progress mt-1" style="height: 4px;">
                                    <div class="progress-bar bg-success" style="width: ${progress}%"></div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="col-md-3">
                            <small class="text-muted">
                                ${this.formatDateTime(job.start_time)}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getTTSStatusClass(status) {
        const classes = {
            'starting': 'bg-info',
            'generating_speech': 'bg-warning',
            'converting_to_wav': 'bg-warning',
            'converting_to_ogg': 'bg-warning', 
            'generating_lip_sync': 'bg-warning',
            'completed': 'bg-success',
            'failed': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    getTTSStatusIcon(status) {
        const icons = {
            'starting': 'fas fa-hourglass-start',
            'generating_speech': 'fas fa-magic',
            'converting_to_wav': 'fas fa-cogs',
            'converting_to_ogg': 'fas fa-exchange-alt',
            'generating_lip_sync': 'fas fa-comments',
            'completed': 'fas fa-check-circle',
            'failed': 'fas fa-exclamation-circle'
        };
        return icons[status] || 'fas fa-question-circle';
    }

    getTTSStatusText(status) {
        const texts = {
            'starting': 'Đang khởi động',
            'generating_speech': 'Đang tạo speech',
            'converting_to_wav': 'Chuyển đổi WAV',
            'converting_to_ogg': 'Chuyển đổi OGG',
            'generating_lip_sync': 'Tạo lip-sync',
            'completed': 'Hoàn thành',
            'failed': 'Thất bại'
        };
        return texts[status] || 'Không xác định';
    }

    async startTTS() {
        const text = document.getElementById('tts-text').value.trim();
        const filename = document.getElementById('tts-filename').value.trim();

        if (!text) {
            this.showToast('Vui lòng nhập text để chuyển đổi', 'error');
            return;
        }

        if (text.length > 4000) {
            this.showToast('Text quá dài (tối đa 4000 ký tự)', 'error');
            return;
        }

        const ttsData = {
            text: text,
            filename: filename
        };

        try {
            // Disable form
            this.setTTSFormDisabled(true);
            this.showTTSProgress(0, 'Đang khởi động...');

            const response = await fetch('/api/tts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ttsData)
            });

            const data = await response.json();

            if (data.success) {
                this.currentTTSJobId = data.job_id;
                this.showToast(data.message, 'success');
                this.startTTSPolling();
            } else {
                this.showToast(data.message, 'error');
                this.hideTTSProgress();
            }
        } catch (error) {
            console.error('Error starting TTS:', error);
            this.showToast('Lỗi khi bắt đầu TTS', 'error');
            this.hideTTSProgress();
        } finally {
            // Re-enable form after 2 seconds
            setTimeout(() => this.setTTSFormDisabled(false), 2000);
        }
    }

    setTTSFormDisabled(disabled) {
        const form = document.getElementById('tts-form');
        const inputs = form.querySelectorAll('input, textarea, button');
        inputs.forEach(input => {
            input.disabled = disabled;
        });
    }

    showTTSProgress(progress, message) {
        const progressDiv = document.getElementById('tts-progress');
        const progressBar = progressDiv.querySelector('.progress-bar');
        const messageSpan = progressDiv.querySelector('small');
        
        progressDiv.style.display = 'block';
        progressBar.style.width = progress + '%';
        messageSpan.textContent = message;
    }

    hideTTSProgress() {
        const progressDiv = document.getElementById('tts-progress');
        progressDiv.style.display = 'none';
    }

    startTTSPolling() {
        if (this.ttsPollingInterval) {
            clearInterval(this.ttsPollingInterval);
        }

        this.ttsPollingInterval = setInterval(() => {
            if (this.currentTTSJobId) {
                this.checkTTSJobStatus();
            }
        }, 2000);
    }

    async checkTTSJobStatus() {
        if (!this.currentTTSJobId) return;

        try {
            const response = await fetch(`/api/tts/status/${this.currentTTSJobId}`);
            const data = await response.json();

            if (data.success) {
                const status = data.status;
                
                // Update progress
                this.showTTSProgress(status.progress, this.getTTSStatusText(status.status));
                
                if (status.status === 'completed' || status.status === 'failed') {
                    this.currentTTSJobId = null;
                    
                    if (status.status === 'completed') {
                        this.showToast('TTS hoàn thành thành công!', 'success');
                        this.hideTTSProgress();
                        
                        // Refresh audio files list for video production
                        this.loadAudioFiles();
                        
                        // Clear form
                        document.getElementById('tts-text').value = '';
                        document.getElementById('tts-filename').value = '';
                    } else {
                        this.showToast('TTS thất bại: ' + (status.error || 'Unknown error'), 'error');
                        this.hideTTSProgress();
                    }
                }
            }
        } catch (error) {
            console.error('Error checking TTS job status:', error);
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new VideoProductionManager();
}); 