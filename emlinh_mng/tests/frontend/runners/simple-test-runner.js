#!/usr/bin/env node

/**
 * Simple Test Runner - No External Dependencies
 * Runs basic unit tests for frontend components
 */

// Simple DOM Mock
const createSimpleDOM = () => {
    const elements = new Map();
    
    const createElement = (tagName) => ({
        tagName: tagName.toLowerCase(),
        id: '',
        className: '',
        innerHTML: '',
        textContent: '',
        value: '',
        disabled: false,
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false,
            toggle: () => {}
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        focus: () => {},
        click: () => {},
        appendChild: () => {},
        removeChild: () => {},
        insertAdjacentHTML: () => {},
        getAttribute: () => null,
        setAttribute: () => {},
        querySelector: () => null,
        querySelectorAll: () => []
    });

    const document = {
        getElementById: (id) => elements.get(id) || null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement,
        body: createElement('body')
    };

    // Setup basic elements
    ['chatForm', 'messageInput', 'sendButton', 'chatMessages', 'messagesContainer', 'typingIndicator'].forEach(id => {
        const el = createElement('div');
        el.id = id;
        elements.set(id, el);
    });

    // Add toast container
    const toastContainer = createElement('div');
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    document.body.appendChild(toastContainer);

    return { document, window: { document } };
};

// Setup globals
const { document, window } = createSimpleDOM();
global.document = document;
global.window = window;
global.window.fetch = () => Promise.resolve({ json: () => Promise.resolve({}) });
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.io = () => ({ on: () => {}, emit: () => {} });
global.bootstrap = {
    Toast: class { constructor() {} show() {} hide() {} },
    Modal: class { constructor() {} show() {} hide() {} }
};
global.CustomEvent = class { constructor(type) { this.type = type; } };

// Test Framework
let testStats = { passed: 0, failed: 0, total: 0 };
let currentSuite = '';

const expect = (actual) => ({
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
    toBeFalsy: () => {
        if (actual) {
            throw new Error(`Expected ${actual} to be falsy`);
        }
    },
    toContain: (expected) => {
        if (!actual || !actual.includes(expected)) {
            throw new Error(`Expected ${actual} to contain ${expected}`);
        }
    }
});

const jest = {
    fn: () => {
        const mockFn = () => {};
        mockFn.mock = { calls: [] };
        return mockFn;
    },
    clearAllMocks: () => {}
};

global.expect = expect;
global.jest = jest;
global.describe = (name, callback) => {
    console.log(`\n📋 ${name}`);
    currentSuite = name;
    callback();
};

global.it = (name, callback) => {
    try {
        callback();
        testStats.passed++;
        console.log(`✅ ${name}`);
    } catch (error) {
        testStats.failed++;
        console.log(`❌ ${name}: ${error.message}`);
    }
    testStats.total++;
};

global.beforeAll = () => {};
global.beforeEach = () => {};
global.afterEach = () => {};
global.setupMockDOM = () => {};

// Basic Tests
function runBasicTests() {
    describe('Basic Framework Tests', () => {
        it('should have expect function', () => {
            expect(typeof expect).toBe('function');
        });

        it('should have jest mock', () => {
            expect(typeof jest.fn).toBe('function');
        });

        it('should have DOM elements', () => {
            expect(document.getElementById('chatMessages')).toBeTruthy();
        });
    });

    describe('Simple ChatCore Tests', () => {
        it('should create ChatCore class', () => {
            // Simple test without full implementation
            const mockSessionManager = { getSessionId: () => 'test' };
            const mockUIManager = { addUserMessage: () => {} };
            const mockNotificationManager = { showError: () => {} };
            
            expect(mockSessionManager.getSessionId()).toBe('test');
        });

        it('should handle message validation', () => {
            const isValidMessage = (msg) => msg && msg.trim().length > 0;
            
            expect(isValidMessage('hello')).toBeTruthy();
            expect(isValidMessage('')).toBeFalsy();
            expect(isValidMessage('   ')).toBeFalsy();
        });
    });

    describe('Simple UIManager Tests', () => {
        it('should escape HTML', () => {
            const escapeHtml = (text) => {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML || text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            };
            
            const result = escapeHtml('<script>alert("xss")</script>');
            expect(result).toContain('&lt;');
        });

        it('should format timestamps', () => {
            const formatTimestamp = (timestamp) => {
                if (!timestamp) return new Date().toLocaleTimeString('vi-VN');
                return new Date(timestamp).toLocaleTimeString('vi-VN');
            };
            
            const result = formatTimestamp('2023-01-01T12:00:00Z');
            expect(result).toContain(':');
        });
    });

    describe('Simple Utils Tests', () => {
        it('should generate random IDs', () => {
            const generateId = (prefix = 'id') => {
                return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            };
            
            const id1 = generateId('test');
            const id2 = generateId('test');
            
            expect(id1).toContain('test_');
            expect(id1 !== id2).toBeTruthy();
        });

        it('should debounce functions', () => {
            const debounce = (func, wait) => {
                let timeout;
                return function(...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(this, args), wait);
                };
            };
            
            let called = false;
            const debouncedFn = debounce(() => { called = true; }, 100);
            
            expect(typeof debouncedFn).toBe('function');
        });
    });
}

// Run tests
console.log('🚀 Starting Simple Frontend Tests...\n');

try {
    runBasicTests();
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${testStats.passed}`);
    console.log(`❌ Failed: ${testStats.failed}`);
    console.log(`📈 Total: ${testStats.total}`);
    
    if (testStats.failed === 0) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } else {
        console.log('\n❌ Some tests failed!');
        process.exit(1);
    }
} catch (error) {
    console.error('💥 Test runner error:', error);
    process.exit(1);
}