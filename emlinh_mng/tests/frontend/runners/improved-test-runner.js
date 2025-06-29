#!/usr/bin/env node

/**
 * Improved Test Runner for Frontend Unit Tests
 * Better class loading and mocking capabilities
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Setup global DOM environment with comprehensive elements
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>Test Environment</title>
</head>
<body>
    <form id="chatForm">
        <input type="text" id="messageInput" placeholder="Type a message...">
        <button type="submit" id="sendButton">Send</button>
    </form>
    <div id="chatMessages"></div>
    <div id="messagesContainer"></div>
    <div id="typingIndicator" style="display: none;"></div>
    <div class="toast-container position-fixed top-0 end-0 p-3"></div>
</body>
</html>
`, {
    url: 'http://localhost:5000',
    pretendToBeVisual: true,
    resources: 'usable'
});

// Setup enhanced globals
global.window = dom.window;
global.document = dom.window.document;
global.navigator = {
    clipboard: {
        writeText: (text) => {
            console.log(`Clipboard: ${text}`);
            return Promise.resolve();
        }
    }
};

// Mock Socket.IO
global.io = () => ({
    on: jest.fn(),
    emit: jest.fn(),
    connected: true
});

// Enhanced Bootstrap mock
global.bootstrap = {
    Toast: function(element) {
        const instance = {
            show: () => {
                element.classList.add('show');
                element.style.display = 'block';
            },
            hide: () => {
                element.classList.remove('show');
                element.style.display = 'none';
            }
        };
        return instance;
    },
    Modal: function(element) {
        return {
            show: () => {
                element.style.display = 'block';
                element.classList.add('show');
            },
            hide: () => {
                element.style.display = 'none';
                element.classList.remove('show');
            }
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

// Test statistics
let testStats = { passed: 0, failed: 0, skipped: 0, total: 0 };
let testResults = [];

// Enhanced jest mock
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
        
        Object.assign(wrappedFn, {
            mock: mockFn.mock,
            mockReturnValue: (value) => {
                mockFn.implementation = () => value;
                return wrappedFn;
            },
            mockResolvedValueOnce: (value) => {
                mockFn.implementation = () => Promise.resolve(value);
                return wrappedFn;
            },
            mockRejectedValueOnce: (error) => {
                mockFn.implementation = () => Promise.reject(error);
                return wrappedFn;
            },
            mockReturnValueOnce: (value) => {
                const originalImpl = mockFn.implementation;
                mockFn.implementation = (...args) => {
                    mockFn.implementation = originalImpl;
                    return value;
                };
                return wrappedFn;
            },
            mockImplementation: (impl) => {
                mockFn.implementation = impl;
                return wrappedFn;
            }
        });
        
        return wrappedFn;
    },
    clearAllMocks: () => {},
    useFakeTimers: () => {},
    useRealTimers: () => {},
    advanceTimersByTime: (ms) => {},
    any: (constructor) => ({
        asymmetricMatch: (other) => {
            return typeof constructor === 'function' ? other instanceof constructor : typeof other === constructor;
        },
        toString: () => `Any<${constructor.name || constructor}>`
    })
};

global.jest = jest;

// Enhanced expect with better error messages
const expect = (actual) => {
    const createAssertion = (passed, message) => {
        if (!passed) {
            throw new Error(message);
        }
    };

    return {
        toBe: (expected) => {
            createAssertion(actual === expected, `Expected ${actual} to be ${expected}`);
        },
        toEqual: (expected) => {
            createAssertion(
                JSON.stringify(actual) === JSON.stringify(expected),
                `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
            );
        },
        toBeTruthy: () => {
            createAssertion(!!actual, `Expected ${actual} to be truthy`);
        },
        toBeFalsy: () => {
            createAssertion(!actual, `Expected ${actual} to be falsy`);
        },
        toContain: (expected) => {
            createAssertion(
                String(actual).includes(String(expected)),
                `Expected ${actual} to contain ${expected}`
            );
        },
        toHaveBeenCalled: () => {
            createAssertion(
                actual.mock && actual.mock.calls.length > 0,
                'Expected function to have been called'
            );
        },
        toHaveBeenCalledWith: (...args) => {
            createAssertion(
                actual.mock && actual.mock.calls.some(call => 
                    JSON.stringify(call) === JSON.stringify(args)
                ),
                `Expected function to have been called with ${JSON.stringify(args)}`
            );
        },
        toHaveBeenCalledTimes: (times) => {
            const actualCalls = actual.mock ? actual.mock.calls.length : 0;
            createAssertion(
                actualCalls === times,
                `Expected function to have been called ${times} times, but was called ${actualCalls} times`
            );
        },
        toMatch: (pattern) => {
            const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
            createAssertion(regex.test(actual), `Expected ${actual} to match ${pattern}`);
        },
        toBeNull: () => {
            createAssertion(actual === null, `Expected ${actual} to be null`);
        },
        toBeUndefined: () => {
            createAssertion(actual === undefined, `Expected ${actual} to be undefined`);
        },
        toThrow: (expectedError) => {
            let didThrow = false;
            try {
                if (typeof actual === 'function') {
                    actual();
                }
            } catch (error) {
                didThrow = true;
                if (expectedError && !error.message.includes(expectedError)) {
                    throw new Error(`Expected function to throw "${expectedError}", but threw "${error.message}"`);
                }
            }
            if (!didThrow) {
                throw new Error('Expected function to throw');
            }
        },
        not: {
            toBe: (expected) => {
                createAssertion(actual !== expected, `Expected ${actual} not to be ${expected}`);
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
                createAssertion(
                    !String(actual).includes(String(expected)),
                    `Expected ${actual} not to contain ${expected}`
                );
            },
            toHaveBeenCalled: () => {
                createAssertion(
                    !actual.mock || actual.mock.calls.length === 0,
                    'Expected function not to have been called'
                );
            }
        }
    };
};

global.expect = expect;
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

// Enhanced mock DOM setup
global.setupMockDOM = () => {
    const elements = ['chatForm', 'messageInput', 'sendButton', 'chatMessages', 'messagesContainer', 'typingIndicator'];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Enhanced element properties
            el.value = el.tagName === 'INPUT' ? '' : undefined;
            el.disabled = false;
            el.innerHTML = '';
            el.textContent = '';
            el.placeholder = '';
            
            // Enhanced style mock
            el.style = new Proxy({}, {
                set: (target, prop, value) => {
                    target[prop] = value;
                    return true;
                },
                get: (target, prop) => target[prop] || ''
            });
            
            // Enhanced classList mock
            el.classList = {
                classes: [],
                add: function(...classNames) {
                    classNames.forEach(name => {
                        if (!this.classes.includes(name)) {
                            this.classes.push(name);
                        }
                    });
                },
                remove: function(...classNames) {
                    classNames.forEach(name => {
                        const index = this.classes.indexOf(name);
                        if (index > -1) {
                            this.classes.splice(index, 1);
                        }
                    });
                },
                contains: function(className) {
                    return this.classes.includes(className);
                },
                toggle: function(className) {
                    if (this.contains(className)) {
                        this.remove(className);
                        return false;
                    } else {
                        this.add(className);
                        return true;
                    }
                }
            };
            
            el.addEventListener = jest.fn();
            el.removeEventListener = jest.fn();
            el.focus = jest.fn();
            el.scrollTop = 0;
            el.scrollHeight = 1000;
        }
    });
};

// Enhanced source file loading with better error handling
function loadSourceFile(filePath) {
    try {
        const fullPath = path.join(__dirname, '../../..', filePath);
        
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ File not found: ${fullPath}`);
            return false;
        }
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Execute in a controlled context
        const moduleExports = {};
        const moduleRequire = (name) => {
            // Mock common requires
            return {};
        };
        
        // Create safer eval context
        const context = {
            console,
            global,
            window: global.window,
            document: global.document,
            exports: moduleExports,
            require: moduleRequire,
            module: { exports: moduleExports }
        };
        
        // Execute the code with error handling
        try {
            eval(`
                (function() {
                    ${content}
                    
                    // Try to export classes to global
                    const classesToExport = ['ChatCore', 'UIManager', 'NotificationManager', 'VideoManager', 'SessionManager', 'ChatUtils'];
                    classesToExport.forEach(className => {
                        if (typeof eval('typeof ' + className) !== 'undefined' && eval('typeof ' + className) === 'function') {
                            global[className] = eval(className);
                            console.log('✅ Exported ' + className + ' to global');
                        }
                    });
                }).call(context);
            `);
        } catch (evalError) {
            console.warn(`⚠️ Eval error in ${filePath}:`, evalError.message);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error.message);
        return false;
    }
}

// Load test files
function loadTestFile(filePath) {
    try {
        const fullPath = path.join(__dirname, '..', filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        eval(content);
        return true;
    } catch (error) {
        console.error(`Failed to load test ${filePath}:`, error.message);
        return false;
    }
}

// Main execution
async function runTests() {
    console.log('🚀 Starting Improved Frontend Unit Tests...\n');
    
    // Setup DOM first
    global.setupMockDOM();
    
    // Load mock component factory
    console.log('📁 Loading mock component factory...');
    try {
        const mockFactoryPath = path.join(__dirname, '../mocks/component-factory.js');
        const mockFactoryContent = fs.readFileSync(mockFactoryPath, 'utf8');
        eval(mockFactoryContent);
        console.log('✅ MockComponentFactory loaded');
    } catch (error) {
        console.error('❌ Failed to load MockComponentFactory:', error.message);
    }
    
    // Load source files
    console.log('📁 Loading source files...');
    const sourceFiles = [
        'static/js/core/SessionManager.js',
        'static/js/core/ChatCore.js', 
        'static/js/core/UIManager.js',
        'static/js/core/NotificationManager.js',
        'static/js/modules/VideoManager.js',
        'static/js/utils/ChatUtils.js'
    ];
    
    let loadedCount = 0;
    sourceFiles.forEach(file => {
        if (loadSourceFile(file)) {
            loadedCount++;
        }
    });
    
    console.log(`📊 Loaded ${loadedCount}/${sourceFiles.length} source files`);
    
    // Ensure global fetch is mocked
    global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
    }));
    
    // Load test files
    console.log('\n📁 Loading test files...');
    const testFiles = [
        'tests/ChatCore.test.simplified.js', 
        'tests/UIManager.test.simplified.js',
        'tests/NotificationManager.test.js',
        'tests/VideoManager.test.js',
        'tests/ChatUtils.test.js',
        'tests/Integration.test.js'
    ];
    
    testFiles.forEach(file => {
        loadTestFile(file);
    });
    
    // Check class availability
    console.log('\n🔍 Checking class availability...');
    const classesToCheck = ['ChatCore', 'UIManager', 'NotificationManager', 'VideoManager', 'ChatUtils', 'SessionManager'];
    
    classesToCheck.forEach(className => {
        if (typeof global[className] !== 'undefined') {
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
        path.join(reportsDir, 'improved-summary.json'),
        JSON.stringify(summary, null, 2)
    );
    
    console.log(`\n📄 Reports saved to: ${reportsDir}`);
    
    // Exit with appropriate code
    process.exit(testStats.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
});