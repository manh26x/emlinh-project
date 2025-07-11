/**
 * Debug script để test SocketIO connection và events
 * Chạy script này trong browser console để debug
 */

console.log('🔧 [DEBUG] Starting SocketIO debug...');

// 1. Test SocketManager connection
function testSocketConnection() {
    console.log('🔌 [DEBUG] Testing SocketManager connection...');
    
    if (window.socketManager) {
        console.log('✅ [DEBUG] SocketManager found');
        console.log('📊 [DEBUG] Connection status:', window.socketManager.isSocketConnected());
        console.log('🆔 [DEBUG] Socket ID:', window.socketManager.getSocketId());
        console.log('📋 [DEBUG] Current session:', window.socketManager.sessionId);
    } else {
        console.error('❌ [DEBUG] SocketManager not found!');
    }
}

// 2. Test VideoManager
function testVideoManager() {
    console.log('🎬 [DEBUG] Testing VideoManager...');
    
    if (window.videoManager) {
        console.log('✅ [DEBUG] VideoManager found');
        console.log('📋 [DEBUG] VideoManager session ID:', window.videoManager.sessionId);
        console.log('🎬 [DEBUG] Current video job:', window.videoManager.currentVideoJob);
    } else if (window.chatManager && window.chatManager.videoManager) {
        console.log('✅ [DEBUG] VideoManager found via ChatManager');
        console.log('📋 [DEBUG] VideoManager session ID:', window.chatManager.videoManager.sessionId);
        console.log('🎬 [DEBUG] Current video job:', window.chatManager.videoManager.currentVideoJob);
    } else {
        console.error('❌ [DEBUG] VideoManager not found!');
    }
}

// 3. Test manual video progress event
function testManualProgressEvent() {
    console.log('📺 [DEBUG] Testing manual video progress event...');
    
    const testData = {
        job_id: 'test-debug-job-123',
        step: 'script_completed',
        message: 'Test debug message - script completed',
        progress: 35,
        data: {
            script_preview: 'This is a test script preview for debugging...',
            topic: 'Debug Test Topic',
            video_id: 999
        }
    };
    
    if (window.videoManager) {
        window.videoManager.handleVideoProgress(testData);
    } else if (window.chatManager && window.chatManager.videoManager) {
        window.chatManager.videoManager.handleVideoProgress(testData);
    } else {
        console.error('❌ [DEBUG] No VideoManager to test with!');
    }
}

// 4. Listen for all SocketIO events
function listenToAllEvents() {
    console.log('👂 [DEBUG] Setting up event listeners...');
    
    if (window.socketManager && window.socketManager.socket) {
        const originalEmit = window.socketManager.socket.emit;
        const originalOn = window.socketManager.socket.on;
        
        // Log all outgoing events
        window.socketManager.socket.emit = function(...args) {
            console.log('📤 [DEBUG] Emitting:', args);
            return originalEmit.apply(this, args);
        };
        
        // Log all video_progress events
        window.socketManager.socket.on('video_progress', (data) => {
            console.log('📥 [DEBUG] Received video_progress:', data);
        });
        
        // Log connect/disconnect
        window.socketManager.socket.on('connect', () => {
            console.log('🔌 [DEBUG] Socket connected');
        });
        
        window.socketManager.socket.on('disconnect', (reason) => {
            console.log('🔌 [DEBUG] Socket disconnected:', reason);
        });
        
        console.log('✅ [DEBUG] Event listeners setup complete');
    } else {
        console.error('❌ [DEBUG] No socket found to listen to!');
    }
}

// 5. Test session join manually
function testSessionJoin() {
    console.log('📋 [DEBUG] Testing session join...');
    
    if (window.socketManager) {
        const testSessionId = `debug_${Date.now()}`;
        console.log('📋 [DEBUG] Joining test session:', testSessionId);
        window.socketManager.joinSession(testSessionId);
    } else {
        console.error('❌ [DEBUG] No SocketManager to test with!');
    }
}

// 6. Main debug function
function runDebugTests() {
    console.log('🚀 [DEBUG] Running all debug tests...');
    console.log('=' * 50);
    
    testSocketConnection();
    testVideoManager();
    listenToAllEvents();
    
    // Test manual event after 2 seconds
    setTimeout(() => {
        testManualProgressEvent();
    }, 2000);
    
    // Test session join after 3 seconds
    setTimeout(() => {
        testSessionJoin();
    }, 3000);
    
    console.log('💡 [DEBUG] Debug tests initiated. Check console for results.');
    console.log('💡 [DEBUG] To test real video creation, use: testVideoCreation()');
}

// 7. Test real video creation
function testVideoCreation() {
    console.log('🎬 [DEBUG] Testing real video creation...');
    
    if (window.chatManager && window.chatManager.videoManager) {
        window.chatManager.videoManager.createVideo(
            'Debug test video creation',
            10, // duration
            'Scene-Landscape',
            'office',
            'nova'
        );
    } else if (window.videoManager) {
        window.videoManager.createVideo(
            'Debug test video creation',
            10,
            'Scene-Landscape', 
            'office',
            'nova'
        );
    } else {
        console.error('❌ [DEBUG] No VideoManager found for testing!');
    }
}

// Export functions to global scope
window.debugSocketIO = {
    runAll: runDebugTests,
    testSocket: testSocketConnection,
    testVideoManager: testVideoManager,
    testManualEvent: testManualProgressEvent,
    testSessionJoin: testSessionJoin,
    testVideoCreation: testVideoCreation,
    listenToAll: listenToAllEvents
};

console.log('✅ [DEBUG] Debug functions available at window.debugSocketIO');
console.log('💡 [DEBUG] Run window.debugSocketIO.runAll() to start debugging');

// Auto-run if in debug mode
if (window.location.search.includes('debug=true')) {
    runDebugTests();
} 