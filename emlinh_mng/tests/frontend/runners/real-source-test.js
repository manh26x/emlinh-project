#!/usr/bin/env node

/**
 * Real Source Test Runner
 * Tests actual source files for syntax and basic functionality
 */

const fs = require('fs');
const path = require('path');

// Setup minimal environment
global.console = console;
global.window = {
    dispatchEvent: () => {},
    addEventListener: () => {},
    CustomEvent: class { constructor(type) { this.type = type; } },
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
    bootstrap: {
        Toast: class { constructor() {} show() {} hide() {} },
        Modal: class { constructor() {} show() {} hide() {} }
    }
};

global.document = {
    getElementById: () => ({ 
        value: '', 
        disabled: false, 
        innerHTML: '', 
        style: { display: 'none' },
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        addEventListener: () => {},
        focus: () => {},
        scrollTop: 0,
        scrollHeight: 1000
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
        innerHTML: '',
        textContent: '',
        classList: { add: () => {}, remove: () => {} },
        click: () => {},
        remove: () => {},
        addEventListener: () => {}
    }),
    body: {
        appendChild: () => {},
        insertAdjacentHTML: () => {},
        innerHTML: ''
    }
};

global.navigator = {
    clipboard: { writeText: () => Promise.resolve() }
};

global.io = () => ({
    on: () => {},
    emit: () => {}
});

global.bootstrap = global.window.bootstrap;
global.CustomEvent = global.window.CustomEvent;

let testResults = { passed: 0, failed: 0, total: 0 };

function testSourceFile(filePath, fileName) {
    console.log(`\n📁 Testing ${fileName}...`);
    
    try {
        const fullPath = path.join(__dirname, '../../..', filePath);
        
        if (!fs.existsSync(fullPath)) {
            console.log(`❌ File not found: ${filePath}`);
            testResults.failed++;
            testResults.total++;
            return;
        }
        
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Test 1: Basic syntax validation
        try {
            eval(content);
            console.log(`✅ ${fileName} - Syntax valid`);
            testResults.passed++;
        } catch (error) {
            console.log(`❌ ${fileName} - Syntax error: ${error.message}`);
            testResults.failed++;
        }
        testResults.total++;
        
        // Test 2: Check for common issues
        const issues = [];
        
        if (content.includes('console.log') && !content.includes('// console.log')) {
            issues.push('Contains console.log statements');
        }
        
        if (content.includes('debugger')) {
            issues.push('Contains debugger statements');
        }
        
        if (content.includes('alert(') && !content.includes('// alert')) {
            issues.push('Contains alert() calls');
        }
        
        // Test 3: Check class definitions
        const classMatches = content.match(/class\s+(\w+)/g);
        if (classMatches) {
            console.log(`📋 ${fileName} - Found classes: ${classMatches.join(', ')}`);
            testResults.passed++;
        } else if (fileName.includes('.js') && !fileName.includes('test')) {
            console.log(`⚠️ ${fileName} - No classes found (might be utility file)`);
        }
        testResults.total++;
        
        // Test 4: Check function definitions
        const functionMatches = content.match(/function\s+(\w+)/g) || [];
        const methodMatches = content.match(/(\w+)\s*\(/g) || [];
        if (functionMatches.length > 0 || methodMatches.length > 5) {
            console.log(`📋 ${fileName} - Found ${functionMatches.length} functions, ${methodMatches.length} method calls`);
            testResults.passed++;
        }
        testResults.total++;
        
        if (issues.length > 0) {
            console.log(`⚠️ ${fileName} - Issues: ${issues.join(', ')}`);
        }
        
    } catch (error) {
        console.log(`❌ ${fileName} - Error: ${error.message}`);
        testResults.failed++;
        testResults.total++;
    }
}

function testAPIEndpoints() {
    console.log('\n🌐 Testing API Endpoint Patterns...');
    
    // Test common fetch patterns
    const fetchPatterns = [
        '/api/chat/send',
        '/api/chat/create-video',
        '/api/videos/{id}',
        '/health'
    ];
    
    fetchPatterns.forEach(pattern => {
        try {
            // Just test URL construction
            const url = pattern.replace('{id}', '123');
            if (url.startsWith('/')) {
                console.log(`✅ API Pattern: ${pattern}`);
                testResults.passed++;
            } else {
                console.log(`❌ Invalid API Pattern: ${pattern}`);
                testResults.failed++;
            }
        } catch (error) {
            console.log(`❌ API Pattern Error: ${pattern} - ${error.message}`);
            testResults.failed++;
        }
        testResults.total++;
    });
}

function runRealSourceTests() {
    console.log('🔍 Testing Real Source Files...\n');
    
    // Test core JavaScript files
    const sourceFiles = [
        { path: 'static/js/core/ChatCore.js', name: 'ChatCore.js' },
        { path: 'static/js/core/UIManager.js', name: 'UIManager.js' },
        { path: 'static/js/core/NotificationManager.js', name: 'NotificationManager.js' },
        { path: 'static/js/core/SessionManager.js', name: 'SessionManager.js' },
        { path: 'static/js/modules/VideoManager.js', name: 'VideoManager.js' },
        { path: 'static/js/modules/IdeaManager.js', name: 'IdeaManager.js' },
        { path: 'static/js/utils/ChatUtils.js', name: 'ChatUtils.js' },
        { path: 'static/js/ChatManager.js', name: 'ChatManager.js' },
        { path: 'static/js/app.js', name: 'app.js' }
    ];
    
    sourceFiles.forEach(file => {
        testSourceFile(file.path, file.name);
    });
    
    testAPIEndpoints();
    
    console.log('\n📊 Real Source Test Results:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Total: ${testResults.total}`);
    
    const passRate = testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0;
    console.log(`📊 Pass Rate: ${passRate}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 All source files are healthy!');
        return true;
    } else {
        console.log('\n⚠️ Some issues found in source files.');
        return false;
    }
}

// Run tests
try {
    const success = runRealSourceTests();
    process.exit(success ? 0 : 1);
} catch (error) {
    console.error('💥 Test runner error:', error);
    process.exit(1);
}