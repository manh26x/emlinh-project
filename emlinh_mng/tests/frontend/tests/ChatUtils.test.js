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

        describe('exportChat', () => {
            beforeEach(() => {
                // Create mock messages in DOM
                document.body.innerHTML = `
                    <div class="toast-container position-fixed top-0 end-0 p-3"></div>
                    <div class="message user-message">
                        <div class="message-content">
                            <div>User message 1</div>
                        </div>
                        <small>12:34:56</small>
                    </div>
                    <div class="message ai-message">
                        <div class="message-content">
                            <div>AI response 1</div>
                        </div>
                        <small>12:35:01</small>
                    </div>
                    <div class="message user-message">
                        <div class="message-content">
                            <div>User message 2</div>
                        </div>
                        <small>12:35:30</small>
                    </div>
                `;

                // Mock link click
                const mockLink = {
                    href: '',
                    download: '',
                    click: jest.fn()
                };
                document.createElement = jest.fn(() => mockLink);
            });

            it('should export chat messages to JSON file', () => {
                ChatUtils.exportChat();

                const expectedData = [
                    {
                        type: 'user',
                        content: 'User message 1',
                        timestamp: '12:34:56'
                    },
                    {
                        type: 'ai', 
                        content: 'AI response 1',
                        timestamp: '12:35:01'
                    },
                    {
                        type: 'user',
                        content: 'User message 2',
                        timestamp: '12:35:30'
                    }
                ];

                expect(window.Blob).toHaveBeenCalledWith(
                    [JSON.stringify(expectedData, null, 2)],
                    { type: 'application/json' }
                );
                expect(window.URL.createObjectURL).toHaveBeenCalled();
                expect(document.createElement).toHaveBeenCalledWith('a');
                expect(mockChatManager.notificationManager.showSuccess).toHaveBeenCalledWith(
                    'Đã export chat thành công'
                );
                expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
            });

            it('should handle export with no messages', () => {
                document.body.innerHTML = '<div class="toast-container position-fixed top-0 end-0 p-3"></div>';

                expect(() => ChatUtils.exportChat()).not.toThrow();
                expect(window.Blob).toHaveBeenCalledWith(['[]'], { type: 'application/json' });
            });

            it('should work without chatManager', () => {
                window.chatManager = null;

                expect(() => ChatUtils.exportChat()).not.toThrow();
            });
        });

        describe('reprocessMessages', () => {
            beforeEach(() => {
                // Create mock AI messages
                document.body.innerHTML = `
                    <div class="toast-container position-fixed top-0 end-0 p-3"></div>
                    <div class="ai-message">
                        <div class="message-content">
                            <div>Regular message without video</div>
                        </div>
                    </div>
                    <div class="ai-message">
                        <div class="message-content">
                            <div>Video message with ID: 123</div>
                        </div>
                    </div>
                    <div class="ai-message">
                        <div class="message-content">
                            <div>Check video at /videos/456</div>
                        </div>
                    </div>
                    <div class="ai-message">
                        <div class="message-content">
                            <div class="existing-embed">Already has video-embed-container</div>
                        </div>
                    </div>
                `;
            });

            it('should reprocess messages and add video embeds', () => {
                mockChatManager.uiManager.formatMessage = jest.fn()
                    .mockImplementation(msg => {
                        if (msg.includes('Video ID: 123') || msg.includes('/videos/456')) {
                            return `${msg}<div class="video-embed-container">Video embed</div>`;
                        }
                        return msg;
                    });

                const result = ChatUtils.reprocessMessages();

                expect(result).toBe(2); // Two messages should be processed
                expect(mockChatManager.uiManager.formatMessage).toHaveBeenCalledTimes(4);
                expect(mockChatManager.notificationManager.showSuccess).toHaveBeenCalledWith(
                    '✅ Đã hiển thị 2 video trong chat'
                );
            });

            it('should handle no video messages found', () => {
                document.body.innerHTML = `
                    <div class="toast-container position-fixed top-0 end-0 p-3"></div>
                    <div class="ai-message">
                        <div class="message-content">
                            <div>Just a regular message</div>
                        </div>
                    </div>
                `;

                const result = ChatUtils.reprocessMessages();

                expect(result).toBe(0);
                expect(mockChatManager.notificationManager.showInfo).toHaveBeenCalledWith(
                    'ℹ️ Không tìm thấy tin nhắn video mới để hiển thị. Kiểm tra Console (F12) để xem chi tiết.'
                );
            });

            it('should handle missing UIManager', () => {
                window.chatManager = { notificationManager: mockChatManager.notificationManager };

                expect(() => ChatUtils.reprocessMessages()).not.toThrow();
            });

            it('should not reprocess already embedded videos', () => {
                // Mock messages with existing embeds
                const mockMessage = document.createElement('div');
                mockMessage.innerHTML = '<div class="video-embed-container">Already embedded</div>';
                mockMessage.textContent = 'Video ID: 123';
                
                document.querySelector('.ai-message .message-content div').replaceWith(mockMessage);

                const result = ChatUtils.reprocessMessages();

                // Should not process the message that already has embed
                expect(result).toBe(1); // Only process messages without existing embeds
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

        describe('generateRandomId', () => {
            it('should generate random ID with prefix', () => {
                const id = ChatUtils.generateRandomId('test');
                
                expect(id).toContain('test_');
                expect(id.length).toBeGreaterThan(10);
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

        describe('debounce', () => {
            beforeEach(() => {
                jest.useFakeTimers();
            });

            afterEach(() => {
                jest.useRealTimers();
            });

            it('should debounce function calls', () => {
                const mockFn = jest.fn();
                const debouncedFn = ChatUtils.debounce(mockFn, 100);

                debouncedFn('call1');
                debouncedFn('call2');
                debouncedFn('call3');

                expect(mockFn).not.toHaveBeenCalled();

                jest.advanceTimersByTime(100);

                expect(mockFn).toHaveBeenCalledTimes(1);
                expect(mockFn).toHaveBeenCalledWith('call3');
            });

            it('should reset timer on new calls', () => {
                const mockFn = jest.fn();
                const debouncedFn = ChatUtils.debounce(mockFn, 100);

                debouncedFn('call1');
                jest.advanceTimersByTime(50);
                debouncedFn('call2');
                jest.advanceTimersByTime(50);

                expect(mockFn).not.toHaveBeenCalled();

                jest.advanceTimersByTime(50);

                expect(mockFn).toHaveBeenCalledTimes(1);
                expect(mockFn).toHaveBeenCalledWith('call2');
            });
        });

        describe('throttle', () => {
            beforeEach(() => {
                jest.useFakeTimers();
            });

            afterEach(() => {
                jest.useRealTimers();
            });

            it('should throttle function calls', () => {
                const mockFn = jest.fn();
                const throttledFn = ChatUtils.throttle(mockFn, 100);

                throttledFn('call1');
                throttledFn('call2');
                throttledFn('call3');

                expect(mockFn).toHaveBeenCalledTimes(1);
                expect(mockFn).toHaveBeenCalledWith('call1');

                jest.advanceTimersByTime(100);

                throttledFn('call4');
                expect(mockFn).toHaveBeenCalledTimes(2);
                expect(mockFn).toHaveBeenCalledWith('call4');
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

        describe('addTestVideoMessage', () => {
            it('should add test video message', () => {
                ChatUtils.addTestVideoMessage();

                expect(mockChatManager.uiManager.addAIMessage).toHaveBeenCalledWith(
                    expect.stringContaining('Video đã được tạo thành công'),
                    expect.any(String)
                );
                expect(mockChatManager.notificationManager.showSuccess).toHaveBeenCalledWith(
                    '✅ Đã thêm tin nhắn test video'
                );
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

            it('should handle invalid timestamp formats', () => {
                const result1 = ChatUtils.formatTimestamp('invalid-date');
                const result2 = ChatUtils.formatTimestamp('');
                
                expect(result1).toMatch(/\d{1,2}:\d{2}:\d{2}/);
                expect(result2).toMatch(/\d{1,2}:\d{2}:\d{2}/);
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
window.runChatUtilsTests = runChatUtilsTests;