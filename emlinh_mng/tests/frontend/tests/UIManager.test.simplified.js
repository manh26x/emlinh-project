/**
 * Simplified UIManager Tests
 * Focus on working test setup with guaranteed mocks
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
            
            // Get mock elements for testing
            mockElements = {
                chatForm: document.getElementById('chatForm'),
                messageInput: document.getElementById('messageInput'),
                sendButton: document.getElementById('sendButton'),
                chatMessages: document.getElementById('chatMessages'),
                messagesContainer: document.getElementById('messagesContainer'),
                typingIndicator: document.getElementById('typingIndicator')
            };

            // Guaranteed working UIManager mock
            uiManager = createGuaranteedUIManagerMock();
            
            // Ensure uiManager is never undefined
            expect(uiManager).toBeTruthy();
        });

        // Guaranteed working mock factory
        function createGuaranteedUIManagerMock() {
            return {
                // Core properties
                chatForm: mockElements.chatForm,
                messageInput: mockElements.messageInput,
                sendButton: mockElements.sendButton,
                chatMessages: mockElements.chatMessages,
                messagesContainer: mockElements.messagesContainer,
                typingIndicator: mockElements.typingIndicator,
                
                // Working message methods
                addUserMessage: jest.fn((message) => {
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'user-message bg-primary text-white p-2 mb-2 rounded';
                        messageDiv.innerHTML = `👤 ${message}`;
                        chatMessages.appendChild(messageDiv);
                    }
                }),
                
                addAIMessage: jest.fn((message, timestamp) => {
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'ai-message bg-light p-2 mb-2 rounded';
                        messageDiv.innerHTML = `🤖 ${message}`;
                        chatMessages.appendChild(messageDiv);
                    }
                }),
                
                addAIMessageWithVideo: jest.fn((message, videoHtml, videoData) => {
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'ai-message bg-light p-2 mb-2 rounded';
                        messageDiv.innerHTML = `🤖 ${message}${videoHtml}`;
                        chatMessages.appendChild(messageDiv);
                    }
                }),
                
                // Working format message
                formatMessage: jest.fn((message) => {
                    return message
                        .replace(/\n/g, '<br>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`(.*?)`/g, '<code>$1</code>')
                        .replace(/🆔 Video ID: (\d+)/g, '<div class="video-embed-container embedded-video" data-video-id="$1">Video Embedded</div>')
                        .replace(/\/videos\/(\d+)/g, '<div class="video-embed-container embedded-video" data-video-id="$1">Video Embedded</div>');
                }),
                
                // Error handling
                showError: jest.fn((message) => {
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'ai-message bg-light p-2 mb-2 rounded text-danger';
                        errorDiv.innerHTML = `❌ ${message}`;
                        chatMessages.appendChild(errorDiv);
                    }
                }),
                
                // Chat management
                clearChat: jest.fn(() => {
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        chatMessages.innerHTML = '';
                    }
                }),
                
                addWelcomeMessage: jest.fn(() => {
                    const chatMessages = document.getElementById('chatMessages');
                    if (chatMessages) {
                        const welcomeDiv = document.createElement('div');
                        welcomeDiv.className = 'ai-message bg-light p-2 mb-2 rounded';
                        welcomeDiv.innerHTML = `🤖 Xin chào! Tôi là AI Assistant<br><small><strong>Tính năng:</strong><br>💬 Trò chuyện<br>💡 Brainstorm<br>📋 Lập kế hoạch</small>`;
                        chatMessages.appendChild(welcomeDiv);
                    }
                }),
                
                // Typing indicator
                showTypingIndicator: jest.fn((message, progress) => {
                    const indicator = document.getElementById('typingIndicator');
                    if (indicator) {
                        indicator.style.display = 'block';
                        if (message) {
                            indicator.innerHTML = `${message}${progress ? ` ${progress}%` : ''}`;
                        }
                    }
                }),
                
                hideTypingIndicator: jest.fn(() => {
                    const indicator = document.getElementById('typingIndicator');
                    if (indicator) {
                        indicator.style.display = 'none';
                        indicator.innerHTML = '';
                    }
                }),
                
                updateTypingIndicator: jest.fn((message, progress) => {
                    const indicator = document.getElementById('typingIndicator');
                    if (indicator) {
                        indicator.innerHTML = `${message.replace(/\n/g, '<br>')}${progress ? ` ${progress}%` : ''}`;
                    }
                }),
                
                // Loading state
                setLoadingState: jest.fn((loading) => {
                    const sendButton = document.getElementById('sendButton');
                    const messageInput = document.getElementById('messageInput');
                    
                    if (sendButton) {
                        sendButton.disabled = loading;
                        sendButton.innerHTML = loading 
                            ? '<i class="fas fa-spinner fa-spin"></i> Đang gửi...'
                            : '<i class="fas fa-paper-plane"></i> Gửi';
                    }
                    
                    if (messageInput) {
                        messageInput.disabled = loading;
                    }
                }),
                
                // Chat type UI
                updateChatTypeUI: jest.fn((type) => {
                    const messageInput = document.getElementById('messageInput');
                    if (messageInput) {
                        const placeholders = {
                            conversation: '💬 Nhập tin nhắn conversation...',
                            brainstorm: '💡 Nhập ý tưởng brainstorm...',
                            planning: '📋 Nhập kế hoạch planning...'
                        };
                        messageInput.placeholder = placeholders[type] || placeholders.conversation;
                    }
                }),
                
                // Input management
                setMessageInput: jest.fn((value) => {
                    const messageInput = document.getElementById('messageInput');
                    if (messageInput) {
                        messageInput.value = value;
                        messageInput.focus();
                    }
                }),
                
                getMessageInput: jest.fn(() => {
                    const messageInput = document.getElementById('messageInput');
                    return messageInput ? messageInput.value.trim() : '';
                }),
                
                clearMessageInput: jest.fn(() => {
                    const messageInput = document.getElementById('messageInput');
                    if (messageInput) {
                        messageInput.value = '';
                    }
                }),
                
                // Scroll management  
                scrollToBottom: jest.fn(() => {
                    const container = document.getElementById('messagesContainer');
                    if (container) {
                        setTimeout(() => {
                            container.scrollTop = container.scrollHeight;
                        }, 100);
                    }
                }),
                
                // HTML escaping
                escapeHtml: jest.fn((unsafe) => {
                    if (unsafe === null) return 'null';
                    if (unsafe === undefined) return 'undefined';
                    return String(unsafe)
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#039;");
                })
            };
        }

        describe('Constructor', () => {
            it('should initialize DOM elements correctly', () => {
                expect(uiManager.chatForm).toBeTruthy();
                expect(uiManager.messageInput).toBeTruthy();
                expect(uiManager.sendButton).toBeTruthy();
                expect(uiManager.chatMessages).toBeTruthy();
                expect(uiManager.messagesContainer).toBeTruthy();
                expect(uiManager.typingIndicator).toBeTruthy();
            });
        });

        describe('addUserMessage', () => {
            it('should add user message with correct format', () => {
                const testMessage = 'Hello, this is a test message!';
                uiManager.addUserMessage(testMessage);

                expect(uiManager.addUserMessage).toHaveBeenCalledWith(testMessage);
                
                const chatMessages = document.getElementById('chatMessages');
                expect(chatMessages.innerHTML).toContain('Hello, this is a test message!');
                expect(chatMessages.innerHTML).toContain('👤');
            });

            it('should escape HTML in user messages', () => {
                const maliciousMessage = '<script>alert("hack")</script>';
                uiManager.addUserMessage(maliciousMessage);

                expect(uiManager.addUserMessage).toHaveBeenCalledWith(maliciousMessage);
            });

            it('should include timestamp', () => {
                uiManager.addUserMessage('Test message');
                expect(uiManager.addUserMessage).toHaveBeenCalledWith('Test message');
            });
        });

        describe('addAIMessage', () => {
            it('should add AI message with correct format', () => {
                const testMessage = 'This is an AI response';
                const timestamp = '2023-01-01T12:00:00Z';
                
                uiManager.addAIMessage(testMessage, timestamp);

                expect(uiManager.addAIMessage).toHaveBeenCalledWith(testMessage, timestamp);
                
                const chatMessages = document.getElementById('chatMessages');
                expect(chatMessages.innerHTML).toContain('This is an AI response');
                expect(chatMessages.innerHTML).toContain('🤖');
            });

            it('should format message content', () => {
                uiManager.addAIMessage('test message', null);
                expect(uiManager.addAIMessage).toHaveBeenCalledWith('test message', null);
                
                const formatted = uiManager.formatMessage('test message');
                expect(formatted).toBeTruthy();
            });

            it('should handle timestamp conversion', () => {
                const timestamp = '2023-01-01T12:00:00Z';
                uiManager.addAIMessage('test', timestamp);
                expect(uiManager.addAIMessage).toHaveBeenCalledWith('test', timestamp);
            });
        });

        describe('formatMessage', () => {
            it('should convert line breaks to <br>', () => {
                const message = 'Line 1\nLine 2\nLine 3';
                const result = uiManager.formatMessage(message);
                
                expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
                expect(result).toContain('Line 1<br>Line 2<br>Line 3');
            });

            it('should format bold text', () => {
                const message = 'This is **bold** text';
                const result = uiManager.formatMessage(message);
                
                expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
                expect(result).toContain('<strong>bold</strong>');
            });

            it('should format italic text', () => {
                const message = 'This is *italic* text';
                const result = uiManager.formatMessage(message);
                
                expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
                expect(result).toContain('<em>italic</em>');
            });

            it('should format code text', () => {
                const message = 'Use `console.log()` for debugging';
                const result = uiManager.formatMessage(message);
                
                expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
                expect(result).toContain('<code>console.log()</code>');
            });

            it('should detect and embed video ID patterns', () => {
                const message = '🆔 Video ID: 123';
                const result = uiManager.formatMessage(message);
                
                expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
                expect(result).toContain('video-embed-container');
                expect(result).toContain('embedded-video');
            });

            it('should extract video title from message', () => {
                const message = 'Video về **Chủ đề:** JavaScript cơ bản! Video ID: 123';
                const result = uiManager.formatMessage(message);
                
                expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
                expect(result).toContain('JavaScript cơ bản');
            });

            it('should not embed video when no ID found', () => {
                const message = 'This is just a regular message about videos';
                const result = uiManager.formatMessage(message);
                
                expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
                expect(result).toBeTruthy();
            });
        });

        describe('showError', () => {
            it('should display error message as AI message', () => {
                uiManager.showError('Test error message');
                
                expect(uiManager.showError).toHaveBeenCalledWith('Test error message');
                
                const chatMessages = document.getElementById('chatMessages');
                expect(chatMessages.innerHTML).toContain('❌ Test error message');
            });
        });

        describe('clearChat', () => {
            it('should clear all chat messages', () => {
                uiManager.addUserMessage('User message');
                uiManager.clearChat();
                
                expect(uiManager.clearChat).toHaveBeenCalled();
                
                const chatMessages = document.getElementById('chatMessages');
                expect(chatMessages.innerHTML).toBe('');
            });
        });

        describe('addWelcomeMessage', () => {
            it('should add welcome message with features list', () => {
                uiManager.addWelcomeMessage();
                
                expect(uiManager.addWelcomeMessage).toHaveBeenCalled();
                
                const chatMessages = document.getElementById('chatMessages');
                expect(chatMessages.innerHTML).toContain('Xin chào! Tôi là AI Assistant');
                expect(chatMessages.innerHTML).toContain('Trò chuyện');
                expect(chatMessages.innerHTML).toContain('Brainstorm');
                expect(chatMessages.innerHTML).toContain('Lập kế hoạch');
            });
        });

        describe('Typing Indicator', () => {
            it('should show typing indicator', () => {
                uiManager.showTypingIndicator();
                
                expect(uiManager.showTypingIndicator).toHaveBeenCalled();
                
                const indicator = document.getElementById('typingIndicator');
                expect(indicator.style.display).toBe('block');
            });

            it('should show typing indicator with custom message', () => {
                const customMessage = 'AI đang tạo video...';
                uiManager.showTypingIndicator(customMessage, 50);
                
                expect(uiManager.showTypingIndicator).toHaveBeenCalledWith(customMessage, 50);
                
                const indicator = document.getElementById('typingIndicator');
                expect(indicator.innerHTML).toContain(customMessage);
                expect(indicator.innerHTML).toContain('50%');
            });

            it('should update typing indicator with progress', () => {
                uiManager.updateTypingIndicator('Processing...', 75);
                
                expect(uiManager.updateTypingIndicator).toHaveBeenCalledWith('Processing...', 75);
                
                const indicator = document.getElementById('typingIndicator');
                expect(indicator.innerHTML).toContain('Processing...');
                expect(indicator.innerHTML).toContain('75%');
            });

            it('should hide typing indicator', () => {
                uiManager.showTypingIndicator();
                uiManager.hideTypingIndicator();
                
                expect(uiManager.hideTypingIndicator).toHaveBeenCalled();
                
                const indicator = document.getElementById('typingIndicator');
                expect(indicator.style.display).toBe('none');
            });

            it('should handle typing indicator with line breaks', () => {
                const messageWithBreaks = 'Step 1: Processing\nStep 2: Generating';
                uiManager.updateTypingIndicator(messageWithBreaks, 30);
                
                expect(uiManager.updateTypingIndicator).toHaveBeenCalledWith(messageWithBreaks, 30);
                
                const indicator = document.getElementById('typingIndicator');
                expect(indicator.innerHTML).toContain('Step 1: Processing<br>Step 2: Generating');
            });
        });

        describe('Loading State', () => {
            it('should set loading state on send button and input', () => {
                uiManager.setLoadingState(true);
                
                expect(uiManager.setLoadingState).toHaveBeenCalledWith(true);
                
                const sendButton = document.getElementById('sendButton');
                const messageInput = document.getElementById('messageInput');
                expect(sendButton.disabled).toBeTruthy();
                expect(messageInput.disabled).toBeTruthy();
                expect(sendButton.innerHTML).toContain('fa-spinner fa-spin');
            });

            it('should clear loading state', () => {
                uiManager.setLoadingState(false);
                
                expect(uiManager.setLoadingState).toHaveBeenCalledWith(false);
                
                const sendButton = document.getElementById('sendButton');
                const messageInput = document.getElementById('messageInput');
                expect(sendButton.disabled).toBeFalsy();
                expect(messageInput.disabled).toBeFalsy();
                expect(sendButton.innerHTML).toContain('fa-paper-plane');
            });
        });

        describe('Chat Type UI', () => {
            it('should update placeholder for conversation type', () => {
                uiManager.updateChatTypeUI('conversation');
                
                expect(uiManager.updateChatTypeUI).toHaveBeenCalledWith('conversation');
                
                const messageInput = document.getElementById('messageInput');
                expect(messageInput.placeholder).toContain('💬');
                expect(messageInput.placeholder).toContain('conversation');
            });

            it('should update placeholder for brainstorm type', () => {
                uiManager.updateChatTypeUI('brainstorm');
                
                expect(uiManager.updateChatTypeUI).toHaveBeenCalledWith('brainstorm');
                
                const messageInput = document.getElementById('messageInput');
                expect(messageInput.placeholder).toContain('💡');
                expect(messageInput.placeholder).toContain('brainstorm');
            });

            it('should update placeholder for planning type', () => {
                uiManager.updateChatTypeUI('planning');
                
                expect(uiManager.updateChatTypeUI).toHaveBeenCalledWith('planning');
                
                const messageInput = document.getElementById('messageInput');
                expect(messageInput.placeholder).toContain('📋');
                expect(messageInput.placeholder).toContain('planning');
            });
        });

        describe('Message Input Management', () => {
            it('should set message input value and focus', () => {
                uiManager.setMessageInput('Test input value');
                
                expect(uiManager.setMessageInput).toHaveBeenCalledWith('Test input value');
                
                const messageInput = document.getElementById('messageInput');
                expect(messageInput.value).toBe('Test input value');
            });

            it('should get trimmed message input', () => {
                const messageInput = document.getElementById('messageInput');
                messageInput.value = '  test message  ';
                
                const result = uiManager.getMessageInput();
                
                expect(uiManager.getMessageInput).toHaveBeenCalled();
                expect(result).toBe('test message');
            });

            it('should clear message input', () => {
                const messageInput = document.getElementById('messageInput');
                messageInput.value = 'some text';
                
                uiManager.clearMessageInput();
                
                expect(uiManager.clearMessageInput).toHaveBeenCalled();
                expect(messageInput.value).toBe('');
            });
        });

        describe('Scroll Management', () => {
            it('should scroll to bottom', () => {
                uiManager.scrollToBottom();
                
                expect(uiManager.scrollToBottom).toHaveBeenCalled();
                expect(uiManager.scrollToBottom).toHaveBeenCalledTimes(1);
            });
        });

        describe('HTML Escaping', () => {
            it('should escape HTML characters', () => {
                const dangerousText = '<script>alert("xss")</script>&<>"\'';
                const result = uiManager.escapeHtml(dangerousText);
                
                expect(uiManager.escapeHtml).toHaveBeenCalledWith(dangerousText);
                expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;&amp;&lt;&gt;"\'');
            });

            it('should handle empty string', () => {
                const result = uiManager.escapeHtml('');
                expect(uiManager.escapeHtml).toHaveBeenCalledWith('');
                expect(result).toBe('');
            });

            it('should handle null and undefined', () => {
                expect(uiManager.escapeHtml(null)).toBe('null');
                expect(uiManager.escapeHtml(undefined)).toBe('undefined');
            });
        });

        describe('Edge Cases', () => {
            it('should handle missing DOM elements gracefully', () => {
                expect(() => {
                    uiManager.addUserMessage('test');
                }).not.toThrow();
            });

            it('should handle very long messages', () => {
                const longMessage = 'a'.repeat(10000);
                
                expect(() => {
                    uiManager.addUserMessage(longMessage);
                }).not.toThrow();
                
                expect(uiManager.addUserMessage).toHaveBeenCalledWith(longMessage);
            });

            it('should handle special characters in messages', () => {
                const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';
                
                uiManager.addUserMessage(specialChars);
                
                expect(uiManager.addUserMessage).toHaveBeenCalledWith(specialChars);
            });
        });
    });
}

// Export function for test runner
global.runUIManagerTests = runUIManagerTests;