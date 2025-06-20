// Utility functions
const Utils = {
    // Hiển thị loading spinner
    showLoading: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = '<div class="spinner mx-auto"></div>';
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
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        
        toast.className = `toast ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg mb-2`;
        toast.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button class="ml-4 text-white hover:text-gray-200" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
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
    }
};

// CrewAI API functions
const CrewAI = {
    // Tạo nội dung
    async createContent(topic) {
        Utils.showLoading('content-result');
        
        try {
            const result = await Utils.fetchAPI('/api/crewai/content', {
                method: 'POST',
                body: JSON.stringify({ topic })
            });
            
            if (result.success) {
                Utils.hideLoading('content-result', `
                    <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-green-800 mb-2">✅ Nội dung đã được tạo thành công!</h3>
                        <div class="bg-white rounded p-3 border">
                            <pre class="whitespace-pre-wrap text-sm">${result.result}</pre>
                        </div>
                    </div>
                `);
                Utils.showToast('Nội dung đã được tạo thành công!');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Utils.hideLoading('content-result', `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-red-800">❌ Lỗi</h3>
                    <p class="text-red-600">${error.message}</p>
                </div>
            `);
        }
    },

    // Phân tích dữ liệu
    async analyzeData(data, type = 'general') {
        Utils.showLoading('analysis-result');
        
        try {
            const result = await Utils.fetchAPI('/api/crewai/analyze', {
                method: 'POST',
                body: JSON.stringify({ data, type })
            });
            
            if (result.success) {
                Utils.hideLoading('analysis-result', `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 class="text-lg font-semibold text-blue-800 mb-2">📊 Kết quả phân tích</h3>
                        <div class="bg-white rounded p-3 border">
                            <pre class="whitespace-pre-wrap text-sm">${result.result}</pre>
                        </div>
                    </div>
                `);
                Utils.showToast('Phân tích đã hoàn thành!');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Utils.hideLoading('analysis-result', `
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 class="text-lg font-semibold text-red-800">❌ Lỗi</h3>
                    <p class="text-red-600">${error.message}</p>
                </div>
            `);
        }
    }
};

// Chat Application will be initialized by chat_modules.html

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Animate elements on load
    const animatedElements = document.querySelectorAll('.animate-fade-in');
    animatedElements.forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Setup form handlers
    const contentForm = document.getElementById('content-form');
    if (contentForm) {
        contentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const topic = document.getElementById('topic-input').value.trim();
            if (topic) {
                await CrewAI.createContent(topic);
            }
        });
    }

    const analysisForm = document.getElementById('analysis-form');
    if (analysisForm) {
        analysisForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = document.getElementById('data-input').value.trim();
            const type = document.getElementById('analysis-type').value;
            if (data) {
                await CrewAI.analyzeData(data, type);
            }
        });
    }

    // Health check
    const healthButton = document.getElementById('health-check-btn');
    if (healthButton) {
        healthButton.addEventListener('click', async () => {
            try {
                const result = await Utils.fetchAPI('/health');
                Utils.showToast(`Trạng thái: ${result.status}, Database: ${result.database}`);
            } catch (error) {
                // Error already handled in fetchAPI
            }
        });
    }
});