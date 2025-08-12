/**
 * Chrome Extension Background Service Worker
 * Handles extension lifecycle, API requests, and message passing
 */

// Unified API Client - embedded to avoid importScripts issues
class UnifiedApiClient {
    constructor() {
        this.backend = 'n8n'; // 'n8n' or 'ollama'
        this.settings = {};
    }

    async initialize(settings) {
        this.settings = settings;
        this.backend = settings.backend || 'n8n';
    }

    async sendMessage(message, context = {}) {
        if (this.backend === 'ollama') {
            return await this.sendMessageToOllama(message, context);
        } else {
            return await this.sendMessageToN8n(message, context);
        }
    }

    async sendMessageToOllama(message, context = {}) {
        const payload = {
            model: this.settings.ollamaModel || 'llama3',
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt(context.category || 'GENERAL')
                },
                {
                    role: 'user',
                    content: message.trim()
                }
            ],
            stream: false,
            options: {
                temperature: this.settings.temperature || 0.7
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.settings.timeout * 1000);

        try {
            const response = await fetch(`${this.settings.ollamaUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.message || !data.message.content) {
                throw new Error('Invalid response from Ollama: missing message content');
            }

            // Parse and clean the response to remove thinking parts
            const cleanedMessage = this.parseOllamaResponse(data.message.content);

            return {
                message: cleanedMessage,
                sessionId: context.sessionId || this.generateSessionId(),
                timestamp: new Date().toISOString(),
                success: true,
                backend: 'ollama',
                metadata: {
                    model: data.model,
                    total_duration: data.total_duration,
                    eval_count: data.eval_count
                }
            };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Ollama request timeout');
            }
            throw new Error(`Ollama error: ${error.message}`);
        }
    }

    async sendMessageToN8n(message, context = {}) {
        const payload = {
            data: {
                text: message.trim(),
                category: context.category || 'GENERAL'
            },
            timestamp: new Date().toISOString(),
            sessionId: context.sessionId || this.generateSessionId(),
            userId: 'chrome-extension-user',
            metadata: {
                source: 'chrome-extension',
                version: '0.7.0',
                userAgent: navigator.userAgent,
                agentType: context.category || 'GENERAL',
                backend: 'n8n'
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.settings.timeout * 1000);

        try {
            const response = await fetch(this.settings.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`n8n HTTP ${response.status}: ${errorText || response.statusText}`);
            }

            const responseText = await response.text();
            if (!responseText.trim()) {
                throw new Error('Empty response from n8n webhook');
            }

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
            }

            let botMessage;
            if (Array.isArray(responseData) && responseData.length > 0) {
                const firstItem = responseData[0];
                botMessage = firstItem.output || firstItem.message || firstItem.response || firstItem.text || firstItem.content;
            } else if (typeof responseData === 'object' && responseData !== null) {
                botMessage = responseData.message || responseData.response || responseData.text || responseData.content || responseData.output;
            } else if (typeof responseData === 'string') {
                botMessage = responseData;
            }

            if (!botMessage || botMessage.trim() === '') {
                botMessage = 'AI 서비스에서 응답을 받았지만 메시지 내용이 비어있습니다.';
            }

            return {
                message: botMessage,
                sessionId: payload.sessionId,
                timestamp: new Date().toISOString(),
                success: true,
                backend: 'n8n'
            };

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('n8n request timeout');
            }
            throw new Error(`n8n webhook error: ${error.message}`);
        }
    }


    async testConnection() {
        if (this.backend === 'ollama') {
            return await this.testOllamaConnection();
        } else {
            return await this.testN8nConnection();
        }
    }

    async testOllamaConnection() {
        try {
            const response = await fetch(`${this.settings.ollamaUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const models = data.models || [];
                return {
                    connected: models.length > 0,
                    url: this.settings.ollamaUrl,
                    models: models.length,
                    backend: 'ollama',
                    error: models.length === 0 ? 'No models available' : null
                };
            }
            return {
                connected: false,
                error: `HTTP ${response.status}: ${response.statusText}`,
                backend: 'ollama'
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                backend: 'ollama'
            };
        }
    }

    async testN8nConnection() {
        try {
            if (!this.settings.webhookUrl) {
                return {
                    connected: false,
                    error: 'No n8n webhook URL configured',
                    backend: 'n8n'
                };
            }

            const testPayload = {
                data: {
                    text: 'Connection test',
                    category: 'GENERAL'
                },
                timestamp: new Date().toISOString(),
                sessionId: 'test_session',
                userId: 'chrome-extension-test',
                metadata: {
                    source: 'chrome-extension',
                    version: '0.7.0',
                    agentType: 'general',
                    isTest: true,
                    backend: 'n8n'
                }
            };

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(this.settings.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(testPayload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const responseText = await response.text();

            return {
                connected: response.ok && responseText.trim() !== '',
                status: response.status,
                statusText: response.statusText,
                url: this.settings.webhookUrl,
                responseText: responseText.substring(0, 200),
                backend: 'n8n',
                error: !response.ok ? `HTTP ${response.status}: ${response.statusText}` : null
            };

        } catch (error) {
            return {
                connected: false,
                error: error.name === 'AbortError' ? 'Request timeout' : error.message,
                url: this.settings.webhookUrl,
                backend: 'n8n'
            };
        }
    }

    async getAvailableModels() {
        if (this.backend === 'ollama') {
            try {
                const response = await fetch(`${this.settings.ollamaUrl}/api/tags`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.models || [];
                }
            } catch (error) {
                console.error('Failed to get Ollama models:', error);
            }
        }
        return [];
    }

    getSystemPrompt(category) {
        const prompts = {
            GENERAL: 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.',
            HR: 'You are an HR specialist. Help with human resources questions, policies, benefits, and workplace issues. Be professional and empathetic.',
            IT: 'You are an IT support specialist. Help with technical issues, troubleshooting, software problems, and technology questions. Provide step-by-step solutions.',
            DATA: 'You are a data analyst. Help with data analysis, statistics, data visualization, and insights. Explain complex data concepts clearly.',
            FINANCE: 'You are a finance expert. Help with financial analysis, budgeting, investments, and financial planning. Provide accurate financial guidance.',
            MARKETING: 'You are a marketing specialist. Help with marketing strategies, campaigns, branding, and customer engagement. Be creative and strategic.',
            LEGAL: 'You are a legal advisor. Help with legal questions, compliance, and legal guidance. Always remind users to consult with qualified legal professionals for important matters.',
            SECURITY: 'You are a security specialist. Help with cybersecurity questions, security best practices, threat analysis, and security compliance. Provide clear guidance on protecting systems and data.'
        };
        return prompts[category] || prompts.GENERAL;
    }

    /**
     * Parse Ollama response to remove thinking parts and extract clean answer
     * @param {string} content - Raw response content
     * @returns {string} - Cleaned response
     */
    parseOllamaResponse(content) {
        if (!content || typeof content !== 'string') {
            return content;
        }

        let cleanedContent = content;

        // Remove content within <think> tags (case insensitive)
        cleanedContent = cleanedContent.replace(/<think>[\s\S]*?<\/think>/gi, '');

        // Remove content within <thinking> tags (case insensitive)
        cleanedContent = cleanedContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

        // Remove content within [thinking] brackets
        cleanedContent = cleanedContent.replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, '');

        // Remove content within (thinking) parentheses
        cleanedContent = cleanedContent.replace(/\(thinking\)[\s\S]*?\(\/thinking\)/gi, '');

        // Remove obvious meta-commentary patterns at the beginning
        // Look for patterns like "The user is asking...", "I need to...", etc.
        cleanedContent = cleanedContent.replace(/^(The user is asking|I need to|Let me think|I should|Looking at this|This question|The question|I'll|I will|I can see|I understand|I notice)[\s\S]*?(?=\n\n|\. [A-Z])/i, '');

        // Remove analysis patterns that don't contribute to the actual answer
        cleanedContent = cleanedContent.replace(/^(Okay|Alright|Well|So|Now|First|Initially)[\s,]\s*(the user|I need|let me|I should|I'll|I will)[\s\S]*?(?=\n\n|\. [A-Z])/i, '');

        // Clean up extra whitespace and newlines
        cleanedContent = cleanedContent.trim();
        cleanedContent = cleanedContent.replace(/\n\s*\n/g, '\n');
        cleanedContent = cleanedContent.replace(/^\s+|\s+$/gm, '');

        // If we ended up with empty content or very short content, return original
        if (!cleanedContent || cleanedContent.length < 10) {
            return content.trim();
        }

        return cleanedContent;
    }

    generateSessionId() {
        const prefix = this.backend === 'ollama' ? 'ollama' : 'n8n';
        return `${prefix}_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('AI Chatbot Extension installed/updated:', details.reason);

    // Set default settings on first install
    if (details.reason === 'install') {
        await initializeDefaultSettings();
    }

    // Handle updates
    if (details.reason === 'update') {
        await handleExtensionUpdate(details.previousVersion);
    }
    
    // Create context menus
    await createContextMenus();
});

// Extension startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('AI Chatbot Extension started');
    await createContextMenus();
});

/**
 * Initialize default settings
 */
async function initializeDefaultSettings() {
    try {
        const defaultSettings = {
            backend: 'n8n', // 'n8n' or 'ollama'
            webhookUrl: '',
            ollamaUrl: 'http://localhost:11434',
            ollamaModel: '',
            temperature: 0.7,
            timeout: 30,
            saveHistory: true,
            theme: 'light',
            notifications: true,
            autoScroll: true,
            showToggleButton: true,
            showHtmlButton: true,
            sidebarWidth: 400,
            allowPrivateNetwork: true,
            visibleCategories: {
                GENERAL: true,
                HR: false,
                IT: false,
                DATA: false,
                FINANCE: false,
                MARKETING: false,
                LEGAL: false,
                SECURITY: false
            },
            version: '0.7.0'
        };

        await chrome.storage.local.set({ settings: defaultSettings });
        console.log('Default settings initialized');
    } catch (error) {
        console.error('Failed to initialize default settings:', error);
    }
}

/**
 * Handle extension updates
 */
async function handleExtensionUpdate(previousVersion) {
    try {
        console.log(`Updated from version ${previousVersion} to 0.7.0`);

        // Migrate settings if needed
        const result = await chrome.storage.local.get(['settings']);
        if (result.settings) {
            result.settings.version = '0.7.0';
            await chrome.storage.local.set({ settings: result.settings });
        }
    } catch (error) {
        console.error('Failed to handle extension update:', error);
    }
}

/**
 * Message passing between popup and background
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'sendMessage':
            handleSendMessage(request.data)
                .then(response => sendResponse({ success: true, data: response }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response

        case 'getSettings':
            getSettings()
                .then(settings => sendResponse({ success: true, data: settings }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'saveSettings':
            saveSettings(request.data)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'testConnection':
            testConnection()
                .then(result => sendResponse({ success: true, data: result }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'getAvailableModels':
            getAvailableModels()
                .then(models => sendResponse({ success: true, data: models }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'getChatHistory':
            getChatHistory(request.limit)
                .then(history => sendResponse({ success: true, data: history }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'clearHistory':
            clearChatHistory()
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'getPageContent':
            handleGetPageContent()
                .then(data => sendResponse({ success: true, data }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        default:
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

/**
 * Get page content from active tab
 */
async function handleGetPageContent() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('No active tab found.');
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => document.documentElement.outerHTML
        });

        if (results && results[0] && results[0].result) {
            return { html: results[0].result, title: tab.title };
        } else {
            throw new Error('Could not retrieve page content.');
        }
    } catch (error) {
        console.error('Error getting page content:', error);
        throw error;
    }
}

/**
 * Handle sending message using unified API client
 */
async function handleSendMessage(data) {
    try {
        const { message, sessionId, category } = data;

        // Get current settings
        const settings = await getSettings();
        const backend = settings.backend || 'n8n';

        // Validate backend configuration
        if (backend === 'n8n' && !settings.webhookUrl) {
            throw new Error('n8n webhook URL not configured');
        }
        if (backend === 'ollama' && !settings.ollamaUrl) {
            throw new Error('Ollama URL not configured');
        }

        // Initialize unified API client
        const apiClient = new UnifiedApiClient();
        await apiClient.initialize(settings);

        // Send message using unified client
        const response = await apiClient.sendMessage(message, {
            category: category || 'GENERAL',
            sessionId: sessionId || await getSessionId()
        });

        // Save messages to history if enabled
        if (settings.saveHistory) {
            await saveMessageToHistory({
                type: 'user',
                content: message,
                sessionId: response.sessionId,
                backend: response.backend
            });

            await saveMessageToHistory({
                type: 'bot',
                content: response.message,
                sessionId: response.sessionId,
                backend: response.backend
            });
        }

        console.log('API response:', {
            backend: response.backend,
            message: response.message.substring(0, 100) + '...',
            sessionId: response.sessionId,
            metadata: response.metadata
        });

        return response;

    } catch (error) {
        console.error('Failed to send message:', error);

        if (error.name === 'AbortError') {
            throw new Error('Request timeout');
        }

        throw new Error(`Failed to send message: ${error.message}`);
    }
}

/**
 * Get settings from storage
 */
async function getSettings() {
    try {
        const result = await chrome.storage.local.get(['settings']);
        return result.settings || await getDefaultSettings();
    } catch (error) {
        console.error('Failed to get settings:', error);
        return await getDefaultSettings();
    }
}

/**
 * Get default settings
 */
async function getDefaultSettings() {
    const defaults = {
        backend: 'n8n',
        webhookUrl: '',
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: '',
        temperature: 0.7,
        timeout: 30,
        saveHistory: true,
        theme: 'light',
        notifications: true,
        autoScroll: true,
        showToggleButton: true,
        showHtmlButton: true,
        sidebarWidth: 400,
        allowPrivateNetwork: true,
        visibleCategories: {
            GENERAL: true,
            HR: false,
            IT: false,
            DATA: false,
            FINANCE: false,
            MARKETING: false,
            LEGAL: false,
            SECURITY: false
        },
        version: '0.7.0'
    };

    // Save defaults if not exists
    await chrome.storage.local.set({ settings: defaults });
    return defaults;
}

/**
 * Save settings to storage
 */
async function saveSettings(settings) {
    try {
        // Validate settings
        const validatedSettings = validateSettings(settings);
        await chrome.storage.local.set({ settings: validatedSettings });
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
    }
}

/**
 * Validate settings object
 */
function validateSettings(settings) {
    const defaults = {
        backend: 'n8n',
        webhookUrl: '',
        ollamaUrl: 'http://localhost:11434',
        ollamaModel: '',
        temperature: 0.7,
        timeout: 30,
        saveHistory: true,
        theme: 'light',
        notifications: true,
        autoScroll: true,
        showToggleButton: true,
        showHtmlButton: true,
        sidebarWidth: 400,
        allowPrivateNetwork: true,
        visibleCategories: {
            GENERAL: true,
            HR: false,
            IT: false,
            DATA: false,
            FINANCE: false,
            MARKETING: false,
            LEGAL: false,
            SECURITY: false
        },
        version: '0.7.0'
    };

    const validated = { ...defaults };

    // Validate backend
    if (settings.backend && ['n8n', 'ollama'].includes(settings.backend)) {
        validated.backend = settings.backend;
    }

    // Get allowPrivateNetwork setting
    const allowPrivateNetwork = typeof settings.allowPrivateNetwork === 'boolean' ? 
        settings.allowPrivateNetwork : true;
    
    // Validate boolean settings first to get allowPrivateNetwork
    ['saveHistory', 'notifications', 'autoScroll', 'showToggleButton', 'showHtmlButton', 'allowPrivateNetwork'].forEach(key => {
        if (typeof settings[key] === 'boolean') {
            validated[key] = settings[key];
        }
    });

    // Validate URLs
    if (settings.webhookUrl && typeof settings.webhookUrl === 'string') {
        const url = settings.webhookUrl.trim();
        if (url && isValidUrl(url, validated.allowPrivateNetwork)) {
            validated.webhookUrl = url;
        }
    }

    if (settings.ollamaUrl && typeof settings.ollamaUrl === 'string') {
        const url = settings.ollamaUrl.trim();
        if (url && isValidUrl(url, validated.allowPrivateNetwork)) {
            validated.ollamaUrl = url;
        }
    }

    // Validate model and temperature
    if (settings.ollamaModel && typeof settings.ollamaModel === 'string') {
        validated.ollamaModel = settings.ollamaModel.trim();
    }

    if (settings.temperature && typeof settings.temperature === 'number') {
        validated.temperature = Math.max(0.1, Math.min(2.0, settings.temperature));
    }

    // Validate timeout
    if (settings.timeout && typeof settings.timeout === 'number') {
        validated.timeout = Math.max(5, Math.min(600, settings.timeout));
    }


    // Validate sidebar width
    if (settings.sidebarWidth && typeof settings.sidebarWidth === 'number') {
        validated.sidebarWidth = Math.max(300, Math.min(800, settings.sidebarWidth));
    }


    // Validate theme
    if (settings.theme && ['light', 'dark', 'auto'].includes(settings.theme)) {
        validated.theme = settings.theme;
    }

    // Validate visible categories
    if (settings.visibleCategories && typeof settings.visibleCategories === 'object') {
        const categories = ['GENERAL', 'HR', 'IT', 'DATA', 'FINANCE', 'MARKETING', 'LEGAL', 'SECURITY'];
        const visibleCategories = { ...defaults.visibleCategories };
        let hasVisible = false;
        
        categories.forEach(category => {
            if (typeof settings.visibleCategories[category] === 'boolean') {
                visibleCategories[category] = settings.visibleCategories[category];
                if (settings.visibleCategories[category]) {
                    hasVisible = true;
                }
            }
        });
        
        // Ensure at least one category is visible
        if (!hasVisible) {
            visibleCategories.GENERAL = true;
        }
        
        validated.visibleCategories = visibleCategories;
    }

    return validated;
}

/**
 * Validate URL format and security.
 * Prevents requests to private, loopback, or reserved IP addresses.
 */
function isValidUrl(string, allowPrivateNetwork = true) {
    try {
        const url = new URL(string);

        // 1. Protocol check
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return false;
        }

        // 2. Hostname check - only if private network is not allowed
        if (!allowPrivateNetwork) {
            const hostname = url.hostname;

            // Disallow IP addresses in private ranges to prevent SSRF
            if (isPrivateIP(hostname)) {
                console.warn(`Blocked request to private IP: ${hostname}`);
                return false;
            }
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a given string is a private, loopback, or reserved IP address.
 * Now includes whitelist for specific allowed private IP ranges.
 * @param {string} ip - The IP address string to check.
 * @returns {boolean} - True if the IP is private and NOT whitelisted, false otherwise.
 */
function isPrivateIP(ip) {
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        // It's not an IPv4 address, could be a domain name.
        // We allow domain names here and would rely on DNS resolution
        // in a more advanced implementation.
        // A simple check for localhost is still valuable.
        return ip.toLowerCase() === 'localhost';
    }

    const parts = ip.split('.').map(part => parseInt(part, 10));

    // Whitelist specific IP ranges that should be allowed
    // Allow 172.16.x.x subnet
    if (parts[0] === 172 && parts[1] === 16) {
        return false; // Allow this specific range
    }

    // Allow 10.41.x.x subnet
    if (parts[0] === 10 && parts[1] === 41) {
        return false; // Allow this specific range
    }

    // Check for loopback address (127.0.0.0/8)
    if (parts[0] === 127) {
        return true;
    }

    // Check for private class A (10.0.0.0/8) - but exclude whitelisted 10.41.x.x
    if (parts[0] === 10) {
        return true;
    }

    // Check for private class B (172.16.0.0/12) - but exclude whitelisted 172.16.x.x
    if (parts[0] === 172 && (parts[1] >= 16 && parts[1] <= 31)) {
        return true;
    }

    // Check for private class C (192.168.0.0/16)
    if (parts[0] === 192 && parts[1] === 168) {
        return true;
    }

    // Check for Carrier-grade NAT (100.64.0.0/10)
    if (parts[0] === 100 && (parts[1] >= 64 && parts[1] <= 127)) {
        return true;
    }

    // Check for broadcast address
    if (ip === '255.255.255.255') {
        return true;
    }

    return false;
}

/**
 * Test connection for current backend
 */
async function testConnection() {
    try {
        const settings = await getSettings();
        const apiClient = new UnifiedApiClient();
        await apiClient.initialize(settings);

        return await apiClient.testConnection();
    } catch (error) {
        console.error('Connection test error:', error);
        return {
            connected: false,
            error: error.message
        };
    }
}

/**
 * Get available models (for Ollama)
 */
async function getAvailableModels() {
    try {
        const settings = await getSettings();
        if (settings.backend !== 'ollama') {
            return [];
        }

        const apiClient = new UnifiedApiClient();
        await apiClient.initialize(settings);

        return await apiClient.getAvailableModels();
    } catch (error) {
        console.error('Failed to get available models:', error);
        return [];
    }
}



/**
 * Get current session ID
 */
async function getSessionId() {
    try {
        const result = await chrome.storage.local.get(['currentSession']);
        if (result.currentSession && isValidSession(result.currentSession)) {
            return result.currentSession.id;
        }

        // Create new session
        const newSession = {
            id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            startTime: new Date().toISOString(),
            messageCount: 0
        };

        await chrome.storage.local.set({ currentSession: newSession });
        return newSession.id;
    } catch (error) {
        console.error('Failed to get session ID:', error);
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}

/**
 * Check if session is valid
 */
function isValidSession(session) {
    try {
        const sessionTime = new Date(session.startTime).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        return (Date.now() - sessionTime) < maxAge;
    } catch {
        return false;
    }
}

/**
 * Save message to chat history
 */
async function saveMessageToHistory(message) {
    try {
        const result = await chrome.storage.local.get(['chatHistory']);
        const history = result.chatHistory || [];

        const messageObj = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            type: message.type,
            content: message.content,
            timestamp: new Date().toISOString(),
            sessionId: message.sessionId,
            backend: message.backend || 'n8n'
        };

        history.push(messageObj);

        // Keep only last 1000 messages
        if (history.length > 1000) {
            history.splice(0, history.length - 1000);
        }

        await chrome.storage.local.set({ chatHistory: history });
    } catch (error) {
        console.error('Failed to save message to history:', error);
    }
}

/**
 * Get chat history
 */
async function getChatHistory(limit = 100) {
    try {
        const result = await chrome.storage.local.get(['chatHistory']);
        const history = result.chatHistory || [];
        return history.slice(-limit);
    } catch (error) {
        console.error('Failed to get chat history:', error);
        return [];
    }
}

/**
 * Clear chat history
 */
async function clearChatHistory() {
    try {
        await chrome.storage.local.set({ chatHistory: [] });
        return true;
    } catch (error) {
        console.error('Failed to clear chat history:', error);
        throw error;
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // Check if we should show popup or toggle sidebar
        const settings = await getSettings();
        const shouldUsePopup = await shouldShowPopup(tab);
        
        if (shouldUsePopup) {
            // Show popup by setting it temporarily
            await chrome.action.setPopup({
                tabId: tab.id,
                popup: 'popup/popup.html'
            });
            // The popup will open automatically on next click
            // Reset popup after a short delay
            setTimeout(async () => {
                await chrome.action.setPopup({
                    tabId: tab.id,
                    popup: ''
                });
            }, 100);
        } else {
            // Toggle sidebar
            await toggleSidebar(tab);
        }
    } catch (error) {
        console.error('Failed to handle extension icon click:', error);
        // Fallback to sidebar toggle
        await toggleSidebar(tab);
    }
});

/**
 * Determine if we should show popup or sidebar
 */
async function shouldShowPopup(tab) {
    // Show popup for extension pages, chrome pages, or restricted URLs
    const restrictedUrls = [
        'chrome://',
        'chrome-extension://',
        'moz-extension://',
        'about:',
        'file://'
    ];
    
    const url = tab.url?.toLowerCase() || '';
    return restrictedUrls.some(restricted => url.startsWith(restricted));
}

/**
 * Toggle sidebar on the current tab
 */
async function toggleSidebar(tab) {
    try {
        // Send message to content script to toggle sidebar
        await chrome.tabs.sendMessage(tab.id, {
            action: 'toggleSidebar'
        });
        console.log('Toggle sidebar message sent to tab:', tab.id);
    } catch (error) {
        console.error('Failed to send toggle message to content script:', error);
        
        // If content script is not loaded, inject it
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['lib/utils.js', 'content/content.js']
            });
            
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['content/sidebar.css']
            });
            
            // Try to send the toggle message again after injection
            setTimeout(async () => {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'toggleSidebar'
                    });
                } catch (retryError) {
                    console.error('Failed to send toggle message after injection:', retryError);
                }
            }, 100);
            
        } catch (injectionError) {
            console.error('Failed to inject content script:', injectionError);
            
            // If injection fails, show popup as fallback
            await chrome.action.setPopup({
                tabId: tab.id,
                popup: 'popup/popup.html'
            });
        }
    }
}/*
*
 * Create context menus
 */
async function createContextMenus() {
    try {
        // Remove existing menus first
        await chrome.contextMenus.removeAll();
        
        // Create options menu as main menu item
        chrome.contextMenus.create({
            id: 'open-options',
            title: 'Options',
            contexts: ['action']
        });
        
        console.log('Context menus created successfully');
    } catch (error) {
        console.error('Failed to create context menus:', error);
    }
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    try {
        switch (info.menuItemId) {
            case 'open-options':
                await chrome.runtime.openOptionsPage();
                break;
                
            default:
                console.log('Unknown context menu item:', info.menuItemId);
        }
    } catch (error) {
        console.error('Failed to handle context menu click:', error);
    }
});

