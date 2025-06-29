class NotificationManager {
    constructor() {
        this.toastContainer = null;
        this.initializeContainer();
    }
    
    initializeContainer() {
        this.toastContainer = document.querySelector('.toast-container');
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(this.toastContainer);
        }
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
        
        this.toastContainer.appendChild(toast);
        
        // Show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
        
        // Auto remove after hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'danger');
    }
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showInfo(message) {
        this.showNotification(message, 'info');
    }
}

// Export for test environment
if (typeof global !== 'undefined') {
    global.NotificationManager = NotificationManager;
} 