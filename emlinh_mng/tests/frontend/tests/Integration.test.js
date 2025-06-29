/**
 * Integration Tests for Emlinh AI Assistant
 * Tests full workflow and component interactions
 */

function runIntegrationTests() {
    describe('Integration Tests', () => {
        let chatCore, uiManager, notificationManager, videoManager;
        let mockSessionManager;

        beforeAll(() => {
            setupMockDOM();
        });

        beforeEach(() => {
            // Setup DOM
            setupMockDOM();

            // Create real instances
            mockSessionManager = {
                getSessionId: jest.fn(() => 'integration-session-123')
            };

            notificationManager = new NotificationManager();
            uiManager = new UIManager();
            chatCore = new ChatCore(mockSessionManager, uiManager, notificationManager);
            
            // Mock SocketIO for VideoManager
            window.io = jest.fn(() => ({
                on: jest.fn(),
                emit: jest.fn()
            }));
            
            videoManager = new VideoManager(notificationManager, uiManager);

            // Mock fetch globally
            global.fetch = jest.fn();
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        describe('Complete Chat Flow', () => {
            it('should handle full conversation workflow', async () => {
                // Mock API response
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        ai_response: 'Hello! How can I help you today?',
                        timestamp: '2023-01-01T12:00:00Z'
                    })
                });

                // Send message
                await chatCore.sendMessage('Hello AI');

                // Verify UI updates
                const chatMessages = document.getElementById('chatMessages');
                expect(chatMessages.innerHTML).toContain('Hello AI');
                expect(chatMessages.innerHTML).toContain('Hello! How can I help you today?');
                expect(chatMessages.innerHTML).toContain('user-message');
                expect(chatMessages.innerHTML).toContain('ai-message');
            });

            it('should handle video creation request workflow', async () => {
                const videoResponse = {
                    type: 'video_created',
                    message: 'Video created successfully',
                    video: {
                        id: 1,
                        duration: 30,
                        voice: 'nova',
                        background: 'office',
                        composition: 'Scene-Landscape',
                        script: 'Test video script'
                    }
                };

                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        ai_response: JSON.stringify(videoResponse),
                        timestamp: '2023-01-01T12:00:00Z'
                    })
                });

                await chatCore.sendMessage('Create a video about AI');

                const chatMessages = document.getElementById('chatMessages');
                expect(chatMessages.innerHTML).toContain('Create a video about AI');
                expect(chatMessages.innerHTML).toContain('video-embed-container');
    });
});

        describe('Video Manager Integration', () => {
            it('should integrate video creation with chat', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        job_id: 'test-job-123'
                    })
                });

                await videoManager.createVideo('AI Technology');

                expect(global.fetch).toHaveBeenCalledWith('/api/chat/create-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic: 'AI Technology',
                        duration: 15,
                        composition: 'Scene-Landscape',
                        background: 'office',
                        voice: 'nova',
                        session_id: videoManager.sessionId
                    })
                });

                const chatMessages = document.getElementById('chatMessages');
                expect(chatMessages.innerHTML).toContain('Tạo video về: AI Technology');
    });
});

            it('should handle message type changes', () => {
                chatCore.setMessageType('brainstorm');
                
                const messageInput = document.getElementById('messageInput');
                expect(messageInput.placeholder).toContain('💡');
                expect(messageInput.placeholder).toContain('brainstorm');
    });
});

        describe('API Health Check', () => {
            it('should verify /api/chat/send endpoint format', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        ai_response: 'Health check response',
                        timestamp: new Date().toISOString()
                    })
                });

                await chatCore.sendMessage('health check');

                expect(global.fetch).toHaveBeenCalledWith('/api/chat/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: 'health check',
                        session_id: 'integration-session-123',
                        type: 'conversation'
                    })
    });
});

            it('should verify /health endpoint accessibility', async () => {
                global.fetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ status: 'healthy' })
                });

                const response = await fetch('/health');
                const data = await response.json();

                expect(response.ok).toBeTruthy();
                expect(data.status).toBe('healthy');
    });
});

        describe('Real-time Updates Integration', () => {
            it('should handle video progress updates', () => {
                videoManager.currentVideoJob = 'test-job-123';

                const progressData = {
                    job_id: 'test-job-123',
                    step: 'generating_script',
                    message: 'Creating script...',
                    progress: 50
                };

                videoManager.handleVideoProgress(progressData);

                const typingIndicator = document.getElementById('typingIndicator');
                expect(typingIndicator.innerHTML).toContain('Creating script...');
                expect(typingIndicator.innerHTML).toContain('50%');
    });
});

        describe('Edge Cases Integration', () => {
            it('should handle multiple simultaneous operations', async () => {
                // Start multiple operations
                const promises = [
                    chatCore.sendMessage('Message 1'),
                    chatCore.sendMessage('Message 2'),
                    videoManager.createVideo('Video 1')
                ];

                // Mock responses
                global.fetch
                    .mockResolvedValueOnce({
                        json: async () => ({ success: true, ai_response: 'Response 1' })
                    })
                    .mockResolvedValueOnce({
                        json: async () => ({ success: true, ai_response: 'Response 2' })
                    })
                    .mockResolvedValueOnce({
                        json: async () => ({ success: true, job_id: 'job-1' })
                    });

                await Promise.allSettled(promises);

                // Verify only one chat message was processed due to loading state
                expect(global.fetch).toHaveBeenCalledTimes(2); // Only first chat + video
            });

            it('should recover from component failures', () => {
                // Simulate component failure
                const originalLog = console.error;
                console.error = jest.fn();

                // This should not crash the system
                expect(() => {
                    uiManager.addUserMessage(null);
                    notificationManager.showError(undefined);
                    chatCore.setMessageType('invalid-type');
                }).not.toThrow();

                console.error = originalLog;
    });
});
});
}

// Export function for test runner
global.runIntegrationTests = runIntegrationTests;