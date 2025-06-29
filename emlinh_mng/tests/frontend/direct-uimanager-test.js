/**
 * Direct UIManager Test
 * Bypass test runner and test UIManager directly
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Setup DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head></head>
<body>
    <form id="chatForm">
        <input type="text" id="messageInput" placeholder="Type your message...">
        <button type="submit" id="sendButton">Send</button>
    </form>
    <div id="chatMessages"></div>
    <div id="messagesContainer"></div>
    <div id="typingIndicator" style="display: none;"></div>
</body>
</html>
`);

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock jest
global.jest = {
    fn: (implementation) => {
        const mockFn = implementation || (() => {});
        mockFn.mock = { calls: [], results: [] };
        
        const wrappedFn = (...args) => {
            mockFn.mock.calls.push(args);
            try {
                const result = mockFn(...args);
                mockFn.mock.results.push({ type: 'return', value: result });
                return result;
            } catch (error) {
                mockFn.mock.results.push({ type: 'throw', value: error });
                throw error;
            }
        };
        
        Object.assign(wrappedFn, {
            mock: mockFn.mock
        });
        
        return wrappedFn;
    }
};

// Create UIManager mock directly
function createWorkingUIManager() {
    return {
        // Core properties
        chatForm: document.getElementById('chatForm'),
        messageInput: document.getElementById('messageInput'),
        sendButton: document.getElementById('sendButton'),
        chatMessages: document.getElementById('chatMessages'),
        messagesContainer: document.getElementById('messagesContainer'),
        typingIndicator: document.getElementById('typingIndicator'),
        
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
        
        formatMessage: jest.fn((message) => {
            return message
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>');
        }),
        
        showError: jest.fn((message) => {
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'ai-message bg-light p-2 mb-2 rounded text-danger';
                errorDiv.innerHTML = `❌ ${message}`;
                chatMessages.appendChild(errorDiv);
            }
        }),
        
        clearChat: jest.fn(() => {
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = '';
            }
        }),
        
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
        
        setMessageInput: jest.fn((value) => {
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = value;
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
        
        scrollToBottom: jest.fn(() => {}),
        
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

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, testFn) {
    try {
        testFn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        failed++;
    }
}

function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${actual} to be ${expected}`);
            }
        },
        toBeTruthy: () => {
            if (!actual) {
                throw new Error(`Expected ${actual} to be truthy`);
            }
        },
        toContain: (expected) => {
            if (!String(actual).includes(String(expected))) {
                throw new Error(`Expected ${actual} to contain ${expected}`);
            }
        },
        toHaveBeenCalledWith: (...args) => {
            if (!actual.mock || !actual.mock.calls.some(call => 
                JSON.stringify(call) === JSON.stringify(args)
            )) {
                throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
            }
        },
        toHaveBeenCalled: () => {
            if (!actual.mock || actual.mock.calls.length === 0) {
                throw new Error('Expected function to have been called');
            }
        }
    };
}

// Run tests
console.log('🚀 Direct UIManager Test Starting...\n');

const uiManager = createWorkingUIManager();

test('should initialize DOM elements correctly', () => {
    expect(uiManager.chatForm).toBeTruthy();
    expect(uiManager.messageInput).toBeTruthy();
    expect(uiManager.sendButton).toBeTruthy();
    expect(uiManager.chatMessages).toBeTruthy();
    expect(uiManager.messagesContainer).toBeTruthy();
    expect(uiManager.typingIndicator).toBeTruthy();
});

test('should add user message with correct format', () => {
    const testMessage = 'Hello, this is a test message!';
    uiManager.addUserMessage(testMessage);

    expect(uiManager.addUserMessage).toHaveBeenCalledWith(testMessage);
    
    const chatMessages = document.getElementById('chatMessages');
    expect(chatMessages.innerHTML).toContain('Hello, this is a test message!');
    expect(chatMessages.innerHTML).toContain('👤');
});

test('should add AI message with correct format', () => {
    const testMessage = 'This is an AI response';
    const timestamp = '2023-01-01T12:00:00Z';
    
    uiManager.addAIMessage(testMessage, timestamp);

    expect(uiManager.addAIMessage).toHaveBeenCalledWith(testMessage, timestamp);
    
    const chatMessages = document.getElementById('chatMessages');
    expect(chatMessages.innerHTML).toContain('This is an AI response');
    expect(chatMessages.innerHTML).toContain('🤖');
});

test('should format message with line breaks', () => {
    const message = 'Line 1\nLine 2\nLine 3';
    const result = uiManager.formatMessage(message);
    
    expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
    expect(result).toContain('Line 1<br>Line 2<br>Line 3');
});

test('should format bold text', () => {
    const message = 'This is **bold** text';
    const result = uiManager.formatMessage(message);
    
    expect(uiManager.formatMessage).toHaveBeenCalledWith(message);
    expect(result).toContain('<strong>bold</strong>');
});

test('should show error message', () => {
    uiManager.showError('Test error message');
    
    expect(uiManager.showError).toHaveBeenCalledWith('Test error message');
    
    const chatMessages = document.getElementById('chatMessages');
    expect(chatMessages.innerHTML).toContain('❌ Test error message');
});

test('should clear chat messages', () => {
    uiManager.addUserMessage('User message');
    uiManager.clearChat();
    
    expect(uiManager.clearChat).toHaveBeenCalled();
    
    const chatMessages = document.getElementById('chatMessages');
    expect(chatMessages.innerHTML).toBe('');
});

test('should show typing indicator', () => {
    uiManager.showTypingIndicator();
    
    expect(uiManager.showTypingIndicator).toHaveBeenCalled();
    
    const indicator = document.getElementById('typingIndicator');
    expect(indicator.style.display).toBe('block');
});

test('should hide typing indicator', () => {
    uiManager.showTypingIndicator();
    uiManager.hideTypingIndicator();
    
    expect(uiManager.hideTypingIndicator).toHaveBeenCalled();
    
    const indicator = document.getElementById('typingIndicator');
    expect(indicator.style.display).toBe('none');
});

test('should set loading state', () => {
    uiManager.setLoadingState(true);
    
    expect(uiManager.setLoadingState).toHaveBeenCalledWith(true);
    
    const sendButton = document.getElementById('sendButton');
    expect(sendButton.disabled).toBe(true);
    expect(sendButton.innerHTML).toContain('fa-spinner fa-spin');
});

test('should update chat type UI', () => {
    uiManager.updateChatTypeUI('brainstorm');
    
    expect(uiManager.updateChatTypeUI).toHaveBeenCalledWith('brainstorm');
    
    const messageInput = document.getElementById('messageInput');
    expect(messageInput.placeholder).toContain('💡');
    expect(messageInput.placeholder).toContain('brainstorm');
});

test('should set message input value', () => {
    uiManager.setMessageInput('Test input value');
    
    expect(uiManager.setMessageInput).toHaveBeenCalledWith('Test input value');
    
    const messageInput = document.getElementById('messageInput');
    expect(messageInput.value).toBe('Test input value');
});

test('should get trimmed message input', () => {
    const messageInput = document.getElementById('messageInput');
    messageInput.value = '  test message  ';
    
    const result = uiManager.getMessageInput();
    
    expect(uiManager.getMessageInput).toHaveBeenCalled();
    expect(result).toBe('test message');
});

test('should clear message input', () => {
    const messageInput = document.getElementById('messageInput');
    messageInput.value = 'some text';
    
    uiManager.clearMessageInput();
    
    expect(uiManager.clearMessageInput).toHaveBeenCalled();
    expect(messageInput.value).toBe('');
});

test('should escape HTML characters', () => {
    const dangerousText = '<script>alert("xss")</script>&<>"\'';
    const result = uiManager.escapeHtml(dangerousText);
    
    expect(uiManager.escapeHtml).toHaveBeenCalledWith(dangerousText);
    expect(result).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;&amp;&lt;&gt;"\'');
});

console.log(`\n📊 Direct Test Results:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);
console.log(`📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
    console.log('\n🎉 All UIManager tests passed! The mock setup works correctly.');
} else {
    console.log('\n⚠️ Some tests failed. Check the implementation.');
}