/**
 * Unit Tests for UIManager.js
 * Tests UI management, message display, and formatting
 */

function runUIManagerTests() {
    describe('UIManager Tests', () => {
        let uiManager;
        let mockElements;

        beforeAll(() => {
            setupMockDOM();
        });

        beforeEach(() => {
            // Reset DOM mock
            setupMockDOM();
            
            // Create UIManager instance
            uiManager = new UIManager();

            // Get mock elements for testing
            mockElements = {
                chatForm: document.getElementById('chatForm'),
                messageInput: document.getElementById('messageInput'),
                sendButton: document.getElementById('sendButton'),
                chatMessages: document.getElementById('chatMessages'),
                messagesContainer: document.getElementById('messagesContainer'),
                typingIndicator: document.getElementById('typingIndicator')
            };
        });

        describe('Constructor', () => {
            it('should initialize DOM elements correctly', () => {
                expect(uiManager.chatForm).toBe(mockElements.chatForm);
                expect(uiManager.messageInput).toBe(mockElements.messageInput);
                expect(uiManager.sendButton).toBe(mockElements.sendButton);
                expect(uiManager.chatMessages).toBe(mockElements.chatMessages);
                expect(uiManager.messagesContainer).toBe(mockElements.messagesContainer);
                expect(uiManager.typingIndicator).toBe(mockElements.typingIndicator);
            });
        });

        describe('addUserMessage', () => {
            it('should add user message with correct format', () => {
                const testMessage = 'Hello, this is a test message!';
                uiManager.addUserMessage(testMessage);

                expect(mockElements.chatMessages.innerHTML).toContain('user-message');
                expect(mockElements.chatMessages.innerHTML).toContain('bg-primary text-white');
                expect(mockElements.chatMessages.innerHTML).toContain('Hello, this is a test message!');
                expect(mockElements.chatMessages.innerHTML).toContain('👤');
            });

            it('should escape HTML in user messages', () => {
                const maliciousMessage = '<script>alert("hack")</script>';
                uiManager.addUserMessage(maliciousMessage);

                expect(mockElements.chatMessages.innerHTML).not.toContain('<script>');
                expect(mockElements.chatMessages.innerHTML).toContain('&lt;script&gt;');
            });

            it('should include timestamp', () => {
                uiManager.addUserMessage('Test message');
                
                // Check if timestamp format is present (Vietnamese time format)
                expect(mockElements.chatMessages.innerHTML).toMatch(/\d{1,2}:\d{2}:\d{2}/);
            });
        });

        describe('addAIMessage', () => {
            it('should add AI message with correct format', () => {
                const testMessage = 'This is an AI response';
                const timestamp = '2023-01-01T12:00:00Z';
                
                uiManager.addAIMessage(testMessage, timestamp);

                expect(mockElements.chatMessages.innerHTML).toContain('ai-message');
                expect(mockElements.chatMessages.innerHTML).toContain('bg-light');
                expect(mockElements.chatMessages.innerHTML).toContain('This is an AI response');
                expect(mockElements.chatMessages.innerHTML).toContain('🤖');
            });

            it('should format message content', () => {
                const formatMessageSpy = jest.fn().mockReturnValue('formatted message');
                uiManager.formatMessage = formatMessageSpy;

                uiManager.addAIMessage('test message', null);

                expect(formatMessageSpy).toHaveBeenCalledWith('test message');
                expect(mockElements.chatMessages.innerHTML).toContain('formatted message');
            });

            it('should handle timestamp conversion', () => {
                const timestamp = '2023-01-01T12:00:00Z';
                uiManager.addAIMessage('test', timestamp);

                // Should contain time in Vietnamese format
                expect(mockElements.chatMessages.innerHTML).toMatch(/\d{1,2}:\d{2}:\d{2}/);
            });
        });

        describe('addAIMessageWithVideo', () => {
            it('should add AI message with video content', () => {
                const message = 'Here is your video';
                const videoHtml = '<div class="video-player">Video content</div>';
                const videoData = { id: 1, title: 'Test Video' };

                uiManager.addAIMessageWithVideo(message, videoHtml, videoData);

                expect(mockElements.chatMessages.innerHTML).toContain('Here is your video');
                expect(mockElements.chatMessages.innerHTML).toContain('video-player');
                expect(mockElements.chatMessages.innerHTML).toContain('Video content');
            });
        });

        describe('formatMessage', () => {
            it('should convert line breaks to <br>', () => {
                const message = 'Line 1\nLine 2\nLine 3';
                const result = uiManager.formatMessage(message);
                
                expect(result).toContain('Line 1<br>Line 2<br>Line 3');
            });

            it('should format bold text', () => {
                const message = 'This is **bold** text';
                const result = uiManager.formatMessage(message);
                
                expect(result).toContain('<strong>bold</strong>');
            });

            it('should format italic text', () => {
                const message = 'This is *italic* text';
                const result = uiManager.formatMessage(message);
                
                expect(result).toContain('<em>italic</em>');
            });

            it('should format code text', () => {
                const message = 'Use `console.log()` for debugging';
                const result = uiManager.formatMessage(message);
                
                expect(result).toContain('<code>console.log()</code>');
            });

            it('should detect and embed video ID patterns', () => {
                const testCases = [
                    '🆔 Video ID: 123',
                    'Check video at /videos/456',
                    'Video ID 789',
                    'tại đây: /videos/101'
                ];

                testCases.forEach((message, index) => {
                    const result = uiManager.formatMessage(message);
                    expect(result).toContain('video-embed-container');
                    expect(result).toContain('embedded-video');
                });
            });

            it('should extract video title from message', () => {
                const message = 'Video về **Chủ đề:** JavaScript cơ bản! Video ID: 123';
                const result = uiManager.formatMessage(message);
                
                expect(result).toContain('JavaScript cơ bản');
            });

            it('should not embed video when no ID found', () => {
                const message = 'This is just a regular message about videos';
                const result = uiManager.formatMessage(message);
                
                expect(result).not.toContain('video-embed-container');
            });
        });

        describe('showError', () => {
            it('should display error message as AI message', () => {
                uiManager.showError('Test error message');
                
                expect(mockElements.chatMessages.innerHTML).toContain('❌ Test error message');
                expect(mockElements.chatMessages.innerHTML).toContain('ai-message');
            });
        });

        describe('clearChat', () => {
            it('should clear all chat messages', () => {
                // Add some messages first
                uiManager.addUserMessage('User message');
                uiManager.addAIMessage('AI message');
                
                expect(mockElements.chatMessages.innerHTML).not.toBe('');
                
                uiManager.clearChat();
                
                expect(mockElements.chatMessages.innerHTML).toBe('');
            });
        });

        describe('addWelcomeMessage', () => {
            it('should add welcome message with features list', () => {
                uiManager.addWelcomeMessage();
                
                expect(mockElements.chatMessages.innerHTML).toContain('Xin chào! Tôi là AI Assistant');
                expect(mockElements.chatMessages.innerHTML).toContain('Trò chuyện');
                expect(mockElements.chatMessages.innerHTML).toContain('Brainstorm');
                expect(mockElements.chatMessages.innerHTML).toContain('Lập kế hoạch');
            });
        });

        describe('Typing Indicator', () => {
            it('should show typing indicator', () => {
                uiManager.showTypingIndicator();
                
                expect(mockElements.typingIndicator.style.display).toBe('block');
            });

            it('should show typing indicator with custom message', () => {
                const customMessage = 'AI đang tạo video...';
                uiManager.showTypingIndicator(customMessage, 50);
                
                expect(mockElements.typingIndicator.innerHTML).toContain(customMessage);
                expect(mockElements.typingIndicator.innerHTML).toContain('50%');
            });

            it('should update typing indicator with progress', () => {
                uiManager.showTypingIndicator();
                uiManager.updateTypingIndicator('Processing...', 75);
                
                expect(mockElements.typingIndicator.innerHTML).toContain('Processing...');
                expect(mockElements.typingIndicator.innerHTML).toContain('75%');
            });

            it('should hide typing indicator', () => {
                uiManager.showTypingIndicator();
                uiManager.hideTypingIndicator();
                
                expect(mockElements.typingIndicator.style.display).toBe('none');
            });

            it('should handle typing indicator with line breaks', () => {
                const messageWithBreaks = 'Step 1: Processing\nStep 2: Generating';
                uiManager.updateTypingIndicator(messageWithBreaks, 30);
                
                expect(mockElements.typingIndicator.innerHTML).toContain('Step 1: Processing<br>Step 2: Generating');
            });
        });

        describe('Loading State', () => {
            it('should set loading state on send button and input', () => {
                uiManager.setLoadingState(true);
                
                expect(mockElements.sendButton.disabled).toBeTruthy();
                expect(mockElements.messageInput.disabled).toBeTruthy();
                expect(mockElements.sendButton.innerHTML).toContain('fa-spinner fa-spin');
            });

            it('should clear loading state', () => {
                uiManager.setLoadingState(true);
                uiManager.setLoadingState(false);
                
                expect(mockElements.sendButton.disabled).toBeFalsy();
                expect(mockElements.messageInput.disabled).toBeFalsy();
                expect(mockElements.sendButton.innerHTML).toContain('fa-paper-plane');
            });
        });

        describe('Chat Type UI', () => {
            it('should update placeholder for conversation type', () => {
                uiManager.updateChatTypeUI('conversation');
                
                expect(mockElements.messageInput.placeholder).toContain('💬');
                expect(mockElements.messageInput.placeholder).toContain('conversation');
            });

            it('should update placeholder for brainstorm type', () => {
                uiManager.updateChatTypeUI('brainstorm');
                
                expect(mockElements.messageInput.placeholder).toContain('💡');
                expect(mockElements.messageInput.placeholder).toContain('brainstorm');
            });

            it('should update placeholder for planning type', () => {
                uiManager.updateChatTypeUI('planning');
                
                expect(mockElements.messageInput.placeholder).toContain('📋');
                expect(mockElements.messageInput.placeholder).toContain('planning');
            });
        });

        describe('Message Input Management', () => {
            it('should set message input value and focus', () => {
                const focusSpy = jest.fn();
                mockElements.messageInput.focus = focusSpy;
                
                uiManager.setMessageInput('Test input value');
                
                expect(mockElements.messageInput.value).toBe('Test input value');
                expect(focusSpy).toHaveBeenCalled();
            });

            it('should get trimmed message input', () => {
                mockElements.messageInput.value = '  test message  ';
                
                const result = uiManager.getMessageInput();
                
                expect(result).toBe('test message');
            });

            it('should clear message input', () => {
                mockElements.messageInput.value = 'some text';
                uiManager.clearMessageInput();
                
                expect(mockElements.messageInput.value).toBe('');
            });
        });

        describe('Scroll Management', () => {
            it('should scroll to bottom', (done) => {
                const scrollTopSetter = jest.fn();
                Object.defineProperty(mockElements.messagesContainer, 'scrollTop', {
                    set: scrollTopSetter,
                    get: () => 0
                });
                Object.defineProperty(mockElements.messagesContainer, 'scrollHeight', {
                    value: 1000
                });

                uiManager.scrollToBottom();

                setTimeout(() => {
                    expect(scrollTopSetter).toHaveBeenCalledWith(1000);
                    done();
                }, 150);
            });
        });

        describe('HTML Escaping', () => {
            it('should escape HTML characters', () => {
                const dangerousText = '<script>alert("xss")</script>&<>"\'';
                const result = uiManager.escapeHtml(dangerousText);
                
                expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;&amp;&lt;&gt;"\'');
            });

            it('should handle empty string', () => {
                const result = uiManager.escapeHtml('');
                expect(result).toBe('');
            });

            it('should handle null and undefined', () => {
                expect(uiManager.escapeHtml(null)).toBe('null');
                expect(uiManager.escapeHtml(undefined)).toBe('undefined');
            });
        });

        describe('Edge Cases', () => {
            it('should handle missing DOM elements gracefully', () => {
                // Remove an element
                document._mockElements = document._mockElements.filter(el => el.id !== 'chatMessages');
                
                const uiManagerMissingEl = new UIManager();
                
                // Should not throw error when trying to use missing element
                expect(() => {
                    uiManagerMissingEl.addUserMessage('test');
                }).not.toThrow();
            });

            it('should handle very long messages', () => {
                const longMessage = 'a'.repeat(10000);
                
                expect(() => {
                    uiManager.addUserMessage(longMessage);
                }).not.toThrow();
                
                expect(mockElements.chatMessages.innerHTML).toContain(longMessage);
            });

            it('should handle special characters in messages', () => {
                const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';
                
                uiManager.addUserMessage(specialChars);
                
                expect(mockElements.chatMessages.innerHTML).toContain(specialChars);
            });
        });
    });
}

// Export function for test runner
global.runUIManagerTests = runUIManagerTests;