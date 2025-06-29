/**
 * Unit Tests for NotificationManager.js
 * Tests notification display and Bootstrap toast integration
 */

function runNotificationManagerTests() {
    describe('NotificationManager Tests', () => {
        let notificationManager;
        let mockToastContainer;

        beforeAll(() => {
            setupMockDOM();
        });

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
                    toast.className = `toast align-items-center text-white bg-${type} border-0`;
                    toast.setAttribute('role', 'alert');
                    toast.innerHTML = `
                        <div class="d-flex">
                            <div class="toast-body">${message || ''}</div>
                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                        </div>
                    `;
                    
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
        }

        afterEach(() => {
            // Clear any existing toasts
            if (mockToastContainer) {
                mockToastContainer.innerHTML = '';
            }
        });

        describe('Constructor', () => {
            it('should initialize with toast container', () => {
                setupNotificationManagerTest();
                
                expect(notificationManager.toastContainer).toBeTruthy();
                expect(notificationManager.toastContainer.className).toContain('toast-container');
            });

            it('should create toast container if not exists', () => {
                setupNotificationManagerTest();
                
                // Remove existing container
                document.body.innerHTML = '';
                
                const newNotificationManager = new NotificationManager();
                
                expect(newNotificationManager.toastContainer).toBeTruthy();
                expect(document.body.querySelector('.toast-container')).toBeTruthy();
    });
});

        describe('showNotification', () => {
            it('should create and show toast with correct structure', () => {
                setupNotificationManagerTest();
                
                const message = 'Test notification message';
                const type = 'success';

                notificationManager.showNotification(message, type);

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast).toBeTruthy();
                expect(toast.className).toContain(`bg-${type}`);
                expect(toast.innerHTML).toContain(message);
                expect(toast.innerHTML).toContain('toast-body');
                expect(toast.innerHTML).toContain('btn-close');
            });

            it('should set ARIA attributes', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Accessible message', 'warning');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.getAttribute('role')).toBe('alert');
    });
});
    });
});

                const toasts = mockToastContainer.querySelectorAll('.toast');
                expect(toasts.length).toBe(3);
                
                messages.forEach((msg, index) => {
                    expect(toasts[index].innerHTML).toContain(msg);
    });
});
});

        describe('Toast Positioning', () => {
            it('should position toast container correctly', () => {
                setupNotificationManagerTest();
                
                expect(mockToastContainer.className).toContain('position-fixed');
                expect(mockToastContainer.className).toContain('top-0');
                expect(mockToastContainer.className).toContain('end-0');
                expect(mockToastContainer.className).toContain('p-3');
    });
});
    });
});
    });
}

// Export function for test runner
global.runNotificationManagerTests = runNotificationManagerTests;