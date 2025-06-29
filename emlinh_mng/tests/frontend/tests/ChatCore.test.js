/**
 * Unit Tests for ChatCore.js
 * Tests chat functionality, message handling, and video integration
 */

function runChatCoreTests() {
    describe('ChatCore Tests', () => {
        let chatCore;
        let mockSessionManager;
        let mockUIManager;
        let mockNotificationManager;
        let originalFetch;

        beforeAll(() => {
            // Setup DOM
            setupMockDOM();
        });

        beforeEach(() => {
            // Create mock dependencies
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

            // Mock fetch
            originalFetch = global.fetch;
            global.fetch = jest.fn();

            // Create ChatCore instance
            chatCore = new ChatCore(mockSessionManager, mockUIManager, mockNotificationManager);
        });

        afterEach(() => {
            global.fetch = originalFetch;
            jest.clearAllMocks();
        });

        describe('Constructor', () => {
            it('should initialize with correct dependencies', () => {
                expect(chatCore.sessionManager).toBe(mockSessionManager);
                expect(chatCore.uiManager).toBe(mockUIManager);
                expect(chatCore.notificationManager).toBe(mockNotificationManager);
                expect(chatCore.isLoading).toBeFalsy();
                expect(chatCore.currentMessageType).toBe('conversation');
            });
        });

        describe('sendMessage', () => {
            it('should not send empty messages', async () => {
                const result = await chatCore.sendMessage('');
                expect(mockUIManager.addUserMessage).not.toHaveBeenCalled();
                expect(global.fetch).not.toHaveBeenCalled();
            });

            it('should not send messages when loading', async () => {
                chatCore.isLoading = true;
                const result = await chatCore.sendMessage('test message');
                expect(mockUIManager.addUserMessage).not.toHaveBeenCalled();
                expect(global.fetch).not.toHaveBeenCalled();
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
                expect(global.fetch).toHaveBeenCalledWith('/api/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: 'test message',
                        session_id: 'test-session-123',
                        type: 'conversation'
                    })
                });
                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith(
                    'AI response test', 
                    '2023-01-01T12:00:00Z'
                );
                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
                expect(mockUIManager.scrollToBottom).toHaveBeenCalled();
            });

            it('should handle JSON video response', async () => {
                const videoResponse = {
                    type: 'video_created',
                    message: 'Video created successfully',
                    video: {
                        id: 1,
                        title: 'Test Video',
                        duration: 30,
                        voice: 'nova',
                        background: 'office',
                        composition: 'Scene-Landscape',
                        script: 'Test script'
                    }
                };

                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        ai_response: JSON.stringify(videoResponse),
                        timestamp: '2023-01-01T12:00:00Z'
                    })
                });

                const handleVideoSpy = jest.fn();
                chatCore.handleVideoCreatedResponse = handleVideoSpy;

                await chatCore.sendMessage('create video about cats');

                expect(handleVideoSpy).toHaveBeenCalledWith(videoResponse);
            });

            it('should handle video creation redirect', async () => {
                const redirectResponse = {
                    type: 'redirect_video_creation',
                    message: 'Creating video...',
                    video_request: {
                        topic: 'cats',
                        duration: 15
                    }
                };

                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        ai_response: JSON.stringify(redirectResponse),
                        timestamp: '2023-01-01T12:00:00Z'
                    })
                });

                const handleRedirectSpy = jest.fn();
                chatCore.handleVideoCreationRedirect = handleRedirectSpy;

                await chatCore.sendMessage('create video about cats');

                expect(handleRedirectSpy).toHaveBeenCalledWith(redirectResponse);
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

            it('should handle idea creation notification', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        ai_response: 'Response with idea',
                        timestamp: '2023-01-01T12:00:00Z',
                        idea_created: true
                    })
                });

                // Mock window.dispatchEvent
                const mockDispatchEvent = jest.fn();
                window.dispatchEvent = mockDispatchEvent;

                await chatCore.sendMessage('brainstorm ideas');

                expect(mockNotificationManager.showNotification).toHaveBeenCalledWith(
                    '💡 Đã tạo ý tưởng mới!', 
                    'success'
                );
                expect(mockDispatchEvent).toHaveBeenCalledWith(
                    expect.any(CustomEvent)
                );
            });
        });

        describe('setMessageType', () => {
            it('should set message type and update UI', () => {
                chatCore.setMessageType('brainstorm');
                
                expect(chatCore.currentMessageType).toBe('brainstorm');
                expect(mockUIManager.updateChatTypeUI).toHaveBeenCalledWith('brainstorm');
            });
        });

        describe('useQuickPrompt', () => {
            it('should set message type and input, then auto-send', async () => {
                const sendMessageSpy = jest.fn();
                chatCore.sendMessage = sendMessageSpy;

                chatCore.useQuickPrompt('Create a video about AI', 'planning');

                expect(chatCore.currentMessageType).toBe('planning');
                expect(mockUIManager.setMessageInput).toHaveBeenCalledWith('Create a video about AI');

                // Wait for timeout
                await new Promise(resolve => setTimeout(resolve, 600));

                expect(sendMessageSpy).toHaveBeenCalledWith('Create a video about AI');
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
                    background: 'office',
                    composition: 'Scene-Landscape',
                    script: 'Test script content'
                };

                const html = chatCore.createVideoDisplayHTML(video);

                expect(html).toContain('video-embed-container');
                expect(html).toContain('Video đã tạo');
                expect(html).toContain('/api/videos/1/file');
                expect(html).toContain('Thời lượng: <strong>30s</strong>');
                expect(html).toContain('Giọng đọc: <strong>nova</strong>');
                expect(html).toContain('Background: <strong>office</strong>');
                expect(html).toContain('Composition: <strong>Scene-Landscape</strong>');
                expect(html).toContain('Test script content');
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

        describe('Edge Cases', () => {
            it('should handle invalid JSON in AI response', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        ai_response: '{invalid json}',
                        timestamp: '2023-01-01T12:00:00Z'
                    })
                });

                await chatCore.sendMessage('test message');

                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith(
                    '{invalid json}', 
                    '2023-01-01T12:00:00Z'
                );
            });

            it('should handle empty message input after trim', async () => {
                const result = await chatCore.sendMessage('   ');
                expect(mockUIManager.addUserMessage).not.toHaveBeenCalled();
            });

            it('should handle concurrent message sending', async () => {
                chatCore.isLoading = false;
                
                // Mock slow API call
                global.fetch.mockImplementation(() => 
                    new Promise(resolve => setTimeout(() => resolve({
                        json: async () => ({ success: true, ai_response: 'Response' })
                    }), 100))
                );

                // Send two messages simultaneously
                const promise1 = chatCore.sendMessage('message 1');
                const promise2 = chatCore.sendMessage('message 2');

                await Promise.all([promise1, promise2]);

                // Only first message should be processed due to loading state
                expect(mockUIManager.addUserMessage).toHaveBeenCalledTimes(1);
            });
        });
    });
}

// Export function for test runner
window.runChatCoreTests = runChatCoreTests;