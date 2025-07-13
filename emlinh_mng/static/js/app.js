// Utility functions
const Utils = {
    // Hiển thị loading spinner
    showLoading: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Đang tải...</span></div></div>';
        }
    },

    // Ẩn loading spinner
    hideLoading: (elementId, content = '') => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = content;
        }
    },

    // Hiển thị toast notification
    showToast: (message, type = 'success') => {
        // Create toast element
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'alert-success' : 'alert-danger';
        
        toast.className = `alert ${bgColor} alert-dismissible fade show position-fixed`;
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    },

    // Fetch wrapper với error handling
    fetchAPI: async (url, options = {}) => {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            Utils.showToast(error.message, 'error');
            throw error;
        }
    },

    // Format datetime
    formatDateTime: (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    },

    // Check system health
    checkHealth: async () => {
        try {
            const result = await Utils.fetchAPI('/health');
            if (result.status === 'healthy') {
                Utils.showToast(`✅ Hệ thống hoạt động bình thường. Database: ${result.database}`);
                return true;
            } else {
                Utils.showToast('❌ Hệ thống có vấn đề', 'error');
                return false;
            }
        } catch (error) {
            Utils.showToast('❌ Không thể kết nối với server', 'error');
            return false;
        }
    }
};

// Video Management class (constructor compatible) - Backup implementation
class VideoManagerBackup {
    constructor(notificationManager = null, uiManager = null) {
        this.notificationManager = notificationManager;
        this.uiManager = uiManager;
    }

    // Play video in modal
    playVideo(videoUrl, title = 'Video') {
        const modalHtml = `
            <div class="modal fade" id="videoPlayerModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <video controls class="w-100" style="max-height: 70vh;">
                                <source src="${videoUrl}" type="video/mp4">
                                Trình duyệt của bạn không hỗ trợ video.
                            </video>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('videoPlayerModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add new modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('videoPlayerModal'));
        modal.show();
        
        // Clean up when modal is hidden
        document.getElementById('videoPlayerModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    // Download video
    downloadVideo(videoUrl, filename) {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Create video (placeholder for compatibility)
    createVideo(topic, duration, composition, background, voice) {
        if (this.notificationManager) {
            this.notificationManager.showInfo('Tính năng tạo video đang được phát triển...');
        } else {
            Utils.showToast('Tính năng tạo video đang được phát triển...', 'info');
        }
    }

    // View video detail (placeholder for compatibility)
    viewVideoDetail(videoId) {
        if (this.notificationManager) {
            this.notificationManager.showInfo(`Xem chi tiết video ${videoId}`);
        } else {
            Utils.showToast(`Xem chi tiết video ${videoId}`, 'info');
        }
    }
}

// Chat utilities for compatibility
const AppChatUtils = {
    // Generate session ID
    generateSessionId: () => {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Scroll chat to bottom
    scrollToBottom: (containerId = 'messagesContainer') => {
        const container = document.getElementById(containerId);
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    },

    // Format message time
    formatMessageTime: (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('vi-VN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Emlinh AI Assistant loaded');

    // Health check functionality
    const healthButtons = document.querySelectorAll('[id*="health"]');
    healthButtons.forEach(button => {
        button.addEventListener('click', Utils.checkHealth);
    });

    // Initialize smooth animations
    const animatedElements = document.querySelectorAll('.animate-fade-in');
    animatedElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease-out';
        
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Global error handler for better UX
    window.addEventListener('error', function(e) {
        console.error('Application error:', e.error);
        Utils.showToast('Đã xảy ra lỗi trong ứng dụng', 'error');
    });

    // Auto health check on page load (after 2 seconds)
    setTimeout(() => {
        const statusElement = document.getElementById('system-status');
        if (statusElement) {
            Utils.checkHealth().then(isHealthy => {
                if (isHealthy) {
                    statusElement.textContent = '✅ Hoạt động tốt';
                    statusElement.className = 'text-success text-sm';
                } else {
                    statusElement.textContent = '❌ Có lỗi';
                    statusElement.className = 'text-danger text-sm';
                }
            });
        }
    }, 2000);

    console.log('✨ All systems initialized');
});

// Export utilities for use in other modules
window.EmlinlhUtils = Utils;
// VideoManager will be loaded from modules/VideoManager.js
window.AppChatUtils = AppChatUtils;