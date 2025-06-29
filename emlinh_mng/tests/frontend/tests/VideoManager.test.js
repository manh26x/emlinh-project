/**
 * Unit Tests for VideoManager.js
 * Tests video creation, real-time updates, and SocketIO integration
 */

function runVideoManagerTests() {
    describe('VideoManager Tests', () => {
        let videoManager;
        let mockNotificationManager;
        let mockUIManager;
        let mockSocket;
        let originalIO;

        beforeAll(() => {
            setupMockDOM();
            // Mock SocketIO
            originalIO = window.io;
        });

        beforeEach(() => {
            // Create mock dependencies
            mockNotificationManager = {
                showNotification: jest.fn(),
                showSuccess: jest.fn(),
                showError: jest.fn(),
                showInfo: jest.fn()
            };

            mockUIManager = {
                addUserMessage: jest.fn(),
                addAIMessage: jest.fn(),
                showTypingIndicator: jest.fn(),
                updateTypingIndicator: jest.fn(),
                hideTypingIndicator: jest.fn(),
                scrollToBottom: jest.fn()
            };

            // Mock SocketIO
            mockSocket = {
                on: jest.fn(),
                emit: jest.fn(),
                connected: true
            };

            window.io = jest.fn(() => mockSocket);
            global.fetch = jest.fn();

            // Create VideoManager instance
            videoManager = new VideoManager(mockNotificationManager, mockUIManager);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        afterAll(() => {
            window.io = originalIO;
        });

        describe('Constructor', () => {
            it('should initialize with correct dependencies', () => {
                expect(videoManager.notificationManager).toBe(mockNotificationManager);
                expect(videoManager.uiManager).toBe(mockUIManager);
                expect(videoManager.sessionId).toBeTruthy();
                expect(videoManager.sessionId).toContain('session_');
                expect(videoManager.currentVideoJob).toBeNull();
            });

            it('should initialize SocketIO', () => {
                expect(window.io).toHaveBeenCalled();
                expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
                expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
                expect(mockSocket.on).toHaveBeenCalledWith('video_progress', expect.any(Function));
            });
        });

        describe('generateSessionId', () => {
            it('should generate unique session IDs', () => {
                const id1 = videoManager.generateSessionId();
                const id2 = videoManager.generateSessionId();
                
                expect(id1).toContain('session_');
                expect(id2).toContain('session_');
                expect(id1).not.toBe(id2);
            });
        });

        describe('SocketIO Integration', () => {
            it('should handle socket connection', () => {
                const connectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
                
                connectCallback();
                
                expect(mockSocket.emit).toHaveBeenCalledWith('join_session', {
                    session_id: videoManager.sessionId
                });
            });

            it('should handle socket disconnection', () => {
                const disconnectCallback = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
                
                // Should not throw error
                expect(() => disconnectCallback()).not.toThrow();
            });
        });

        describe('handleVideoProgress', () => {
            beforeEach(() => {
                videoManager.currentVideoJob = 'test-job-123';
            });

            it('should ignore progress for different job', () => {
                const progressData = {
                    job_id: 'different-job',
                    step: 'processing',
                    message: 'Processing...',
                    progress: 50
                };

                videoManager.handleVideoProgress(progressData);

                expect(mockUIManager.updateTypingIndicator).not.toHaveBeenCalled();
            });

            it('should handle progress updates', () => {
                const progressData = {
                    job_id: 'test-job-123',
                    step: 'generating_script',
                    message: 'Generating script...',
                    progress: 25,
                    data: { script_preview: 'Once upon a time...' }
                };

                const formatSpy = jest.fn().mockReturnValue('✍️ Generating script... (25%)');
                videoManager.formatProgressMessage = formatSpy;

                videoManager.handleVideoProgress(progressData);

                expect(formatSpy).toHaveBeenCalledWith(
                    'generating_script',
                    'Generating script...',
                    25,
                    { script_preview: 'Once upon a time...' }
                );
                expect(mockUIManager.updateTypingIndicator).toHaveBeenCalledWith(
                    '✍️ Generating script... (25%)',
                    25
                );
            });

            it('should handle completion', () => {
                const completionData = {
                    job_id: 'test-job-123',
                    step: 'completed',
                    message: 'Video created successfully',
                    progress: 100,
                    data: { video_id: 42 }
                };

                videoManager.handleVideoProgress(completionData);

                expect(videoManager.currentVideoJob).toBeNull();
                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
                expect(mockNotificationManager.showSuccess).toHaveBeenCalledWith('🎬 Video được tạo thành công!');
                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith(
                    'Video đã được tạo thành công! <a href="/videos/42" target="_blank">Xem video</a>'
                );
            });

            it('should handle failure', () => {
                const failureData = {
                    job_id: 'test-job-123',
                    step: 'failed',
                    message: 'Encoding error',
                    progress: 75
                };

                videoManager.handleVideoProgress(failureData);

                expect(videoManager.currentVideoJob).toBeNull();
                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
                expect(mockNotificationManager.showError).toHaveBeenCalledWith('❌ Lỗi tạo video: Encoding error');
                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith(
                    'Xin lỗi, có lỗi xảy ra khi tạo video: Encoding error'
                );
            });
        });

        describe('formatProgressMessage', () => {
            it('should format basic progress message', () => {
                const result = videoManager.formatProgressMessage('generating_script', 'Creating script...', 30);
                
                expect(result).toContain('✍️ Creating script... (30%)');
            });

            it('should format message without progress', () => {
                const result = videoManager.formatProgressMessage('initializing', 'Starting...', 0);
                
                expect(result).toContain('🔧 Starting...');
                expect(result).not.toContain('(0%)');
            });

            it('should include script preview', () => {
                const stepData = { script_preview: 'In this video, we will learn...' };
                const result = videoManager.formatProgressMessage('script_completed', 'Script done', 50, stepData);
                
                expect(result).toContain('📝 Script done (50%)');
                expect(result).toContain('📄 Nội dung: In this video, we will learn...');
            });

            it('should include audio file info', () => {
                const stepData = { audio_file: '/tmp/audio/voice_123.wav' };
                const result = videoManager.formatProgressMessage('audio_completed', 'Audio ready', 80, stepData);
                
                expect(result).toContain('🔊 Audio ready (80%)');
                expect(result).toContain('🎵 File âm thanh: voice_123.wav');
            });

            it('should handle unknown step', () => {
                const result = videoManager.formatProgressMessage('unknown_step', 'Unknown process', 25);
                
                expect(result).toContain('⚙️ Unknown process (25%)');
            });
        });

        describe('createVideo', () => {
            it('should create video with default parameters', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        job_id: 'new-job-456'
                    })
                });

                await videoManager.createVideo('AI Technology');

                expect(mockUIManager.addUserMessage).toHaveBeenCalledWith('Tạo video về: AI Technology');
                expect(mockUIManager.showTypingIndicator).toHaveBeenCalledWith(
                    '🔧 Đang khởi tạo quy trình tạo video...',
                    5
                );
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
                expect(videoManager.currentVideoJob).toBe('new-job-456');
            });

            it('should create video with custom parameters', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: true,
                        job_id: 'custom-job-789'
                    })
                });

                await videoManager.createVideo('Custom Topic', 30, 'Scene-Portrait', 'nature', 'alloy');

                expect(global.fetch).toHaveBeenCalledWith('/api/chat/create-video', expect.objectContaining({
                    body: JSON.stringify({
                        topic: 'Custom Topic',
                        duration: 30,
                        composition: 'Scene-Portrait',
                        background: 'nature',
                        voice: 'alloy',
                        session_id: videoManager.sessionId
                    })
                }));
            });

            it('should handle API errors', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: false,
                        message: 'Topic too short'
                    })
                });

                await videoManager.createVideo('Hi');

                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith('❌ Lỗi tạo video: Topic too short');
                expect(mockNotificationManager.showError).toHaveBeenCalledWith('Lỗi tạo video: Topic too short');
            });

            it('should handle network errors', async () => {
                global.fetch.mockRejectedValueOnce(new Error('Network timeout'));

                await videoManager.createVideo('Network Test');

                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith(
                    '❌ Lỗi kết nối khi tạo video: Network timeout'
                );
                expect(mockNotificationManager.showError).toHaveBeenCalledWith(
                    'Lỗi kết nối khi tạo video: Network timeout'
                );
            });

            it('should always scroll to bottom', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({ success: true, job_id: 'scroll-test' })
                });

                await videoManager.createVideo('Scroll Test');

                expect(mockUIManager.scrollToBottom).toHaveBeenCalled();
            });
        });

        describe('downloadVideo', () => {
            it('should trigger video download', () => {
                // Mock createElement and click
                const mockLink = {
                    href: '',
                    download: '',
                    click: jest.fn()
                };
                const createElementSpy = jest.fn(() => mockLink);
                document.createElement = createElementSpy;

                videoManager.downloadVideo(123);

                expect(createElementSpy).toHaveBeenCalledWith('a');
                expect(mockLink.href).toBe('/api/videos/123/file');
                expect(mockLink.click).toHaveBeenCalled();
                expect(mockNotificationManager.showInfo).toHaveBeenCalledWith('Đang tải video...');
            });
        });

        describe('viewVideoDetail', () => {
            it('should load and show video details', async () => {
                const mockVideoData = {
                    success: true,
                    video: {
                        id: 1,
                        title: 'Test Video',
                        topic: 'Technology',
                        duration: 30,
                        script: 'Video script here...',
                        created_at: '2023-01-01T12:00:00Z'
                    }
                };

                global.fetch.mockResolvedValueOnce({
                    json: async () => mockVideoData
                });

                const showModalSpy = jest.fn();
                videoManager.showVideoDetailModal = showModalSpy;

                await videoManager.viewVideoDetail(1);

                expect(global.fetch).toHaveBeenCalledWith('/api/videos/1');
                expect(showModalSpy).toHaveBeenCalledWith(mockVideoData.video);
            });

            it('should handle API errors when loading video details', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({
                        success: false,
                        message: 'Video not found'
                    })
                });

                await videoManager.viewVideoDetail(999);

                expect(mockNotificationManager.showError).toHaveBeenCalledWith(
                    'Lỗi khi tải chi tiết video: Video not found'
                );
            });

            it('should handle network errors when loading video details', async () => {
                global.fetch.mockRejectedValueOnce(new Error('Connection failed'));

                await videoManager.viewVideoDetail(1);

                expect(mockNotificationManager.showError).toHaveBeenCalledWith(
                    'Lỗi kết nối khi tải chi tiết video'
                );
            });
        });

        describe('showVideoDetailModal', () => {
            beforeEach(() => {
                // Mock Bootstrap Modal
                window.bootstrap = {
                    Modal: jest.fn().mockImplementation(() => ({
                        show: jest.fn()
                    }))
                };

                // Mock document methods
                document.createElement = jest.fn(() => ({
                    innerHTML: '',
                    remove: jest.fn(),
                    addEventListener: jest.fn()
                }));
                
                document.body.insertAdjacentHTML = jest.fn();
                document.getElementById = jest.fn(() => ({
                    remove: jest.fn(),
                    addEventListener: jest.fn()
                }));
            });

            it('should create and show modal with video details', () => {
                const video = {
                    id: 1,
                    title: 'Test Video',
                    topic: 'AI Technology',
                    duration: 45,
                    script: 'This is a test script for the video...',
                    created_at: '2023-01-01T12:00:00Z'
                };

                const escapeHtmlSpy = jest.fn(text => text.replace(/</g, '&lt;'));
                videoManager.escapeHtml = escapeHtmlSpy;

                videoManager.showVideoDetailModal(video);

                expect(document.body.insertAdjacentHTML).toHaveBeenCalledWith(
                    'beforeend',
                    expect.stringContaining('Test Video')
                );
                expect(document.body.insertAdjacentHTML).toHaveBeenCalledWith(
                    'beforeend',
                    expect.stringContaining('AI Technology')
                );
                expect(document.body.insertAdjacentHTML).toHaveBeenCalledWith(
                    'beforeend',
                    expect.stringContaining('/api/videos/1/file')
                );
            });

            it('should remove existing modal before creating new one', () => {
                const existingModal = { remove: jest.fn() };
                document.getElementById.mockReturnValueOnce(existingModal);

                const video = { id: 1, title: 'Test', topic: 'Test', duration: 15, created_at: '2023-01-01' };
                videoManager.showVideoDetailModal(video);

                expect(existingModal.remove).toHaveBeenCalled();
            });
        });

        describe('bindEvents', () => {
            it('should bind create video button event', () => {
                const mockButton = {
                    addEventListener: jest.fn()
                };
                document.getElementById = jest.fn(id => {
                    if (id === 'createVideoBtn') return mockButton;
                    return null;
                });

                // Re-create VideoManager to trigger bindEvents
                new VideoManager(mockNotificationManager, mockUIManager);

                expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            });

            it('should handle missing create video button', () => {
                document.getElementById = jest.fn(() => null);

                // Should not throw error
                expect(() => {
                    new VideoManager(mockNotificationManager, mockUIManager);
                }).not.toThrow();
            });
        });

        describe('showVideoCreationModal', () => {
            it('should show prompt and create video', () => {
                const mockPrompt = jest.fn(() => 'Machine Learning Basics');
                window.prompt = mockPrompt;

                const createVideoSpy = jest.fn();
                videoManager.createVideo = createVideoSpy;

                videoManager.showVideoCreationModal();

                expect(mockPrompt).toHaveBeenCalledWith('Nhập chủ đề video bạn muốn tạo:');
                expect(createVideoSpy).toHaveBeenCalledWith('Machine Learning Basics');
            });

            it('should cancel if no topic entered', () => {
                window.prompt = jest.fn(() => null);

                const createVideoSpy = jest.fn();
                videoManager.createVideo = createVideoSpy;

                videoManager.showVideoCreationModal();

                expect(createVideoSpy).not.toHaveBeenCalled();
            });
        });

        describe('escapeHtml', () => {
            it('should escape HTML characters', () => {
                const result = videoManager.escapeHtml('<script>alert("xss")</script>');
                expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
            });

            it('should handle empty string', () => {
                const result = videoManager.escapeHtml('');
                expect(result).toBe('');
            });
        });

        describe('Edge Cases', () => {
            it('should handle SocketIO initialization failure', () => {
                window.io = jest.fn(() => {
                    throw new Error('SocketIO failed');
                });

                expect(() => {
                    new VideoManager(mockNotificationManager, mockUIManager);
                }).not.toThrow();
            });

            it('should handle missing video data in progress', () => {
                videoManager.currentVideoJob = 'test-job';
                
                const progressData = {
                    job_id: 'test-job',
                    step: 'completed',
                    message: 'Done',
                    progress: 100
                    // Missing data field
                };

                expect(() => {
                    videoManager.handleVideoProgress(progressData);
                }).not.toThrow();

                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith(
                    expect.not.stringContaining('/videos/')
                );
            });

            it('should handle very long topic names', () => {
                const longTopic = 'Very long topic name '.repeat(50);
                
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({ success: true, job_id: 'long-topic' })
                });

                expect(async () => {
                    await videoManager.createVideo(longTopic);
                }).not.toThrow();
            });
        });
    });
}

// Export function for test runner
global.runVideoManagerTests = runVideoManagerTests;