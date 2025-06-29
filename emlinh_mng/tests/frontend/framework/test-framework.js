/**
 * Simple Test Framework for Frontend Unit Testing
 * Emlinh AI Assistant Project
 */

class TestFramework {
    constructor() {
        this.currentSuite = null;
        this.results = [];
    }

    describe(suiteName, callback) {
        this.currentSuite = {
            name: suiteName,
            tests: [],
            beforeEach: null,
            afterEach: null,
            beforeAll: null,
            afterAll: null
        };

        // Execute suite setup
        callback();

        // Run the suite
        this.runSuite(this.currentSuite);
    }

    it(testName, callback) {
        if (!this.currentSuite) {
            throw new Error('Test must be inside a describe block');
        }

        this.currentSuite.tests.push({
            name: testName,
            callback: callback,
            skip: false
        });
    }

    skip(testName, callback) {
        if (!this.currentSuite) {
            throw new Error('Test must be inside a describe block');
        }

        this.currentSuite.tests.push({
            name: testName,
            callback: callback,
            skip: true
        });
    }

    beforeEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = callback;
        }
    }

    afterEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = callback;
        }
    }

    beforeAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = callback;
        }
    }

    afterAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = callback;
        }
    }

    async runSuite(suite) {
        console.log(`\n📋 Running test suite: ${suite.name}`);
        
        const suiteElement = this.createSuiteElement(suite.name);
        
        // Run beforeAll
        if (suite.beforeAll) {
            try {
                await suite.beforeAll();
            } catch (error) {
                console.error(`❌ beforeAll failed for ${suite.name}:`, error);
            }
        }

        // Run each test
        for (const test of suite.tests) {
            if (test.skip) {
                this.recordResult(suite.name, test.name, 'skip', null, suiteElement);
                continue;
            }

            // Run beforeEach
            if (suite.beforeEach) {
                try {
                    await suite.beforeEach();
                } catch (error) {
                    console.error(`❌ beforeEach failed for ${test.name}:`, error);
                }
            }

            // Run the test
            try {
                await test.callback();
                this.recordResult(suite.name, test.name, 'pass', null, suiteElement);
            } catch (error) {
                this.recordResult(suite.name, test.name, 'fail', error, suiteElement);
            }

            // Run afterEach
            if (suite.afterEach) {
                try {
                    await suite.afterEach();
                } catch (error) {
                    console.error(`❌ afterEach failed for ${test.name}:`, error);
                }
            }
        }

        // Run afterAll
        if (suite.afterAll) {
            try {
                await suite.afterAll();
            } catch (error) {
                console.error(`❌ afterAll failed for ${suite.name}:`, error);
            }
        }

        console.log(`✅ Completed test suite: ${suite.name}`);
    }

    createSuiteElement(suiteName) {
        const container = document.getElementById('testResults');
        const suiteDiv = document.createElement('div');
        suiteDiv.className = 'test-suite';
        suiteDiv.innerHTML = `
            <h3><i class="fas fa-folder-open"></i> ${suiteName}</h3>
            <div class="test-list"></div>
        `;
        container.appendChild(suiteDiv);
        return suiteDiv.querySelector('.test-list');
    }

    recordResult(suiteName, testName, status, error, suiteElement) {
        const result = {
            suite: suiteName,
            test: testName,
            status: status,
            error: error,
            timestamp: new Date().toISOString()
        };

        this.results.push(result);

        // Update UI
        const testDiv = document.createElement('div');
        testDiv.className = `test-result test-${status}`;
        
        let icon, message;
        switch (status) {
            case 'pass':
                icon = '✅';
                message = `${testName}`;
                window.testStats.passed++;
                break;
            case 'fail':
                icon = '❌';
                message = `${testName} - ${error.message}`;
                window.testStats.failed++;
                break;
            case 'skip':
                icon = '⏭️';
                message = `${testName} (skipped)`;
                window.testStats.skipped++;
                break;
        }

        testDiv.innerHTML = `${icon} ${message}`;
        suiteElement.appendChild(testDiv);

        window.testStats.total++;

        // Log to console
        console.log(`${icon} ${suiteName} > ${testName}${error ? ` - ${error.message}` : ''}`);
    }
}

// Assertion functions
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
        
        toContain: (expected) => {
            if (!actual.includes(expected)) {
                throw new Error(`Expected ${actual} to contain ${expected}`);
            }
        },
        
        toHaveLength: (expected) => {
            if (actual.length !== expected) {
                throw new Error(`Expected ${actual} to have length ${expected}, but got ${actual.length}`);
            }
        },
        
        toThrow: () => {
            if (typeof actual !== 'function') {
                throw new Error('Expected a function to test throwing');
            }
            
            try {
                actual();
                throw new Error('Expected function to throw, but it did not');
            } catch (error) {
                // Success - function threw as expected
            }
        }
    };
};

// Mock utilities
const jest = {
    fn: (implementation) => {
        const mockFn = implementation || (() => {});
        mockFn.mock = {
            calls: [],
            results: []
        };
        
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
        
        return wrappedFn;
    },
    
    clearAllMocks: () => {
        // Implementation for clearing all mocks
    }
};

// Global test framework instance
const testFramework = new TestFramework();

// Export globals
window.describe = testFramework.describe.bind(testFramework);
window.it = testFramework.it.bind(testFramework);
window.it.skip = testFramework.skip.bind(testFramework);
window.beforeEach = testFramework.beforeEach.bind(testFramework);
window.afterEach = testFramework.afterEach.bind(testFramework);
window.beforeAll = testFramework.beforeAll.bind(testFramework);
window.afterAll = testFramework.afterAll.bind(testFramework);
window.expect = expect;
window.jest = jest;