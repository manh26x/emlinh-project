class VideoManager {
    constructor() {
        this.currentPage = 1;
        this.currentFilters = {
            status: '',
            search: '',
            sort: 'newest'
        };
        this.videos = [];
        this.selectedVideoId = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadVideos();
    }
    
    initializeElements() {
        this.videosContainer = document.getElementById('videosContainer');
        this.statusFilter = document.getElementById('statusFilter');
        this.sortOrder = document.getElementById('sortOrder');
        this.searchInput = document.getElementById('searchInput');
        this.clearFiltersBtn = document.getElementById('clearFilters');
        this.refreshBtn = document.getElementById('refreshVideos');
        this.pagination = document.getElementById('videoPagination');
        
        // Modals
        this.videoDetailModal = new bootstrap.Modal(document.getElementById('videoDetailModal'));
        this.deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
        this.deleteVideoBtn = document.getElementById('deleteVideoBtn');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    }
    
    bindEvents() {
        // Filter events
        this.statusFilter.addEventListener('change', () => {
            this.currentFilters.status = this.statusFilter.value;
            this.currentPage = 1;
            this.loadVideos();
        });
        
        this.sortOrder.addEventListener('change', () => {
            this.currentFilters.sort = this.sortOrder.value;
            this.loadVideos();
        });
        
        this.searchInput.addEventListener('input', this.debounce(() => {
            this.currentFilters.search = this.searchInput.value;
            this.currentPage = 1;
            this.loadVideos();
        }, 500));
        
        this.clearFiltersBtn.addEventListener('click', () => {
            this.clearFilters();
        });
        
        this.refreshBtn.addEventListener('click', () => {
            this.loadVideos();
        });
        
        // Modal events
        this.deleteVideoBtn.addEventListener('click', () => {
            this.videoDetailModal.hide();
            this.deleteConfirmModal.show();
        });
        
        this.confirmDeleteBtn.addEventListener('click', () => {
            this.deleteVideo();
        });
    }
    
    async loadVideos() {
        try {
            this.showLoading();
            
            const params = new URLSearchParams({
                page: this.currentPage,
                per_page: 12
            });
            
            if (this.currentFilters.status) {
                params.append('status', this.currentFilters.status);
            }
            
            const response = await fetch(`/api/videos?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.videos = data.videos;
                this.renderVideos(data.videos);
                this.renderPagination(data.pagination);
            } else {
                this.showError('Lỗi khi tải danh sách video: ' + data.message);
            }
            
        } catch (error) {
            console.error('Error loading videos:', error);
            this.showError('Lỗi kết nối khi tải danh sách video');
        }
    }
    
    renderVideos(videos) {
        if (!videos || videos.length === 0) {
            this.videosContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-video"></i>
                    <h4>Chưa có video nào</h4>
                    <p>Hãy tạo video đầu tiên của bạn bằng cách chat với AI!</p>
                    <a href="/chat" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Tạo video mới
                    </a>
                </div>
            `;
            return;
        }
        
        const videosHtml = videos.map(video => this.renderVideoCard(video)).join('');
        
        this.videosContainer.innerHTML = `
            <div class="row">
                ${videosHtml}
            </div>
        `;
    }
    
    renderVideoCard(video) {
        const statusClass = this.getStatusClass(video.status);
        const statusText = this.getStatusText(video.status);
        const createdDate = new Date(video.created_at).toLocaleDateString('vi-VN');
        const fileSize = video.file_size ? this.formatFileSize(video.file_size) : 'N/A';
        
        return `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card video-card h-100">
                    <div class="video-thumbnail" onclick="videoManager.playVideo(${video.id})">
                        <i class="fas fa-video"></i>
                        <div class="play-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                        <span class="badge ${statusClass} video-status">${statusText}</span>
                    </div>
                    <div class="video-info">
                        <h6 class="video-title">${this.escapeHtml(video.title)}</h6>
                        <div class="video-meta">
                            <small>
                                <i class="fas fa-clock"></i> ${video.duration}s |
                                <i class="fas fa-calendar"></i> ${createdDate} |
                                <i class="fas fa-hdd"></i> ${fileSize}
                            </small>
                        </div>
                        <div class="video-topic">
                            ${this.escapeHtml(video.topic)}
                        </div>
                        <div class="video-actions">
                            <button class="btn btn-sm btn-outline-primary" onclick="videoManager.viewVideoDetail(${video.id})">
                                <i class="fas fa-eye"></i> Chi tiết
                            </button>
                            ${video.status === 'completed' ? `
                                <button class="btn btn-sm btn-outline-success" onclick="videoManager.downloadVideo(${video.id})">
                                    <i class="fas fa-download"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderPagination(pagination) {
        if (pagination.pages <= 1) {
            this.pagination.innerHTML = '';
            return;
        }
        
        let paginationHtml = '';
        
        // Previous button
        if (pagination.page > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="videoManager.goToPage(${pagination.page - 1})">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>
            `;
        }
        
        // Page numbers
        const startPage = Math.max(1, pagination.page - 2);
        const endPage = Math.min(pagination.pages, pagination.page + 2);
        
        for (let page = startPage; page <= endPage; page++) {
            const activeClass = page === pagination.page ? 'active' : '';
            paginationHtml += `
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" onclick="videoManager.goToPage(${page})">${page}</a>
                </li>
            `;
        }
        
        // Next button
        if (pagination.page < pagination.pages) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="videoManager.goToPage(${pagination.page + 1})">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;
        }
        
        this.pagination.innerHTML = paginationHtml;
    }
    
    async viewVideoDetail(videoId) {
        try {
            const response = await fetch(`/api/videos/${videoId}`);
            const data = await response.json();
            
            if (data.success) {
                this.selectedVideoId = videoId;
                this.renderVideoDetail(data.video);
                this.videoDetailModal.show();
            } else {
                this.showNotification('Lỗi khi tải chi tiết video: ' + data.message, 'danger');
            }
            
        } catch (error) {
            console.error('Error loading video detail:', error);
            this.showNotification('Lỗi kết nối khi tải chi tiết video', 'danger');
        }
    }
    
    renderVideoDetail(video) {
        const statusClass = this.getStatusClass(video.status);
        const statusText = this.getStatusText(video.status);
        const createdDate = new Date(video.created_at).toLocaleDateString('vi-VN');
        const fileSize = video.file_size ? this.formatFileSize(video.file_size) : 'N/A';
        
        const detailHtml = `
            <div class="row">
                <div class="col-md-6">
                    <div class="video-preview">
                        ${video.status === 'completed' ? `
                            <video controls class="w-100" style="max-height: 300px;">
                                <source src="/api/videos/${video.id}/file" type="video/mp4">
                                Trình duyệt không hỗ trợ video.
                            </video>
                        ` : `
                            <div class="video-placeholder">
                                <i class="fas fa-video fa-3x"></i>
                                <p class="mt-2">Video chưa sẵn sàng</p>
                            </div>
                        `}
                    </div>
                </div>
                <div class="col-md-6">
                    <h5>${this.escapeHtml(video.title)}</h5>
                    <p><strong>Chủ đề:</strong> ${this.escapeHtml(video.topic)}</p>
                    <p><strong>Trạng thái:</strong> <span class="badge ${statusClass}">${statusText}</span></p>
                    <p><strong>Thời lượng:</strong> ${video.duration} giây</p>
                    <p><strong>Kích thước:</strong> ${fileSize}</p>
                    <p><strong>Composition:</strong> ${video.composition}</p>
                    <p><strong>Background:</strong> ${video.background}</p>
                    <p><strong>Voice:</strong> ${video.voice}</p>
                    <p><strong>Ngày tạo:</strong> ${createdDate}</p>
                    
                    ${video.script ? `
                        <div class="mt-3">
                            <h6>Script:</h6>
                            <div class="bg-light p-3 rounded">
                                ${this.escapeHtml(video.script)}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('videoDetailContent').innerHTML = detailHtml;
    }
    
    async deleteVideo() {
        if (!this.selectedVideoId) return;
        
        try {
            const response = await fetch(`/api/videos/${this.selectedVideoId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.deleteConfirmModal.hide();
                this.showNotification('Video đã được xóa thành công', 'success');
                this.loadVideos(); // Reload the list
            } else {
                this.showNotification('Lỗi khi xóa video: ' + data.message, 'danger');
            }
            
        } catch (error) {
            console.error('Error deleting video:', error);
            this.showNotification('Lỗi kết nối khi xóa video', 'danger');
        }
    }
    
    playVideo(videoId) {
        this.viewVideoDetail(videoId);
    }
    
    downloadVideo(videoId) {
        const link = document.createElement('a');
        link.href = `/api/videos/${videoId}/file`;
        link.download = '';
        link.click();
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.loadVideos();
    }
    
    clearFilters() {
        this.statusFilter.value = '';
        this.sortOrder.value = 'newest';
        this.searchInput.value = '';
        
        this.currentFilters = {
            status: '',
            search: '',
            sort: 'newest'
        };
        
        this.currentPage = 1;
        this.loadVideos();
    }
    
    showLoading() {
        this.videosContainer.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Đang tải...</span>
                </div>
                <p class="mt-2">Đang tải danh sách video...</p>
            </div>
        `;
    }
    
    showError(message) {
        this.videosContainer.innerHTML = `
            <div class="alert alert-danger text-center">
                <i class="fas fa-exclamation-triangle"></i>
                <h5>Có lỗi xảy ra</h5>
                <p>${message}</p>
                <button class="btn btn-outline-danger" onclick="videoManager.loadVideos()">
                    <i class="fas fa-redo"></i> Thử lại
                </button>
            </div>
        `;
    }
    
    showNotification(message, type = 'info') {
        // Create Bootstrap toast notification
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        // Add to page
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        toastContainer.appendChild(toast);
        
        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Auto remove after hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    getStatusClass(status) {
        const classes = {
            'rendering': 'status-rendering',
            'completed': 'status-completed',
            'failed': 'status-failed'
        };
        return classes[status] || 'bg-secondary';
    }
    
    getStatusText(status) {
        const texts = {
            'rendering': 'Đang render',
            'completed': 'Hoàn thành',
            'failed': 'Thất bại'
        };
        return texts[status] || status;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize video manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.videoManager = new VideoManager();
}); 