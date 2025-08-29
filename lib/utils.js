(function() {
    if (window.utilsScriptInjected) {
        return;
    }
    window.utilsScriptInjected = true;

    /**
     * Utility Functions for Chrome Extension AI Chatbot
     * Shared helper functions and constants
     */

    // Constants
    const CONSTANTS = {
        // Storage keys
        STORAGE_KEYS: {
            SETTINGS: 'settings',
            CHAT_HISTORY: 'chatHistory',
            CURRENT_SESSION: 'currentSession',
            LAST_CLEANUP: 'lastCleanup'
        },
        
        // Limits
        MAX_MESSAGES: 1000,
        MAX_MESSAGE_LENGTH: 2000,
        MAX_SESSION_AGE: 24 * 60 * 60 * 1000, // 24 hours
        MAX_MESSAGE_AGE: 30 * 24 * 60 * 60 * 1000, // 30 days
        
        // Timeouts
        DEFAULT_TIMEOUT: 30000, // 30 seconds
        CONNECTION_TEST_TIMEOUT: 10000, // 10 seconds
        RETRY_DELAY: 1000, // 1 second
        
        // API
        DEFAULT_RETRIES: 3,
        
        // UI
        TYPING_ANIMATION_DURATION: 1400,
        SCROLL_BEHAVIOR: 'smooth',
        TOAST_DURATION: 5000
    };

    // Utility Classes and Functions

    /**
     * Event Bus for component communication
     */
    class EventBus {
        constructor() {
            this.events = {};
        }
        
        on(event, callback) {
            if (!this.events[event]) {
                this.events[event] = [];
            }
            this.events[event].push(callback);
        }
        
        off(event, callback) {
            if (!this.events[event]) return;
            
            const index = this.events[event].indexOf(callback);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        }
        
        emit(event, data) {
            if (!this.events[event]) return;
            
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
        
        clear() {
            this.events = {};
        }
    }

    /**
     * Logger utility with levels
     */
    class Logger {
        constructor(context = 'ChatBot') {
            this.context = context;
            this.level = this.getLogLevel();
        }
        
        getLogLevel() {
            // Check if debug mode is enabled
            return chrome.storage?.local ? 'info' : 'error';
        }
        
        debug(...args) {
            if (this.level === 'debug') {
                console.debug(`[${this.context}]`, ...args);
            }
        }
        
        info(...args) {
            if (['debug', 'info'].includes(this.level)) {
                console.info(`[${this.context}]`, ...args);
            }
        }
        
        warn(...args) {
            if (['debug', 'info', 'warn'].includes(this.level)) {
                console.warn(`[${this.context}]`, ...args);
            }
        }
        
        error(...args) {
            console.error(`[${this.context}]`, ...args);
        }
    }

    /**
     * Validation utilities
     */
    class Validator {
        static isValidUrl(url) {
            try {
                const urlObj = new URL(url);
                return ['http:', 'https:'].includes(urlObj.protocol);
            } catch {
                return false;
            }
        }
        
        static isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        static isValidJSON(str) {
            try {
                JSON.parse(str);
                return true;
            } catch {
                return false;
            }
        }
        
        static sanitizeInput(input, maxLength = CONSTANTS.MAX_MESSAGE_LENGTH) {
            if (typeof input !== 'string') return '';
            return input.trim().substring(0, maxLength);
        }
        
        static validateSettings(settings) {
            const defaults = {
                webhookUrl: '',
                timeout: 300,
                maxRetries: 3,
                saveHistory: true,
                autoScroll: true,
                notifications: true,
                theme: 'light',
                sessionDuration: 24,
                debugMode: false,
                customHeaders: '',
                version: '0.7.0'
            };
            
            const validated = { ...defaults };
            
            // Validate webhook URL
            if (settings.webhookUrl && typeof settings.webhookUrl === 'string') {
                const url = settings.webhookUrl.trim();
                if (url && Validator.isValidUrl(url)) {
                    validated.webhookUrl = url;
                }
            }
            
            // Validate numeric values
            if (typeof settings.timeout === 'number') {
                validated.timeout = Math.max(5, Math.min(1800, settings.timeout));
            }
            
            if (typeof settings.maxRetries === 'number') {
                validated.maxRetries = Math.max(0, Math.min(5, settings.maxRetries));
            }
            
            if (typeof settings.sessionDuration === 'number') {
                validated.sessionDuration = Math.max(1, Math.min(168, settings.sessionDuration));
            }
            
            // Validate boolean values
            ['saveHistory', 'autoScroll', 'notifications', 'debugMode'].forEach(key => {
                if (typeof settings[key] === 'boolean') {
                    validated[key] = settings[key];
                }
            });
            
            // Validate theme
            if (settings.theme && ['light', 'dark', 'auto'].includes(settings.theme)) {
                validated.theme = settings.theme;
            }
            
            // Validate custom headers
            if (settings.customHeaders && typeof settings.customHeaders === 'string') {
                const headers = settings.customHeaders.trim();
                if (!headers || Validator.isValidJSON(headers)) {
                    validated.customHeaders = headers;
                }
            }
            
            return validated;
        }
    }

    /**
     * Format utilities
     */
    class Formatter {
        static formatTime(date, options = {}) {
            const defaultOptions = {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            
            return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options })
                .format(new Date(date));
        }
        
        static formatDate(date, options = {}) {
            const defaultOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            };
            
            return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options })
                .format(new Date(date));
        }
        
        static formatDateTime(date) {
            return `${Formatter.formatDate(date)} ${Formatter.formatTime(date)}`;
        }
        
        static formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        static formatNumber(num) {
            return new Intl.NumberFormat('en-US').format(num);
        }
        
        static truncateText(text, maxLength = 100, suffix = '...') {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength - suffix.length) + suffix;
        }
    }

    /**
     * DOM manipulation utilities
     */
    class DOMUtils {
        static escapeHTML(str) {
            if (typeof str !== 'string') return '';
            return str.replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            })[char]);
        }

        static createElement(tag, className = '', attributes = {}) {
            const element = document.createElement(tag);
            
            if (className) {
                element.className = className;
            }
            
            Object.keys(attributes).forEach(key => {
                element.setAttribute(key, attributes[key]);
            });
            
            return element;
        }
        
        static addCSS(css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
            return style;
        }
        
        static scrollToBottom(element, behavior = CONSTANTS.SCROLL_BEHAVIOR) {
            element.scrollTo({
                top: element.scrollHeight,
                behavior
            });
        }
        
        static fadeIn(element, duration = 300) {
            element.style.opacity = '0';
            element.style.display = 'block';
            
            let start = null;
            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = (timestamp - start) / duration;
                
                element.style.opacity = Math.min(progress, 1);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        }
        
        static fadeOut(element, duration = 300) {
            let start = null;
            const initialOpacity = parseFloat(getComputedStyle(element).opacity);
            
            const animate = (timestamp) => {
                if (!start) start = timestamp;
                const progress = (timestamp - start) / duration;
                
                element.style.opacity = initialOpacity * (1 - Math.min(progress, 1));
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    element.style.display = 'none';
                }
            };
            
            requestAnimationFrame(animate);
        }
    }

    /**
     * Storage utilities
     */
    class StorageUtils {
        static async get(key) {
            if (!chrome.storage?.local) {
                return localStorage.getItem(key);
            }
            
            const result = await chrome.storage.local.get([key]);
            return result[key];
        }
        
        static async set(key, value) {
            if (!chrome.storage?.local) {
                return localStorage.setItem(key, JSON.stringify(value));
            }
            
            await chrome.storage.local.set({ [key]: value });
        }
        
        static async remove(key) {
            if (!chrome.storage?.local) {
                return localStorage.removeItem(key);
            }
            
            await chrome.storage.local.remove([key]);
        }
        
        static async clear() {
            if (!chrome.storage?.local) {
                return localStorage.clear();
            }
            
            await chrome.storage.local.clear();
        }
        
        static async getSize() {
            if (!chrome.storage?.local) {
                return JSON.stringify(localStorage).length;
            }
            
            const all = await chrome.storage.local.get(null);
            return JSON.stringify(all).length;
        }
    }

    /**
     * Async utilities
     */
    class AsyncUtils {
        static delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        
        static timeout(promise, ms) {
            return Promise.race([
                promise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Operation timed out')), ms)
                )
            ]);
        }
        
        static retry(fn, maxAttempts = 3, delay = 1000) {
            return new Promise(async (resolve, reject) => {
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        const result = await fn();
                        resolve(result);
                        return;
                    } catch (error) {
                        if (attempt === maxAttempts) {
                            reject(error);
                            return;
                        }
                        
                        await AsyncUtils.delay(delay * Math.pow(2, attempt - 1));
                    }
                }
            });
        }
        
        static debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        static throttle(func, limit) {
            let inThrottle;
            return function executedFunction(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        }
    }

    /**
     * Error handling utilities
     */
    class ErrorHandler {
        static handle(error, context = 'Unknown') {
            const logger = new Logger(context);
            
            if (error instanceof Error) {
                logger.error('Error occurred:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
            } else {
                logger.error('Unknown error:', error);
            }
            
            // You could add error reporting here
            // this.reportError(error, context);
        }
        
        static createError(message, code = 'UNKNOWN_ERROR', details = {}) {
            const error = new Error(message);
            error.code = code;
            error.details = details;
            return error;
        }
        
        static isNetworkError(error) {
            return error.name === 'TypeError' && error.message.includes('fetch');
        }
        
        static isTimeoutError(error) {
            return error.message.includes('timeout') || error.name === 'AbortError';
        }
    }

    // Export utilities for use in extension
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            CONSTANTS,
            EventBus,
            Logger,
            Validator,
            Formatter,
            DOMUtils,
            StorageUtils,
            AsyncUtils,
            ErrorHandler
        };
    } else {
        // Browser environment - attach to window
        window.ChatBotUtils = {
            CONSTANTS,
            EventBus,
            Logger,
            Validator,
            Formatter,
            DOMUtils,
            StorageUtils,
            AsyncUtils,
            ErrorHandler
        };
    }
})();