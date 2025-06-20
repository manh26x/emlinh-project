// Debug Script for Video Embedding
// Paste this into browser console to debug video embedding issues

console.log('🔍 Starting Video Embedding Debug...');

// 1. Check if ChatManager is available
console.log('1. ChatManager available:', !!window.chatManager);
console.log('2. UIManager available:', !!window.chatManager?.uiManager);

// 2. Check existing messages
const aiMessages = document.querySelectorAll('.ai-message .message-content > div');
console.log(`3. Found ${aiMessages.length} AI messages`);

// 3. Analyze each message
aiMessages.forEach((messageDiv, index) => {
    const text = messageDiv.textContent;
    const html = messageDiv.innerHTML;
    
    console.log(`\n--- Message ${index + 1} ---`);
    console.log('Text preview:', text.substring(0, 100) + '...');
    console.log('Contains /videos/:', text.includes('/videos/'));
    console.log('Contains Video ID:', text.includes('Video ID'));
    console.log('Contains video (lowercase):', text.toLowerCase().includes('video'));
    console.log('Contains tại đây:', text.includes('tại đây'));
    console.log('Already has video embed:', html.includes('video-embed-container'));
    
    // Test pattern matching
    const patterns = [
        /🆔 <strong>Video ID:<\/strong> (\d+)/,
        /\/videos\/(\d+)/,
        /Video ID[:\s]+(\d+)/i,
        /tại đây:\s*\/videos\/(\d+)/
    ];
    
    patterns.forEach((pattern, i) => {
        const match = text.match(pattern);
        if (match) {
            console.log(`✅ Pattern ${i+1} matches: Video ID ${match[1]}`);
        }
    });
});

// 4. Test formatMessage function
console.log('\n🧪 Testing formatMessage function...');
const testMessages = [
    "Video tại đây: /videos/6",
    "🆔 Video ID: 123",
    "Video đã được tạo với Video ID 456",
    "✅ Video đã được tạo thành công chủ đề Python với thời gian 7 giây! Bạn có thể xem video này tại đây: /videos/6."
];

testMessages.forEach((msg, i) => {
    console.log(`\nTest ${i+1}: "${msg}"`);
    if (window.chatManager?.uiManager) {
        const result = window.chatManager.uiManager.formatMessage(msg);
        console.log('Contains video embed:', result.includes('video-embed-container'));
        if (result.includes('video-embed-container')) {
            console.log('✅ Video embed would be added');
        } else {
            console.log('❌ No video embed would be added');
        }
    }
});

// 5. Quick functions to test
console.log('\n🛠️ Quick test functions:');
console.log('Add test message: addTestVideoMessage()');
console.log('Reprocess messages: reprocessMessages()');

window.debugReprocessMessages = function() {
    console.log('🔄 Running reprocessMessages with debug...');
    return window.reprocessMessages();
};

window.addTestVideoMessage = function() {
    console.log('🧪 Adding test video message...');
    if (window.chatManager?.uiManager) {
        const testMsg = "✅ Video đã được tạo thành công chủ đề Python với thời gian 7 giây! Bạn có thể xem video này tại đây: /videos/6. Chúc bạn có một ngày tuyệt vời!";
        window.chatManager.uiManager.addAIMessage(testMsg);
        console.log('✅ Test message added');
    } else {
        console.error('❌ ChatManager/UIManager not available');
    }
};

console.log('\n✅ Debug script loaded. Run debugReprocessMessages() or addTestVideoMessage() to test.'); 