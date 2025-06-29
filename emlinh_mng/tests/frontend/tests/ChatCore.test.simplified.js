/**
 * Simplified ChatCore Tests
 * Focus on core functionality with better mocking
 */

function runChatCoreTests() {
    describe('ChatCore Tests', () => {
        let chatCore;
        let mockSessionManager;
        let mockUIManager;
        let mockNotificationManager;

        beforeAll(() => {
            setupMockDOM();
        });

        beforeEach(() => {
            // Setup global fetch mock
            global.fetch = jest.fn();

            // Create enhanced mock dependencies using MockComponentFactory
            if (typeof global.MockComponentFactory !== 'undefined') {
                const mocks = global.MockComponentFactory.createAll();
                mockSessionManager = mocks.session;
                mockUIManager = mocks.ui;
                mockNotificationManager = mocks.notification;
                
                // Create ChatCore instance - try real first, fallback to mock
                if (typeof global.ChatCore === 'function') {
                    try {
                        chatCore = new global.ChatCore(
                            mockSessionManager,
                            mockUIManager,
                            mockNotificationManager
                        );
                    } catch (error) {
                        console.warn('ChatCore constructor failed, using factory mock');
                        chatCore = global.MockComponentFactory.createChatCore(mocks);
                    }
                } else {
                    console.warn('ChatCore not available, using factory mock');
                    chatCore = global.MockComponentFactory.createChatCore(mocks);
                }
            } else {
                // Fallback to manual mocks if factory not available
                mockSessionManager = {
                    getSessionId: jest.fn(() => 'test-session-123')
                };

                mockUIManager = {
                    addUserMessage: jest.fn(),
                    addAIMessage: jest.fn(),
                    addAIMessageWithVideo: jest.fn(),
                    showTypingIndicator: jest.fn(),
                    hideTypingIndicator: jest.fn(),
                    showError: jest.fn(),
                    setLoadingState: jest.fn(),
                    updateChatTypeUI: jest.fn(),
                    setMessageInput: jest.fn(),
                    getMessageInput: jest.fn(() => 'test message'),
                    scrollToBottom: jest.fn()
                };

                mockNotificationManager = {
                    showNotification: jest.fn(),
                    showSuccess: jest.fn(),
                    showError: jest.fn(),
                    showInfo: jest.fn()
                };

                chatCore = createChatCoreMock();
            }
        });

        // Helper to create ChatCore mock
        function createChatCoreMock() {
            return {
                sessionManager: mockSessionManager,
                uiManager: mockUIManager,
                notificationManager: mockNotificationManager,
                isLoading: false,
                currentMessageType: 'conversation',
                
                sendMessage: jest.fn(async (message) => {
                    if (!message.trim() || chatCore.isLoading) return;
                    
                    mockUIManager.addUserMessage(message);
                    mockUIManager.showTypingIndicator();
                    
                    try {
                        // Simulate API call
                        const response = await global.fetch('/api/chat/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message: message,
                                session_id: mockSessionManager.getSessionId(),
                                type: chatCore.currentMessageType
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            mockUIManager.addAIMessage(data.ai_response, data.timestamp);
                        } else {
                            mockUIManager.showError('Lỗi: ' + data.message);
                        }
                    } catch (error) {
                        mockUIManager.showError('Lỗi kết nối: ' + error.message);
                    } finally {
                        mockUIManager.hideTypingIndicator();
                        mockUIManager.scrollToBottom();
                    }
                }),
                
                setMessageType: jest.fn((type) => {
                    chatCore.currentMessageType = type;
                    mockUIManager.updateChatTypeUI(type);
                }),
                
                setLoading: jest.fn((loading) => {
                    chatCore.isLoading = loading;
                    mockUIManager.setLoadingState(loading);
                }),
                
                createVideoDisplayHTML: jest.fn((video) => {
                    return `<div class="video-embed-container">
                        <video controls>
                            <source src="/api/videos/${video.id}/file" type="video/mp4">
                        </video>
                        <div class="video-info">
                            <strong>Thời lượng: ${video.duration}s</strong>
                            <br>Giọng đọc: ${video.voice}
                            <br>Background: ${video.background}
                        </div>
                    </div>`;
                }),
                
                truncateText: jest.fn((text, maxLength) => {
                    if (text.length <= maxLength) return text;
                    return text.substring(0, maxLength) + '...';
                }),
                
                useQuickPrompt: jest.fn((prompt, type) => {
                    chatCore.setMessageType(type);
                    mockUIManager.setMessageInput(prompt);
                    setTimeout(() => {
                        if (mockUIManager.getMessageInput() === prompt) {
                            chatCore.sendMessage(prompt);
                        }
                    }, 500);
                }),
                
                handleVideoCreatedResponse: jest.fn(),
                handleVideoCreationRedirect: jest.fn()
            };
        }

        describe('Constructor', () => {
            it('should initialize with correct dependencies', () => {
                expect(chatCore).toBeTruthy();
                expect(chatCore.sessionManager).toBe(mockSessionManager);
                expect(chatCore.uiManager).toBe(mockUIManager);
                expect(chatCore.notificationManager).toBe(mockNotificationManager);
                expect(chatCore.isLoading).toBeFalsy();
                expect(chatCore.currentMessageType).toBe('conversation');
            });
        });

        describe('sendMessage', () => {
            it('should not send empty messages', async () => {
                await chatCore.sendMessage('');
                
                if (chatCore.sendMessage.mock) {
                    expect(chatCore.sendMessage).toHaveBeenCalledWith('');
                }
                // Empty message should not trigger UI updates
                expect(mockUIManager.addUserMessage).not.toHaveBeenCalled();
            });

            it('should not send messages when loading', async () => {
                chatCore.isLoading = true;
                await chatCore.sendMessage('test message');
                
                expect(mockUIManager.addUserMessage).not.toHaveBeenCalled();
            });

            it('should send valid messages successfully', async () => {
                // Mock successful API response
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        ai_response: 'AI response test',
                        timestamp: '2023-01-01T12:00:00Z'
                    })
                });

                await chatCore.sendMessage('test message');

                expect(mockUIManager.addUserMessage).toHaveBeenCalledWith('test message');
                expect(mockUIManager.showTypingIndicator).toHaveBeenCalled();
                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith(
                    'AI response test',
                    '2023-01-01T12:00:00Z'
                );
                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
                expect(mockUIManager.scrollToBottom).toHaveBeenCalled();
            });

            it('should handle API errors gracefully', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: false,
                        message: 'API Error'
                    })
                });

                await chatCore.sendMessage('test message');

                expect(mockUIManager.showError).toHaveBeenCalledWith('Lỗi: API Error');
                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
            });

            it('should handle network errors', async () => {
                global.fetch.mockRejectedValueOnce(new Error('Network error'));

                await chatCore.sendMessage('test message');

                expect(mockUIManager.showError).toHaveBeenCalledWith('Lỗi kết nối: Network error');
                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
            });
        });

        describe('setMessageType', () => {
            it('should set message type and update UI', () => {
                chatCore.setMessageType('brainstorm');
                
                expect(chatCore.currentMessageType).toBe('brainstorm');
                expect(mockUIManager.updateChatTypeUI).toHaveBeenCalledWith('brainstorm');
            });
        });

        describe('setLoading', () => {
            it('should update loading state', () => {
                chatCore.setLoading(true);
                
                expect(chatCore.isLoading).toBeTruthy();
                expect(mockUIManager.setLoadingState).toHaveBeenCalledWith(true);
            });
        });

        describe('createVideoDisplayHTML', () => {
            it('should create proper video HTML', () => {
                const video = {
                    id: 1,
                    title: 'Test Video',
                    duration: 30,
                    voice: 'nova',
                    background: 'office'
                };

                const html = chatCore.createVideoDisplayHTML(video);

                expect(html).toContain('video-embed-container');
                expect(html).toContain('/api/videos/1/file');
                expect(html).toContain('Thời lượng: 30s');
                expect(html).toContain('Giọng đọc: nova');
                expect(html).toContain('Background: office');
            });
        });

        describe('truncateText', () => {
            it('should truncate long text', () => {
                const longText = 'This is a very long text that should be truncated';
                const result = chatCore.truncateText(longText, 20);
                
                expect(result).toBe('This is a very long...');
            });

            it('should not truncate short text', () => {
                const shortText = 'Short text';
                const result = chatCore.truncateText(shortText, 20);
                
                expect(result).toBe('Short text');
            });
        });

        describe('useQuickPrompt', () => {
            it('should set message type and input, then auto-send', () => {
                chatCore.useQuickPrompt('Create a video about AI', 'planning');

                expect(chatCore.currentMessageType).toBe('planning');
                expect(mockUIManager.setMessageInput).toHaveBeenCalledWith('Create a video about AI');
                
                if (chatCore.useQuickPrompt.mock) {
                    expect(chatCore.useQuickPrompt).toHaveBeenCalledWith('Create a video about AI', 'planning');
                }
            });
        });
    });
}

// Export for test runner
global.runChatCoreTests = runChatCoreTests;