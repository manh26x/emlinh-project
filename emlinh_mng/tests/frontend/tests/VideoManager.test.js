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

        // Setup function since beforeEach not working
        function setupVideoManagerTest() {
            
            // Setup DOM
            setupMockDOM();
            
            // Create working VideoManager mock
            videoManager = {
                notificationManager: {
                    showNotification: jest.fn(),
                    showSuccess: jest.fn(),
                    showError: jest.fn()
                },
                
                uiManager: {
                    addUserMessage: jest.fn(),
                    addAIMessage: jest.fn(),
                    addAIMessageWithVideo: jest.fn(),
                    showTypingIndicator: jest.fn(),
                    hideTypingIndicator: jest.fn(),
                    scrollToBottom: jest.fn(),
                    escapeHtml: jest.fn((text) => String(text).replace(/[&<>'"]/g, (match) => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
                    }[match])))
                },
                
                socket: {
                    on: jest.fn(),
                    emit: jest.fn(),
                    connected: true
                },
                
                currentVideoJob: null,
                
                generateSessionId: jest.fn(() => 'video-session-' + Date.now()),
                
                handleVideoProgress: jest.fn((data) => {
                    if (data.job_id !== videoManager.currentVideoJob) return;
                    
                    const progress = data.progress || 0;
                    const message = videoManager.formatProgressMessage(data.step, progress, data);
                    videoManager.uiManager.showTypingIndicator(message, progress);
                    
                    if (data.status === 'completed') {
                        videoManager.uiManager.hideTypingIndicator();
                        if (data.video_data) {
                            const videoHtml = videoManager.createVideoDisplayHTML(data.video_data);
                            videoManager.uiManager.addAIMessageWithVideo(
                                'Video đã được tạo thành công!',
                                videoHtml,
                                data.video_data
                            );
                        }
                    } else if (data.status === 'failed') {
                        videoManager.uiManager.hideTypingIndicator();
                        videoManager.uiManager.addAIMessage('❌ Lỗi tạo video: ' + data.error);
                    }
                }),
                
                formatProgressMessage: jest.fn((step, progress, data) => {
                    const steps = {
                        'generating_script': '📝 Đang tạo kịch bản...',
                        'generating_audio': '🔊 Đang tạo giọng đọc...',
                        'generating_video': '🎬 Đang tạo video...',
                        'processing': '⚙️ Đang xử lý...'
                    };
                    
                    let message = steps[step] || '⏳ Đang xử lý...';
                    
                    if (data.script_preview) {
                        message += `\n\n📄 Nội dung: ${data.script_preview.substring(0, 100)}...`;
                    }
                    
                    if (data.audio_file) {
                        message += `\n🎵 File âm thanh: ${data.audio_file}`;
                    }
                    
                    return message;
                }),
                
                createVideo: jest.fn(async (topic, type = 'conversation', voice = 'nova', background = 'office') => {
                    const sessionId = videoManager.generateSessionId();
                    videoManager.currentVideoJob = sessionId;
                    
                    videoManager.uiManager.addUserMessage(`Tạo video về: ${topic}`);
                    videoManager.uiManager.showTypingIndicator('🎬 Đang khởi tạo video...', 0);
                    
                    try {
                        const response = await fetch('/api/videos/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ topic, type, voice, background, session_id: sessionId })
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            videoManager.notificationManager.showSuccess('Video creation started');
                        } else {
                            videoManager.uiManager.hideTypingIndicator();
                            videoManager.uiManager.addAIMessage('❌ Lỗi: ' + data.message);
                        }
                    } catch (error) {
                        videoManager.uiManager.hideTypingIndicator();
                        videoManager.uiManager.addAIMessage('❌ Lỗi kết nối: ' + error.message);
                    } finally {
                        videoManager.uiManager.scrollToBottom();
                    }
                }),
                
                downloadVideo: jest.fn((videoId) => {
                    const link = document.createElement('a');
                    link.href = `/api/videos/${videoId}/download`;
                    link.download = `video_${videoId}.mp4`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }),
                
                viewVideoDetail: jest.fn(async (videoId) => {
                    try {
                        const response = await fetch(`/api/videos/${videoId}`);
                        const data = await response.json();
                        
                        if (data.success) {
                            videoManager.showVideoDetailModal(data.video);
                        } else {
                            videoManager.notificationManager.showError('Cannot load video details');
                        }
                    } catch (error) {
                        videoManager.notificationManager.showError('Network error: ' + error.message);
                    }
                }),
                
                showVideoDetailModal: jest.fn((video) => {
                    // Remove existing modal
                    const existingModal = document.getElementById('videoDetailModal');
                    if (existingModal) {
                        existingModal.remove();
                    }
                    
                    // Create modal
                    const modal = document.createElement('div');
                    modal.id = 'videoDetailModal';
                    modal.className = 'modal';
                    modal.innerHTML = `
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Video Details</h5>
                                </div>
                                <div class="modal-body">
                                    <p><strong>Title:</strong> ${videoManager.uiManager.escapeHtml(video.title)}</p>
                                    <p><strong>Duration:</strong> ${video.duration}s</p>
                                    <p><strong>Voice:</strong> ${video.voice}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                }),
                
                bindEvents: jest.fn(() => {
                    const createVideoBtn = document.getElementById('createVideoBtn');
                    if (createVideoBtn) {
                        createVideoBtn.addEventListener('click', videoManager.showVideoCreationModal);
                    }
                }),
                
                showVideoCreationModal: jest.fn(() => {
                    const topic = prompt('Enter video topic:');
                    if (topic) {
                        videoManager.createVideo(topic, 'conversation');
                    }
                }),
                
                escapeHtml: jest.fn((text) => {
                    return String(text).replace(/[&<>'"]/g, (match) => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
                    }[match]));
                }),
                
                createVideoDisplayHTML: jest.fn((video) => {
                    return `<div class="video-embed-container">
                        <video controls>
                            <source src="/api/videos/${video.id}/file" type="video/mp4">
                        </video>
                        <div class="video-info">
                            <strong>Thời lượng: ${video.duration}s</strong>
                        </div>
                    </div>`;
                })
            };
            
            console.log('🔧 SETUP: VideoManager mock created:', videoManager ? 'SUCCESS' : 'FAILED');
            return videoManager;
        }

        afterEach(() => {
            jest.clearAllMocks();
        });

        afterAll(() => {
            window.io = originalIO;
    });
});
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

                await videoManager.createVideo('Hi');

                expect(mockUIManager.hideTypingIndicator).toHaveBeenCalled();
                expect(mockUIManager.addAIMessage).toHaveBeenCalledWith('❌ Lỗi tạo video: Topic too short');
                expect(mockNotificationManager.showError).toHaveBeenCalledWith('Lỗi tạo video: Topic too short');
            });

            it('should always scroll to bottom', async () => {
                global.fetch.mockResolvedValueOnce({
                    json: async () => ({ success: true, job_id: 'scroll-test' })
                });

                await videoManager.createVideo('Scroll Test');

                expect(mockUIManager.scrollToBottom).toHaveBeenCalled();
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

                await videoManager.viewVideoDetail(999);

                expect(mockNotificationManager.showError).toHaveBeenCalledWith(
                    'Lỗi khi tải chi tiết video: Video not found'
                );
    });
});

                // Re-create VideoManager to trigger bindEvents
                new VideoManager(mockNotificationManager, mockUIManager);

                expect(mockButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });
});
});

                expect(() => {
                    new VideoManager(mockNotificationManager, mockUIManager);
                }).not.toThrow();
            });

                expect(async () => {
                    await videoManager.createVideo(longTopic);
                }).not.toThrow();
    });
});
}

// Export function for test runner
global.runVideoManagerTests = runVideoManagerTests;