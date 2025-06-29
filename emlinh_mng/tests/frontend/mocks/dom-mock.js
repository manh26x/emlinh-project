/**
 * DOM Mock for Frontend Testing
 * Provides mock DOM elements and methods for testing
 */

class DOMElementMock {
    constructor(tagName = 'div', id = null) {
        this.tagName = tagName.toLowerCase();
        this.id = id;
        this.className = '';
        this.innerHTML = '';
        this.textContent = '';
        this.value = '';
        this.disabled = false;
        this.style = new Proxy({}, {
            set: (target, prop, value) => {
                target[prop] = value;
                return true;
            },
            get: (target, prop) => {
                return target[prop] || '';
            }
        });
        this.classList = new ClassListMock();
        this.children = [];
        this.parentElement = null;
        this.attributes = new Map();
        this.eventListeners = new Map();
        this.dataset = {};
    }

    getElementById(id) {
        if (this.id === id) return this;
        for (const child of this.children) {
            const found = child.getElementById?.(id);
            if (found) return found;
        }
        return null;
    }

    querySelector(selector) {
        // Simple selector matching
        if (selector.startsWith('#')) {
            const id = selector.slice(1);
            return this.getElementById(id);
        }
        if (selector.startsWith('.')) {
            const className = selector.slice(1);
            if (this.classList.contains(className)) return this;
            for (const child of this.children) {
                const found = child.querySelector?.(selector);
                if (found) return found;
            }
        }
        return null;
    }

    querySelectorAll(selector) {
        const results = [];
        if (selector.startsWith('.')) {
            const className = selector.slice(1);
            if (this.classList.contains(className)) results.push(this);
            for (const child of this.children) {
                const childResults = child.querySelectorAll?.(selector) || [];
                results.push(...childResults);
            }
        }
        return results;
    }

    appendChild(child) {
        this.children.push(child);
        child.parentElement = this;
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parentElement = null;
        }
        return child;
    }

    remove() {
        if (this.parentElement) {
            this.parentElement.removeChild(this);
        }
    }

    insertAdjacentHTML(position, html) {
        // Mock implementation - just append to innerHTML for testing
        if (position === 'beforeend') {
            this.innerHTML += html;
        }
    }

    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    dispatchEvent(event) {
        if (this.eventListeners.has(event.type)) {
            const listeners = this.eventListeners.get(event.type);
            listeners.forEach(callback => callback(event));
        }
        return true;
    }

    getAttribute(name) {
        return this.attributes.get(name) || null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
        if (name === 'id') this.id = value;
        if (name === 'class') this.className = value;
    }

    focus() {
        // Mock focus
    }

    click() {
        this.dispatchEvent(new CustomEvent('click'));
    }

    scrollIntoView() {
        // Mock scroll
    }
}

class ClassListMock {
    constructor() {
        this.classes = [];
    }

    add(...classNames) {
        classNames.forEach(className => {
            if (!this.classes.includes(className)) {
                this.classes.push(className);
            }
        });
    }

    remove(...classNames) {
        classNames.forEach(className => {
            const index = this.classes.indexOf(className);
            if (index > -1) {
                this.classes.splice(index, 1);
            }
        });
    }

    contains(className) {
        return this.classes.includes(className);
    }

    toggle(className) {
        if (this.contains(className)) {
            this.remove(className);
            return false;
        } else {
            this.add(className);
            return true;
        }
    }
}

// Mock document object
const documentMock = {
    getElementById: (id) => {
        const mockElements = documentMock._mockElements || [];
        return mockElements.find(el => el.id === id) || null;
    },
    
    querySelector: (selector) => {
        const mockElements = documentMock._mockElements || [];
        return mockElements.find(el => {
            if (selector.startsWith('#')) {
                return el.id === selector.slice(1);
            }
            if (selector.startsWith('.')) {
                return el.classList.contains(selector.slice(1));
            }
            return false;
        }) || null;
    },
    
    querySelectorAll: (selector) => {
        const mockElements = documentMock._mockElements || [];
        return mockElements.filter(el => {
            if (selector.startsWith('.')) {
                return el.classList.contains(selector.slice(1));
            }
            return false;
        });
    },
    
    createElement: (tagName) => {
        return new DOMElementMock(tagName);
    },
    
    body: new DOMElementMock('body'),
    
    _mockElements: [],
    
    addMockElement: (element) => {
        documentMock._mockElements.push(element);
    },
    
    clearMockElements: () => {
        documentMock._mockElements = [];
    }
};

// Mock window object
const windowMock = {
    document: documentMock,
    location: {
        href: 'http://localhost:5000',
        hostname: 'localhost',
        port: '5000'
    },
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    fetch: jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
    })),
    
    dispatchEvent: (event) => {
        // Mock window event dispatch
    },
    
    addEventListener: (event, callback) => {
        // Mock window event listener
    },
    
    CustomEvent: class {
        constructor(type, options = {}) {
            this.type = type;
            this.detail = options.detail;
        }
    }
};

// Mock navigator
const navigatorMock = {
    clipboard: {
        writeText: jest.fn(() => Promise.resolve())
    }
};

// Setup mock DOM elements needed for testing
const setupMockDOM = () => {
    // Clear existing mock elements
    documentMock.clearMockElements();
    
    // Create common elements
    const chatForm = new DOMElementMock('form', 'chatForm');
    const messageInput = new DOMElementMock('input', 'messageInput');
    const sendButton = new DOMElementMock('button', 'sendButton');
    const chatMessages = new DOMElementMock('div', 'chatMessages');
    const messagesContainer = new DOMElementMock('div', 'messagesContainer');
    const typingIndicator = new DOMElementMock('div', 'typingIndicator');
    
    messageInput.value = '';
    sendButton.disabled = false;
    typingIndicator.style.display = 'none';
    
    // Add elements to mock document
    [chatForm, messageInput, sendButton, chatMessages, messagesContainer, typingIndicator].forEach(el => {
        documentMock.addMockElement(el);
    });
    
    // Setup body with basic structure
    documentMock.body.innerHTML = `
        <div class="toast-container position-fixed top-0 end-0 p-3"></div>
    `;
};

// Export to global scope
if (typeof window !== 'undefined') {
    window.setupMockDOM = setupMockDOM;
    window.documentMock = documentMock;
    window.DOMElementMock = DOMElementMock;
    
    // Override global document for testing
    if (!window.document.getElementById('chatForm')) {
        setupMockDOM();
    }
} else {
    // Node.js environment
    global.document = documentMock;
    global.window = windowMock;
    global.navigator = navigatorMock;
    global.setupMockDOM = setupMockDOM;
}