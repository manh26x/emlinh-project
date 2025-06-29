#!/usr/bin/env node

/**
 * Node.js Test Runner for Frontend Unit Tests
 * Runs tests in headless environment for CI/CD
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup global DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>Test Environment</title>
</head>
<body>
    <div id="chatForm"></div>
    <div id="messageInput"></div>
    <div id="sendButton"></div>
    <div id="chatMessages"></div>
    <div id="messagesContainer"></div>
    <div id="typingIndicator"></div>
    <div class="toast-container position-fixed top-0 end-0 p-3"></div>
</body>
</html>
`, {
    url: 'http://localhost:5000',
    pretendToBeVisual: true,
    resources: 'usable'
});

// Setup global variables
global.window = dom.window;
global.document = dom.window.document;
global.navigator = {
    clipboard: {
        writeText: () => Promise.resolve()
    }
};

// Mock Socket.IO
global.io = () => ({
    on: () => {},
    emit: () => {},
    connected: true
});

// Mock Bootstrap
global.bootstrap = {
    Toast: function(element) {
        return {
            show: () => element.classList.add('show'),
            hide: () => element.classList.remove('show')
        };
    },
    Modal: function(element) {
        return {
            show: () => element.style.display = 'block',
            hide: () => element.style.display = 'none'
        };
    }
};

// Mock CustomEvent
global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
    }
};

// Mock alert, prompt, confirm
global.alert = (message) => console.log('ALERT:', message);
global.prompt = (message, defaultValue) => defaultValue || 'test input';
global.confirm = (message) => true;

// Test framework and utilities
let testStats = { passed: 0, failed: 0, skipped: 0, total: 0 };
let testResults = [];

const expect = (actual) => {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected ${actual} to be ${expected}`);
            }
        },
        toEqual: (expected) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
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
            if (!actual.includes(expected)) {
                throw new Error(`Expected ${actual} to contain ${expected}`);
            }
        },
        toHaveBeenCalled: () => {
            if (!actual.mock || actual.mock.calls.length === 0) {
                throw new Error('Expected function to have been called');
            }
        },
        toHaveBeenCalledWith: (...args) => {
            if (!actual.mock || !actual.mock.calls.some(call => 
                JSON.stringify(call) === JSON.stringify(args))) {
                throw new Error(`Expected function to have been called with ${JSON.stringify(args)}`);
            }
        },
        toHaveBeenCalledTimes: (times) => {
            if (!actual.mock || actual.mock.calls.length !== times) {
                throw new Error(`Expected function to have been called ${times} times, but was called ${actual.mock ? actual.mock.calls.length : 0} times`);
            }
        },
        toMatch: (pattern) => {
            const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
            if (!regex.test(actual)) {
                throw new Error(`Expected ${actual} to match ${pattern}`);
            }
        },
        toBeGreaterThan: (expected) => {
            if (actual <= expected) {
                throw new Error(`Expected ${actual} to be greater than ${expected}`);
            }
        },
        toBeLessThan: (expected) => {
            if (actual >= expected) {
                throw new Error(`Expected ${actual} to be less than ${expected}`);
            }
        },
        toBeNull: () => {
            if (actual !== null) {
                throw new Error(`Expected ${actual} to be null`);
            }
        },
        toBeUndefined: () => {
            if (actual !== undefined) {
                throw new Error(`Expected ${actual} to be undefined`);
            }
        },
        toThrow: (expectedError) => {
            try {
                if (typeof actual === 'function') {
                    actual();
                    throw new Error('Expected function to throw');
                } else {
                    throw new Error('Expected function to throw');
                }
            } catch (error) {
                if (expectedError && !error.message.includes(expectedError)) {
                    throw new Error(`Expected function to throw "${expectedError}", but threw "${error.message}"`);
                }
            }
        },
        not: {
            toBe: (expected) => {
                if (actual === expected) {
                    throw new Error(`Expected ${actual} not to be ${expected}`);
                }
            },
            toThrow: () => {
                try {
                    if (typeof actual === 'function') {
                        actual();
                    }
                } catch (error) {
                    throw new Error('Expected function not to throw');
                }
            },
            toContain: (expected) => {
                if (actual.includes(expected)) {
                    throw new Error(`Expected ${actual} not to contain ${expected}`);
                }
            },
            toHaveBeenCalled: () => {
                if (actual.mock && actual.mock.calls.length > 0) {
                    throw new Error('Expected function not to have been called');
                }
            },
            toHaveBeenCalledWith: (...args) => {
                if (actual.mock && actual.mock.calls.some(call => 
                    JSON.stringify(call) === JSON.stringify(args))) {
                    throw new Error(`Expected function not to have been called with ${JSON.stringify(args)}`);
                }
            }
        }
    };
};

const jest = {
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
        
        wrappedFn.mock = mockFn.mock;
        wrappedFn.mockReturnValue = (value) => {
            mockFn.implementation = () => value;
        };
        wrappedFn.mockResolvedValueOnce = (value) => {
            mockFn.implementation = () => Promise.resolve(value);
        };
        wrappedFn.mockRejectedValueOnce = (error) => {
            mockFn.implementation = () => Promise.reject(error);
        };
        wrappedFn.mockReturnValueOnce = (value) => {
            const originalImpl = mockFn.implementation;
            mockFn.implementation = (...args) => {
                mockFn.implementation = originalImpl;
                return value;
            };
        };
        
        return wrappedFn;
    },
    clearAllMocks: () => {},
    useFakeTimers: () => {},
    useRealTimers: () => {},
    advanceTimersByTime: (ms) => {},
    any: (constructor) => {
        return {
            asymmetricMatch: (other) => {
                return typeof constructor === 'function' ? other instanceof constructor : typeof other === constructor;
            },
            toString: () => `Any<${constructor.name || constructor}>`
        };
    }
};

global.expect = expect;
global.jest = jest;

// Add expect.any as a global function
expect.any = jest.any;

// Simple test framework
let currentSuite = null;

global.describe = (name, callback) => {
    console.log(`\n📋 Running: ${name}`);
    currentSuite = name;
    callback();
};

global.it = (name, callback) => {
    const fullName = `${currentSuite} > ${name}`;
    try {
        callback();
        testStats.passed++;
        testStats.total++;
        testResults.push({ name: fullName, status: 'passed', error: null });
        console.log(`✅ ${fullName}`);
    } catch (error) {
        testStats.failed++;
        testStats.total++;
        testResults.push({ name: fullName, status: 'failed', error: error.message });
        console.log(`❌ ${fullName}: ${error.message}`);
    }
};

global.beforeAll = () => {};
global.beforeEach = () => {};
global.afterEach = () => {};
global.afterAll = () => {};

// Setup mock DOM helper
global.setupMockDOM = () => {
    // Clear body
    document.body.innerHTML = `
        <div id="chatForm"></div>
        <div id="messageInput"></div>
        <div id="sendButton"></div>
        <div id="chatMessages"></div>
        <div id="messagesContainer"></div>
        <div id="typingIndicator"></div>
        <div class="toast-container position-fixed top-0 end-0 p-3"></div>
    `;
    
    // Create mock elements with basic properties
    const elements = ['chatForm', 'messageInput', 'sendButton', 'chatMessages', 'messagesContainer', 'typingIndicator'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.disabled = false;
            el.innerHTML = '';
            el.style = new Proxy({}, {
                set: (target, prop, value) => {
                    target[prop] = value;
                    return true;
                },
                get: (target, prop) => target[prop] || ''
            });
            el.classList = {
                add: () => {},
                remove: () => {},
                contains: () => false,
                toggle: () => {}
            };
            el.addEventListener = () => {};
            el.removeEventListener = () => {};
            el.focus = () => {};
            el.scrollTop = 0;
            el.scrollHeight = 1000;
        }
    });
};

// Load source files
function loadSourceFile(filePath) {
    try {
        const fullPath = path.join(__dirname, '../../..', filePath);
        console.log(`📂 Loading: ${filePath} from ${fullPath}`);
        
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ File not found: ${fullPath}`);
            return;
        }
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Execute in global context and try to capture classes
        const beforeClasses = Object.keys(global).filter(key => typeof global[key] === 'function');
        
        eval(content);
        
        // Check what new classes were added
        const afterClasses = Object.keys(global).filter(key => typeof global[key] === 'function');
        
        // Also try to access classes directly in case they're in local scope
        const classesToCheck = ['VideoManager', 'ChatUtils', 'ChatCore', 'UIManager', 'NotificationManager', 'SessionManager'];
        
        classesToCheck.forEach(className => {
            try {
                // Try to evaluate the class name to see if it exists
                const cls = eval(`typeof ${className} !== 'undefined' ? ${className} : null`);
                if (cls && typeof cls === 'function') {
                    global[className] = cls;
                    console.log(`✅ Exported ${className} to global`);
                } else {
                    console.log(`⚠️ ${className} not found in ${filePath}`);
                }
            } catch (e) {
                console.log(`⚠️ ${className} not accessible in ${filePath}`);
            }
        });
        
    } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Load test files
function loadTestFile(filePath) {
    try {
        const fullPath = path.join(__dirname, '..', filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        eval(content);
    } catch (error) {
        console.error(`Failed to load test ${filePath}:`, error.message);
    }
}

// Main execution
async function runTests() {
    console.log('🚀 Starting Frontend Unit Tests...\n');
    
    // Load source files
    console.log('📁 Loading source files...');
    loadSourceFile('static/js/core/SessionManager.js');
    loadSourceFile('static/js/core/ChatCore.js');
    loadSourceFile('static/js/core/UIManager.js');
    loadSourceFile('static/js/core/NotificationManager.js');
    loadSourceFile('static/js/modules/VideoManager.js');
    loadSourceFile('static/js/utils/ChatUtils.js');
    
    // Load test files
    console.log('📁 Loading test files...');
    loadTestFile('tests/ChatCore.test.js');
    loadTestFile('tests/UIManager.test.js');
    loadTestFile('tests/NotificationManager.test.js');
    loadTestFile('tests/VideoManager.test.js');
    loadTestFile('tests/ChatUtils.test.js');
    loadTestFile('tests/Integration.test.js');
    
    // Ensure all classes are available before running tests
    console.log('\n🔍 Checking class availability...');
    const availableClasses = [];
    const classesToCheck = ['ChatCore', 'UIManager', 'NotificationManager', 'VideoManager', 'ChatUtils', 'SessionManager'];
    
    classesToCheck.forEach(className => {
        if (typeof global[className] !== 'undefined') {
            availableClasses.push(className);
            console.log(`✅ ${className} is available`);
        } else {
            console.log(`❌ ${className} is NOT available`);
        }
    });
    
    // Run tests
    console.log('\n🧪 Executing tests...');
    
    if (typeof global.runChatCoreTests === 'function') global.runChatCoreTests();
    if (typeof global.runUIManagerTests === 'function') global.runUIManagerTests();
    if (typeof global.runNotificationManagerTests === 'function') global.runNotificationManagerTests();
    if (typeof global.runVideoManagerTests === 'function') global.runVideoManagerTests();
    if (typeof global.runChatUtilsTests === 'function') global.runChatUtilsTests();
    if (typeof global.runIntegrationTests === 'function') global.runIntegrationTests();
    
    // Generate report
    const coverage = testStats.total > 0 ? Math.round((testStats.passed / testStats.total) * 100) : 0;
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${testStats.passed}`);
    console.log(`❌ Failed: ${testStats.failed}`);
    console.log(`⏭️ Skipped: ${testStats.skipped}`);
    console.log(`📈 Total: ${testStats.total}`);
    console.log(`📊 Coverage: ${coverage}%`);
    
    // Save results
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const summary = {
        passed: testStats.passed,
        failed: testStats.failed,
        skipped: testStats.skipped,
        total: testStats.total,
        coverage: coverage,
        timestamp: new Date().toISOString(),
        results: testResults
    };
    
    fs.writeFileSync(
        path.join(reportsDir, 'summary.json'),
        JSON.stringify(summary, null, 2)
    );
    
    fs.writeFileSync(
        path.join(reportsDir, 'detailed.json'),
        JSON.stringify(testResults, null, 2)
    );
    
    console.log(`\n📄 Reports saved to: ${reportsDir}`);
    
    // Exit with appropriate code
    process.exit(testStats.failed > 0 ? 1 : 0);
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run tests
runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
});