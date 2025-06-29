/**
 * Bootstrap Mock for Frontend Testing
 * Provides mock Bootstrap classes and components
 */

// Mock Bootstrap Toast
class MockToast {
    constructor(element) {
        this.element = element;
        this.shown = false;
    }
    
    show() {
        this.shown = true;
        this.element.classList.add('show');
        
        // Simulate Bootstrap events
        setTimeout(() => {
            const showEvent = new CustomEvent('shown.bs.toast');
            this.element.dispatchEvent(showEvent);
        }, 10);
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hide();
        }, 5000);
    }
    
    hide() {
        this.shown = false;
        this.element.classList.remove('show');
        
        // Simulate Bootstrap events
        setTimeout(() => {
            const hiddenEvent = new CustomEvent('hidden.bs.toast');
            this.element.dispatchEvent(hiddenEvent);
        }, 10);
    }
}

// Mock Bootstrap Modal
class MockModal {
    constructor(element) {
        this.element = element;
        this.shown = false;
    }
    
    show() {
        this.shown = true;
        this.element.style.display = 'block';
        this.element.classList.add('show');
        
        setTimeout(() => {
            const showEvent = new CustomEvent('shown.bs.modal');
            this.element.dispatchEvent(showEvent);
        }, 10);
    }
    
    hide() {
        this.shown = false;
        this.element.style.display = 'none';
        this.element.classList.remove('show');
        
        setTimeout(() => {
            const hiddenEvent = new CustomEvent('hidden.bs.modal');
            this.element.dispatchEvent(hiddenEvent);
        }, 10);
    }
}

// Mock Bootstrap Collapse
class MockCollapse {
    constructor(element) {
        this.element = element;
        this.shown = false;
    }
    
    show() {
        this.shown = true;
        this.element.classList.add('show');
    }
    
    hide() {
        this.shown = false;
        this.element.classList.remove('show');
    }
    
    toggle() {
        if (this.shown) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Mock Bootstrap object
const bootstrap = {
    Toast: MockToast,
    Modal: MockModal,
    Collapse: MockCollapse
};

// Export to global scope
if (typeof window !== 'undefined') {
    window.bootstrap = bootstrap;
} else if (typeof global !== 'undefined') {
    global.bootstrap = bootstrap;
}

// Mock jQuery if needed (some legacy code might use it)
const $ = (selector) => {
    if (typeof selector === 'string') {
        const element = document.querySelector(selector);
        return {
            length: element ? 1 : 0,
            0: element,
            addClass: (className) => element?.classList.add(className),
            removeClass: (className) => element?.classList.remove(className),
            toggleClass: (className) => element?.classList.toggle(className),
            text: (text) => {
                if (text !== undefined) {
                    if (element) element.textContent = text;
                    return { 0: element };
                }
                return element ? element.textContent : '';
            },
            html: (html) => {
                if (html !== undefined) {
                    if (element) element.innerHTML = html;
                    return { 0: element };
                }
                return element ? element.innerHTML : '';
            },
            val: (value) => {
                if (value !== undefined) {
                    if (element) element.value = value;
                    return { 0: element };
                }
                return element ? element.value : '';
            },
            on: (event, callback) => {
                element?.addEventListener(event, callback);
                return { 0: element };
            },
            off: (event, callback) => {
                element?.removeEventListener(event, callback);
                return { 0: element };
            },
            trigger: (event) => {
                element?.dispatchEvent(new CustomEvent(event));
                return { 0: element };
            },
            show: () => {
                if (element) element.style.display = 'block';
                return { 0: element };
            },
            hide: () => {
                if (element) element.style.display = 'none';
                return { 0: element };
            }
        };
    }
    return { length: 0 };
};

$.fn = {};

if (typeof window !== 'undefined') {
    window.$ = $;
    window.jQuery = $;
} else if (typeof global !== 'undefined') {
    global.$ = $;
    global.jQuery = $;
}