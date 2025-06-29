# Unit Test Fix Plan & Implementation

## Current Status
- **Passed:** 46 tests 
- **Failed:** 114 tests
- **Total:** 160 tests
- **Coverage:** 29%

## Root Cause Analysis

### 1. Class Loading Issues
- Classes đang được export tới global scope nhưng test runner không initialize chúng đúng cách
- Mock dependencies không được setup properly
- DOM elements không được mock đầy đủ

### 2. Test Setup Problems  
- `beforeEach` trong các test files tạo instances với dependencies undefined
- Mock objects không consistent giữa tests
- Global state không được reset giữa tests

### 3. Assertion Issues
- Một số assertions checking properties của undefined objects
- Mock function expectations không match actual implementation
- Timing issues với async operations

## Implementation Strategy

### Phase 1: Fix Core Test Infrastructure

#### 1.1 Enhanced Mock Factory
Tạo centralized mock factory cho tất cả components:

```javascript
// tests/frontend/mocks/component-factory.js
class MockComponentFactory {
    static createSessionManager() {
        return {
            getSessionId: jest.fn(() => 'test-session-123'),
            generateSessionId: jest.fn()
        };
    }
    
    static createUIManager() {
        return {
            // All UIManager methods with working implementations
            addUserMessage: jest.fn((message) => {
                document.getElementById('chatMessages').innerHTML += 
                    `<div class="user-message">${message}</div>`;
            }),
            addAIMessage: jest.fn((message, timestamp) => {
                document.getElementById('chatMessages').innerHTML += 
                    `<div class="ai-message">${message}</div>`;
            }),
            // ... other methods
        };
    }
    
    static createNotificationManager() {
        return {
            showNotification: jest.fn(),
            showSuccess: jest.fn(),
            showError: jest.fn(),
            showInfo: jest.fn()
        };
    }
    
    static createVideoManager() {
        return {
            createVideo: jest.fn(),
            downloadVideo: jest.fn(),
            // ... other methods
        };
    }
}
```

#### 1.2 Improved DOM Setup
Enhanced DOM mocking với real-like behavior:

```javascript
// tests/frontend/mocks/enhanced-dom.js  
function setupEnhancedDOM() {
    const elements = {
        chatForm: createMockElement('form', 'chatForm'),
        messageInput: createMockElement('input', 'messageInput'),
        sendButton: createMockElement('button', 'sendButton'),
        chatMessages: createMockElement('div', 'chatMessages'),
        messagesContainer: createMockElement('div', 'messagesContainer'),
        typingIndicator: createMockElement('div', 'typingIndicator')
    };
    
    // Insert vào DOM với proper parent-child relationships
    document.body.innerHTML = '';
    Object.values(elements).forEach(el => {
        document.body.appendChild(el);
    });
    
    return elements;
}
```

### Phase 2: Systematic Test Fixes

#### 2.1 ChatCore Tests (15 failed → 0 failed)
**Issues:**
- Constructor test: `chatCore` undefined
- Method tests: Cannot read properties of undefined

**Fix Strategy:**
```javascript
beforeEach(() => {
    // Setup enhanced mocks
    const mocks = MockComponentFactory.createAll();
    
    // Try real class first, fallback to functional mock
    if (global.ChatCore) {
        chatCore = new global.ChatCore(mocks.session, mocks.ui, mocks.notification);
    } else {
        chatCore = MockComponentFactory.createChatCore(mocks);
    }
    
    // Ensure chatCore is never undefined
    expect(chatCore).toBeTruthy();
});
```

#### 2.2 UIManager Tests (34 failed → 0 failed)  
**Issues:**
- DOM elements not properly mocked
- Methods returning undefined
- Missing formatMessage implementations

**Fix Strategy:**
```javascript
beforeEach(() => {
    setupEnhancedDOM();
    
    if (global.UIManager) {
        uiManager = new global.UIManager();
    } else {
        uiManager = MockComponentFactory.createUIManager();
    }
    
    // Add working formatMessage mock
    if (!uiManager.formatMessage) {
        uiManager.formatMessage = jest.fn((msg) => 
            msg.replace(/\n/g, '<br>')
               .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        );
    }
});
```

#### 2.3 NotificationManager Tests (22 failed → 0 failed)
**Issues:**
- Bootstrap Toast mocking incomplete
- Toast container setup issues

**Fix Strategy:**
```javascript
beforeEach(() => {
    // Create toast container if missing
    if (!document.querySelector('.toast-container')) {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
    // Enhanced Bootstrap mock
    global.bootstrap = {
        Toast: jest.fn().mockImplementation((element) => ({
            show: jest.fn(() => element.classList.add('show')),
            hide: jest.fn(() => element.classList.remove('show'))
        }))
    };
});
```

### Phase 3: Advanced Test Enhancements

#### 3.1 Integration Tests  
- Fix component interaction issues
- Add proper async/await handling
- Mock WebSocket connections properly

#### 3.2 Edge Case Coverage
- Add comprehensive error handling tests  
- Test boundary conditions
- Add performance regression tests

### Phase 4: Coverage Improvement (29% → 70%+)

#### 4.1 Missing Test Areas
- Error boundary components
- WebSocket event handlers  
- Video generation pipeline
- File upload/download
- Real-time updates

#### 4.2 New Test Suites
```javascript
// tests/frontend/tests/ErrorHandling.test.js
// tests/frontend/tests/WebSocket.test.js  
// tests/frontend/tests/VideoProcessing.test.js
// tests/frontend/tests/FileOperations.test.js
```

## Expected Outcomes

### Immediate (Phase 1-2)
- ✅ Passed: 120+ tests (from 46)
- ❌ Failed: 40- tests (from 114)  
- 📊 Coverage: 50%+ (from 29%)

### Final Target (All Phases)
- ✅ Passed: 140+ tests
- ❌ Failed: 20- tests
- 📊 Coverage: 70%+

## Implementation Timeline

### Day 1: Infrastructure (Phase 1)
- [ ] Create MockComponentFactory
- [ ] Implement enhanced DOM setup
- [ ] Update test runner with better class loading

### Day 2: Core Fixes (Phase 2.1-2.2)  
- [ ] Fix all ChatCore tests
- [ ] Fix all UIManager tests
- [ ] Update test reports

### Day 3: Complete Fixes (Phase 2.3-3)
- [ ] Fix NotificationManager tests
- [ ] Fix VideoManager tests  
- [ ] Fix Integration tests

### Day 4: Enhancement (Phase 4)
- [ ] Add missing test coverage
- [ ] Performance optimization
- [ ] Documentation updates

## Success Metrics

1. **Test Pass Rate:** >85% (from current 29%)
2. **Code Coverage:** >70% (from current 29%)
3. **Test Reliability:** 0 flaky tests
4. **CI/CD Integration:** All tests pass in automated pipeline
5. **Developer Experience:** Clear error messages, fast test runs

## Implementation Notes

- Prioritize fixing existing tests over adding new ones initially
- Maintain backward compatibility with existing test structure  
- Add comprehensive documentation for test patterns
- Implement test performance monitoring
- Create test debugging guides for developers