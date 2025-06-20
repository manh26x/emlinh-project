class IdeaManager {
    constructor() {
        this.recentIdeas = document.getElementById('recentIdeas');
        this.bindEvents();
        this.loadRecentIdeas();
    }
    
    bindEvents() {
        // Listen for ideas update events
        window.addEventListener('ideasUpdated', () => {
            this.loadRecentIdeas();
        });
    }
    
    async loadRecentIdeas() {
        try {
            const response = await fetch('/api/ideas?per_page=5');
            const data = await response.json();
            
            if (data.success && data.ideas.length > 0) {
                this.displayRecentIdeas(data.ideas);
            } else {
                this.displayEmptyState();
            }
        } catch (error) {
            console.error('Error loading ideas:', error);
            this.displayErrorState();
        }
    }
    
    displayRecentIdeas(ideas) {
        if (!this.recentIdeas) return;
        
        const ideasHtml = ideas.map(idea => `
            <div class="idea-item mb-2 p-2 border rounded small">
                <div class="fw-bold text-truncate">${this.escapeHtml(idea.title)}</div>
                <div class="text-muted small">
                    <span class="badge bg-${this.getStatusColor(idea.status)} idea-badge">${idea.status}</span>
                    ${idea.content_type || 'general'}
                </div>
            </div>
        `).join('');
        
        this.recentIdeas.innerHTML = ideasHtml;
    }
    
    displayEmptyState() {
        if (!this.recentIdeas) return;
        this.recentIdeas.innerHTML = '<p class="text-muted small">Chưa có ý tưởng nào được tạo</p>';
    }
    
    displayErrorState() {
        if (!this.recentIdeas) return;
        this.recentIdeas.innerHTML = '<p class="text-danger small">Lỗi khi tải ý tưởng</p>';
    }
    
    getStatusColor(status) {
        const colors = {
            'draft': 'secondary',
            'in_progress': 'warning',
            'completed': 'success',
            'published': 'primary'
        };
        return colors[status] || 'secondary';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
} 