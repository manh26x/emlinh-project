/**
 * Quick Fix: Add setupUIManagerTest() to all remaining UIManager tests
 * TODO: Remove this quick-fix script when test runner issues are permanently addressed
 */

const fs = require('fs');

const testFile = 'tests/frontend/tests/UIManager.test.js';
let content = fs.readFileSync(testFile, 'utf8');

// Pattern để match các it() tests chưa có setupUIManagerTest()
const patterns = [
    // Video embedding tests
    { old: `it('should detect and embed video ID patterns', () => {`, new: `it('should detect and embed video ID patterns', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should extract video title from message', () => {`, new: `it('should extract video title from message', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should not embed video when no ID found', () => {`, new: `it('should not embed video when no ID found', () => {\n                setupUIManagerTest();\n                ` },
    
    // addAIMessageWithVideo
    { old: `it('should add AI message with video content', () => {`, new: `it('should add AI message with video content', () => {\n                setupUIManagerTest();\n                ` },
    
    // Error handling
    { old: `it('should display error message as AI message', () => {`, new: `it('should display error message as AI message', () => {\n                setupUIManagerTest();\n                ` },
    
    // Chat management
    { old: `it('should clear all chat messages', () => {`, new: `it('should clear all chat messages', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should add welcome message with features list', () => {`, new: `it('should add welcome message with features list', () => {\n                setupUIManagerTest();\n                ` },
    
    // Typing indicator tests
    { old: `it('should show typing indicator', () => {`, new: `it('should show typing indicator', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should show typing indicator with custom message', () => {`, new: `it('should show typing indicator with custom message', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should update typing indicator with progress', () => {`, new: `it('should update typing indicator with progress', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should hide typing indicator', () => {`, new: `it('should hide typing indicator', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should handle typing indicator with line breaks', () => {`, new: `it('should handle typing indicator with line breaks', () => {\n                setupUIManagerTest();\n                ` },
    
    // Loading state tests
    { old: `it('should set loading state on send button and input', () => {`, new: `it('should set loading state on send button and input', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should clear loading state', () => {`, new: `it('should clear loading state', () => {\n                setupUIManagerTest();\n                ` },
    
    // Chat type UI tests
    { old: `it('should update placeholder for conversation type', () => {`, new: `it('should update placeholder for conversation type', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should update placeholder for brainstorm type', () => {`, new: `it('should update placeholder for brainstorm type', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should update placeholder for planning type', () => {`, new: `it('should update placeholder for planning type', () => {\n                setupUIManagerTest();\n                ` },
    
    // Input management tests  
    { old: `it('should set message input value and focus', () => {`, new: `it('should set message input value and focus', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should get trimmed message input', () => {`, new: `it('should get trimmed message input', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should clear message input', () => {`, new: `it('should clear message input', () => {\n                setupUIManagerTest();\n                ` },
    
    // Scroll and HTML tests
    { old: `it('should scroll to bottom', () => {`, new: `it('should scroll to bottom', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should escape HTML characters', () => {`, new: `it('should escape HTML characters', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should handle empty string', () => {`, new: `it('should handle empty string', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should handle null and undefined', () => {`, new: `it('should handle null and undefined', () => {\n                setupUIManagerTest();\n                ` },
    
    // Edge cases
    { old: `it('should handle missing DOM elements gracefully', () => {`, new: `it('should handle missing DOM elements gracefully', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should handle very long messages', () => {`, new: `it('should handle very long messages', () => {\n                setupUIManagerTest();\n                ` },
    { old: `it('should handle special characters in messages', () => {`, new: `it('should handle special characters in messages', () => {\n                setupUIManagerTest();\n                ` }
];

// Apply patterns
patterns.forEach(pattern => {
    content = content.replace(pattern.old, pattern.new);
});

fs.writeFileSync(testFile, content);
console.log('✅ Applied setupUIManagerTest() to all remaining UIManager tests');
console.log(`📊 Applied ${patterns.length} patterns`);
console.log('🚀 Ready to test improved results!');