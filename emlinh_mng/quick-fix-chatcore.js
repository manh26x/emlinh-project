/**
 * Quick Fix: Add setupChatCoreTest() to all ChatCore tests
 */

const fs = require('fs');

const testFile = 'tests/frontend/tests/ChatCore.test.simplified.js';
let content = fs.readFileSync(testFile, 'utf8');

// Pattern để match các it() tests chưa có setupChatCoreTest()
const patterns = [
    // sendMessage tests
    { old: `it('should not send empty messages', async () => {`, new: `it('should not send empty messages', async () => {\n                setupChatCoreTest();\n                ` },
    { old: `it('should not send messages when loading', async () => {`, new: `it('should not send messages when loading', async () => {\n                setupChatCoreTest();\n                ` },
    { old: `it('should send valid messages successfully', async () => {`, new: `it('should send valid messages successfully', async () => {\n                setupChatCoreTest();\n                ` },
    { old: `it('should handle API errors gracefully', async () => {`, new: `it('should handle API errors gracefully', async () => {\n                setupChatCoreTest();\n                ` },
    { old: `it('should handle network errors', async () => {`, new: `it('should handle network errors', async () => {\n                setupChatCoreTest();\n                ` },
    
    // setMessageType test
    { old: `it('should set message type and update UI', () => {`, new: `it('should set message type and update UI', () => {\n                setupChatCoreTest();\n                ` },
    
    // setLoading test
    { old: `it('should update loading state', () => {`, new: `it('should update loading state', () => {\n                setupChatCoreTest();\n                ` },
    
    // createVideoDisplayHTML test
    { old: `it('should create proper video HTML', () => {`, new: `it('should create proper video HTML', () => {\n                setupChatCoreTest();\n                ` },
    
    // truncateText tests
    { old: `it('should truncate long text', () => {`, new: `it('should truncate long text', () => {\n                setupChatCoreTest();\n                ` },
    { old: `it('should not truncate short text', () => {`, new: `it('should not truncate short text', () => {\n                setupChatCoreTest();\n                ` },
    
    // useQuickPrompt test
    { old: `it('should set message type and input, then auto-send', () => {`, new: `it('should set message type and input, then auto-send', () => {\n                setupChatCoreTest();\n                ` }
];

// Apply patterns
patterns.forEach(pattern => {
    content = content.replace(pattern.old, pattern.new);
});

fs.writeFileSync(testFile, content);
console.log('✅ Applied setupChatCoreTest() to all ChatCore tests');
console.log(`📊 Applied ${patterns.length} patterns`);
console.log('🚀 Ready to test ChatCore improvements!');