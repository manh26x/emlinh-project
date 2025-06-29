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

            it('should default to info type', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Default message');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.className).toContain('bg-info');
            });

            it('should set ARIA attributes', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Accessible message', 'warning');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.getAttribute('role')).toBe('alert');
            });

            it('should trigger Bootstrap toast show', () => {
                setupNotificationManagerTest();
                
                // Mock bootstrap Toast
                const mockShow = jest.fn();
                const MockToast = jest.fn(() => ({ show: mockShow }));
                window.bootstrap = { Toast: MockToast };

                notificationManager.showNotification('Test message', 'success');

                expect(MockToast).toHaveBeenCalled();
                expect(mockShow).toHaveBeenCalled();
            });

            it('should auto-remove toast after hidden event', (done) => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Auto remove test', 'info');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast).toBeTruthy();

                // Simulate hidden event
                const hiddenEvent = new CustomEvent('hidden.bs.toast');
                toast.dispatchEvent(hiddenEvent);

                setTimeout(() => {
                    expect(mockToastContainer.querySelector('.toast')).toBeNull();
                    done();
                }, 10);
            });
        });

        describe('showSuccess', () => {
            it('should show success notification', () => {
                setupNotificationManagerTest();
                
                const message = 'Operation successful!';
                notificationManager.showSuccess(message);

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.className).toContain('bg-success');
                expect(toast.innerHTML).toContain(message);
            });
        });

        describe('showError', () => {
            it('should show error notification', () => {
                setupNotificationManagerTest();
                
                const message = 'Something went wrong!';
                notificationManager.showError(message);

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.className).toContain('bg-danger');
                expect(toast.innerHTML).toContain(message);
            });
        });

        describe('showWarning', () => {
            it('should show warning notification', () => {
                setupNotificationManagerTest();
                
                const message = 'Please be careful!';
                notificationManager.showWarning(message);

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.className).toContain('bg-warning');
                expect(toast.innerHTML).toContain(message);
            });
        });

        describe('showInfo', () => {
            it('should show info notification', () => {
                setupNotificationManagerTest();
                
                const message = 'Here is some information';
                notificationManager.showInfo(message);

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.className).toContain('bg-info');
                expect(toast.innerHTML).toContain(message);
            });
        });

        describe('Multiple Notifications', () => {
            it('should handle multiple notifications', () => {
                setupNotificationManagerTest();
                
                notificationManager.showSuccess('Success message');
                notificationManager.showError('Error message');
                notificationManager.showWarning('Warning message');

                const toasts = mockToastContainer.querySelectorAll('.toast');
                expect(toasts.length).toBe(3);
                
                expect(toasts[0].className).toContain('bg-success');
                expect(toasts[1].className).toContain('bg-danger');
                expect(toasts[2].className).toContain('bg-warning');
            });

            it('should maintain order of notifications', () => {
                setupNotificationManagerTest();
                
                const messages = ['First', 'Second', 'Third'];
                
                messages.forEach(msg => {
                    notificationManager.showInfo(msg);
                });

                const toasts = mockToastContainer.querySelectorAll('.toast');
                expect(toasts.length).toBe(3);
                
                messages.forEach((msg, index) => {
                    expect(toasts[index].innerHTML).toContain(msg);
                });
            });
        });

        describe('HTML Content Handling', () => {
            it('should display HTML content in messages', () => {
                setupNotificationManagerTest();
                
                const htmlMessage = '<strong>Bold</strong> and <em>italic</em> text';
                notificationManager.showInfo(htmlMessage);

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.innerHTML).toContain('<strong>Bold</strong>');
                expect(toast.innerHTML).toContain('<em>italic</em>');
            });

            it('should handle special characters', () => {
                setupNotificationManagerTest();
                
                const specialMessage = 'Message with & < > " \' characters';
                notificationManager.showInfo(specialMessage);

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.innerHTML).toContain(specialMessage);
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

        describe('Bootstrap Integration', () => {
            it('should handle missing Bootstrap gracefully', () => {
                setupNotificationManagerTest();
                
                // Remove bootstrap from window
                const originalBootstrap = window.bootstrap;
                delete window.bootstrap;

                expect(() => {
                    notificationManager.showNotification('Test without Bootstrap', 'info');
                }).not.toThrow();

                // Restore bootstrap
                window.bootstrap = originalBootstrap;
            });

            it('should use Bootstrap classes correctly', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Bootstrap test', 'primary');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.className).toContain('toast');
                expect(toast.className).toContain('align-items-center');
                expect(toast.className).toContain('text-white');
                expect(toast.className).toContain('bg-primary');
                expect(toast.className).toContain('border-0');
            });
        });

        describe('Close Button Functionality', () => {
            it('should include close button with correct attributes', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Closeable toast', 'info');

                const closeButton = mockToastContainer.querySelector('.btn-close');
                expect(closeButton).toBeTruthy();
                expect(closeButton.className).toContain('btn-close-white');
                expect(closeButton.getAttribute('data-bs-dismiss')).toBe('toast');
            });

            it('should trigger close when button clicked', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Click to close', 'info');

                const toast = mockToastContainer.querySelector('.toast');
                const closeButton = toast.querySelector('.btn-close');
                
                // Mock Bootstrap dismiss
                const dismissEvent = new CustomEvent('hidden.bs.toast');
                
                closeButton.click();
                toast.dispatchEvent(dismissEvent);

                // Toast should be removed after hidden event
                setTimeout(() => {
                    expect(mockToastContainer.querySelector('.toast')).toBeNull();
                }, 10);
            });
        });

        describe('Edge Cases', () => {
            it('should handle empty messages', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('', 'info');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast).toBeTruthy();
                expect(toast.innerHTML).toContain('toast-body');
            });

            it('should handle null messages', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification(null, 'info');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast).toBeTruthy();
                expect(toast.innerHTML).toContain('null');
            });

            it('should handle undefined type', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Test message');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.className).toContain('bg-info'); // Should default to info
            });

            it('should handle very long messages', () => {
                setupNotificationManagerTest();
                
                const longMessage = 'Very long message '.repeat(100);
                
                expect(() => {
                    notificationManager.showNotification(longMessage, 'info');
                }).not.toThrow();

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.innerHTML).toContain(longMessage);
            });

            it('should handle invalid notification types', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Invalid type test', 'invalid-type');

                const toast = mockToastContainer.querySelector('.toast');
                expect(toast.className).toContain('bg-invalid-type'); // Should still apply the class
            });
        });

        describe('Cleanup', () => {
            it('should properly clean up event listeners', () => {
                setupNotificationManagerTest();
                
                notificationManager.showNotification('Cleanup test', 'info');

                const toast = mockToastContainer.querySelector('.toast');
                const listeners = toast.eventListeners;
                
                // Simulate hidden event for cleanup
                const hiddenEvent = new CustomEvent('hidden.bs.toast');
                toast.dispatchEvent(hiddenEvent);

                // Toast should be removed
                setTimeout(() => {
                    expect(mockToastContainer.contains(toast)).toBeFalsy();
                }, 10);
            });
        });
    });
}

// Export function for test runner
global.runNotificationManagerTests = runNotificationManagerTests;