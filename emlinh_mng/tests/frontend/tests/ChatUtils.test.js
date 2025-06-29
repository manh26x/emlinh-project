/**
 * Unit Tests for ChatUtils.js
 * Tests utility functions for chat operations
 */

function runChatUtilsTests() {
    describe('ChatUtils Tests', () => {
        let mockChatManager;
        let originalNavigator;

        beforeAll(() => {
            setupMockDOM();
            originalNavigator = global.navigator;
        });

        beforeEach(() => {
            // Mock chatManager
            mockChatManager = {
                notificationManager: {
                    showSuccess: jest.fn(),
                    showError: jest.fn(),
                    showInfo: jest.fn()
                },
                sessionManager: {
                    getSessionId: () => 'test-session-123'
                },
                uiManager: {
                    formatMessage: jest.fn(msg => `formatted: ${msg}`)
                }
            };
            window.chatManager = mockChatManager;

            // Mock navigator clipboard
            global.navigator = {
                ...originalNavigator,
                clipboard: {
                    writeText: jest.fn(() => Promise.resolve())
                }
            };

            // Reset URL.createObjectURL and revokeObjectURL
            window.URL = {
                createObjectURL: jest.fn(() => 'blob:mock-url'),
                revokeObjectURL: jest.fn()
            };

            // Mock Blob
            window.Blob = jest.fn();
        });

        afterEach(() => {
            jest.clearAllMocks();
            // Clear any DOM modifications
            document.body.innerHTML = '<div class="toast-container position-fixed top-0 end-0 p-3"></div>';
        });

        afterAll(() => {
            global.navigator = originalNavigator;
        });

        describe('copyToClipboard', () => {
            it('should copy text to clipboard successfully', async () => {
                await ChatUtils.copyToClipboard('Test text to copy');

                expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test text to copy');
                expect(mockChatManager.notificationManager.showSuccess).toHaveBeenCalledWith(
                    'Đã sao chép vào clipboard'
                );
            });

            it('should handle clipboard API errors', async () => {
                navigator.clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard not available'));

                await ChatUtils.copyToClipboard('Failed copy');

                expect(mockChatManager.notificationManager.showError).toHaveBeenCalledWith(
                    'Lỗi khi sao chép'
                );
            });

            it('should work without chatManager', async () => {
                window.chatManager = null;

                await expect(ChatUtils.copyToClipboard('No manager')).resolves.not.toThrow();
                expect(navigator.clipboard.writeText).toHaveBeenCalledWith('No manager');
            });
        });

            });

            it('should work without chatManager', () => {
                window.chatManager = null;

                expect(() => ChatUtils.exportChat()).not.toThrow();
            });
        });

                const result = ChatUtils.reprocessMessages();

                expect(result).toBe(2); // Two messages should be processed
                expect(mockChatManager.uiManager.formatMessage).toHaveBeenCalledTimes(4);
                expect(mockChatManager.notificationManager.showSuccess).toHaveBeenCalledWith(
                    '✅ Đã hiển thị 2 video trong chat'
                );
            });

        });

        describe('escapeHtml', () => {
            it('should escape HTML characters', () => {
                const input = '<script>alert("xss")</script>&<>"\'';
                const result = ChatUtils.escapeHtml(input);
                
                expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;&amp;&lt;&gt;"\'');
            });

            it('should handle empty string', () => {
                expect(ChatUtils.escapeHtml('')).toBe('');
            });

            it('should handle normal text', () => {
                expect(ChatUtils.escapeHtml('Normal text')).toBe('Normal text');
            });
        });

        describe('formatTimestamp', () => {
            it('should format ISO timestamp to Vietnamese time', () => {
                const timestamp = '2023-01-01T15:30:45Z';
                const result = ChatUtils.formatTimestamp(timestamp);
                
                // Should contain time in HH:MM:SS format
                expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
            });

            it('should return current time for null timestamp', () => {
                const result = ChatUtils.formatTimestamp(null);
                
                expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
            });

            it('should return current time for undefined timestamp', () => {
                const result = ChatUtils.formatTimestamp(undefined);
                
                expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
            });
        });

            it('should generate random ID with default prefix', () => {
                const id = ChatUtils.generateRandomId();
                
                expect(id).toContain('id_');
            });

            it('should generate unique IDs', () => {
                const id1 = ChatUtils.generateRandomId('unique');
                const id2 = ChatUtils.generateRandomId('unique');
                
                expect(id1).not.toBe(id2);
            });
        });

            afterEach(() => {
                jest.useRealTimers();
            });

        });

            afterEach(() => {
                jest.useRealTimers();
            });

            it('should ignore calls during throttle period', () => {
                const mockFn = jest.fn();
                const throttledFn = ChatUtils.throttle(mockFn, 100);

                throttledFn('first');
                throttledFn('ignored1');
                throttledFn('ignored2');

                jest.advanceTimersByTime(50);
                throttledFn('ignored3');

                expect(mockFn).toHaveBeenCalledTimes(1);
                expect(mockFn).toHaveBeenCalledWith('first');
            });
        });

            it('should handle missing chatManager', () => {
                window.chatManager = null;

                expect(() => ChatUtils.addTestVideoMessage()).not.toThrow();
            });
        });

        describe('Global Function Exports', () => {
            it('should export functions to global scope', () => {
                expect(window.copyToClipboard).toBe(ChatUtils.copyToClipboard);
                expect(window.exportChat).toBe(ChatUtils.exportChat);
                expect(window.reprocessMessages).toBe(ChatUtils.reprocessMessages);
                expect(window.addTestVideoMessage).toBe(ChatUtils.addTestVideoMessage);
            });
        });

        describe('Edge Cases', () => {
            it('should handle DOM manipulation errors gracefully', () => {
                // Mock querySelector to throw error
                const originalQuerySelector = document.querySelector;
                document.querySelector = () => { throw new Error('DOM error'); };

                expect(() => ChatUtils.reprocessMessages()).not.toThrow();

                // Restore
                document.querySelector = originalQuerySelector;
            });

            it('should handle missing DOM elements in exportChat', () => {
                document.body.innerHTML = '';
                
                expect(() => ChatUtils.exportChat()).not.toThrow();
            });

            it('should handle very large debounce/throttle delays', () => {
                jest.useFakeTimers();
                
                const mockFn = jest.fn();
                const debouncedFn = ChatUtils.debounce(mockFn, 999999);
                
                debouncedFn('test');
                jest.advanceTimersByTime(1000);
                
                expect(mockFn).not.toHaveBeenCalled();
                
                jest.useRealTimers();
            });
        });
    });
}

// Export function for test runner
global.runChatUtilsTests = runChatUtilsTests;