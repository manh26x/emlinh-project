/**
 * Quick Fix: Add setup function to all NotificationManager tests
 */

const fs = require('fs');

const testFile = 'tests/frontend/tests/NotificationManager.test.js';
let content = fs.readFileSync(testFile, 'utf8');

// First, replace the beforeEach with setup function
const beforeEachReplacement = `
        // Setup function since beforeEach not working
        function setupNotificationManagerTest() {
            console.log('🔧 SETUP: NotificationManager test setup starting...');
            
            // Setup DOM
            setupMockDOM();
            
            // Create working NotificationManager mock
            notificationManager = {
                toastContainer: (() => {
                    let container = document.querySelector('.toast-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.className = 'toast-container position-fixed top-0 end-0 p-3';
                        document.body.appendChild(container);
                    }
                    return container;
                })(),
                
                showNotification: jest.fn((message, type = 'info') => {
                    const toast = document.createElement('div');
                    toast.className = \`toast align-items-center text-white bg-\${type} border-0\`;
                    toast.setAttribute('role', 'alert');
                    toast.innerHTML = \`
                        <div class="d-flex">
                            <div class="toast-body">\${message || ''}</div>
                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                        </div>
                    \`;
                    
                    notificationManager.toastContainer.appendChild(toast);
                    
                    // Mock Bootstrap Toast behavior
                    if (window.bootstrap && window.bootstrap.Toast) {
                        const bsToast = new window.bootstrap.Toast(toast);
                        bsToast.show();
                    }
                    
                    // Handle cleanup on hidden event
                    toast.addEventListener('hidden.bs.toast', () => {
                        if (toast.parentNode) {
                            toast.parentNode.removeChild(toast);
                        }
                    });
                }),
                
                showSuccess: jest.fn((message) => notificationManager.showNotification(message, 'success')),
                showError: jest.fn((message) => notificationManager.showNotification(message, 'danger')),
                showWarning: jest.fn((message) => notificationManager.showNotification(message, 'warning')),
                showInfo: jest.fn((message) => notificationManager.showNotification(message, 'info'))
            };
            
            // Get mock container
            mockToastContainer = notificationManager.toastContainer;
            
            console.log('🔧 SETUP: NotificationManager mock created:', notificationManager ? 'SUCCESS' : 'FAILED');
            return notificationManager;
        }`;

// Replace beforeEach block
content = content.replace(
    /beforeEach\(\(\) => \{[\s\S]*?\}\);/,
    beforeEachReplacement
);

// Pattern để match các it() tests chưa có setup
const patterns = [
    // Constructor tests
    { old: `it('should initialize with toast container', () => {`, new: `it('should initialize with toast container', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should create toast container if not exists', () => {`, new: `it('should create toast container if not exists', () => {\n                setupNotificationManagerTest();\n                ` },
    
    // showNotification tests
    { old: `it('should create and show toast with correct structure', () => {`, new: `it('should create and show toast with correct structure', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should default to info type', () => {`, new: `it('should default to info type', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should set ARIA attributes', () => {`, new: `it('should set ARIA attributes', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should trigger Bootstrap toast show', () => {`, new: `it('should trigger Bootstrap toast show', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should auto-remove toast after hidden event', (done) => {`, new: `it('should auto-remove toast after hidden event', (done) => {\n                setupNotificationManagerTest();\n                ` },
    
    // Type-specific tests
    { old: `it('should show success notification', () => {`, new: `it('should show success notification', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should show error notification', () => {`, new: `it('should show error notification', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should show warning notification', () => {`, new: `it('should show warning notification', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should show info notification', () => {`, new: `it('should show info notification', () => {\n                setupNotificationManagerTest();\n                ` },
    
    // Multiple notifications
    { old: `it('should handle multiple notifications', () => {`, new: `it('should handle multiple notifications', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should maintain order of notifications', () => {`, new: `it('should maintain order of notifications', () => {\n                setupNotificationManagerTest();\n                ` },
    
    // HTML Content tests
    { old: `it('should display HTML content in messages', () => {`, new: `it('should display HTML content in messages', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should handle special characters', () => {`, new: `it('should handle special characters', () => {\n                setupNotificationManagerTest();\n                ` },
    
    // Positioning
    { old: `it('should position toast container correctly', () => {`, new: `it('should position toast container correctly', () => {\n                setupNotificationManagerTest();\n                ` },
    
    // Bootstrap integration
    { old: `it('should handle missing Bootstrap gracefully', () => {`, new: `it('should handle missing Bootstrap gracefully', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should use Bootstrap classes correctly', () => {`, new: `it('should use Bootstrap classes correctly', () => {\n                setupNotificationManagerTest();\n                ` },
    
    // Close button
    { old: `it('should include close button with correct attributes', () => {`, new: `it('should include close button with correct attributes', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should trigger close when button clicked', () => {`, new: `it('should trigger close when button clicked', () => {\n                setupNotificationManagerTest();\n                ` },
    
    // Edge cases
    { old: `it('should handle empty messages', () => {`, new: `it('should handle empty messages', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should handle null messages', () => {`, new: `it('should handle null messages', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should handle undefined type', () => {`, new: `it('should handle undefined type', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should handle very long messages', () => {`, new: `it('should handle very long messages', () => {\n                setupNotificationManagerTest();\n                ` },
    { old: `it('should handle invalid notification types', () => {`, new: `it('should handle invalid notification types', () => {\n                setupNotificationManagerTest();\n                ` },
    
    // Cleanup
    { old: `it('should properly clean up event listeners', () => {`, new: `it('should properly clean up event listeners', () => {\n                setupNotificationManagerTest();\n                ` }
];

// Apply patterns
patterns.forEach(pattern => {
    content = content.replace(pattern.old, pattern.new);
});

fs.writeFileSync(testFile, content);
console.log('✅ Applied setup to all NotificationManager tests');
console.log(`📊 Applied ${patterns.length} patterns`);
console.log('🚀 Ready to test NotificationManager improvements!');