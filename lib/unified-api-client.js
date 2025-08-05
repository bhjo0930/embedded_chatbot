/**
 * Unified API Client
 * Handles communication with both n8n webhook and Ollama
 */
class UnifiedApiClient {
    constructor() {
        this.backend = 'n8n'; // 'n8n' or 'ollama'
        this.n8nClient = null;
        this.ollamaClient = null;
        this.settings = {};
    }

    /**
     * Initialize the unified client with settings
     * @param {Object} settings - Configuration settings
     */
    async initialize(settings) {
        this.settings = settings;
        this.backend = settings.backend || 'n8n';

        if (this.backend === 'ollama') {
            if (!this.ollamaClient) {
                // Dynamically import OllamaClient if not already loaded
                if (typeof OllamaClient === 'undefined') {
                    await this.loadOllamaClient();
                }
                this.ollamaClient = new OllamaClient();
            }
            await this.ollamaClient.initialize(settings);
        } else {
            // n8n backend - use existing logic
            this.validateN8nSettings(settings);
        }
    }

    /**
     * Load Ollama client dynamically
     */
    async loadOllamaClient() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('lib/ollama-client.js');
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Validate n8n settings
     */
    validateN8nSettings(settings) {
        if (!settings.webhookUrl) {
            throw new Error('n8n webhook URL not configured');
        }
        
        if (!this.isValidUrl(settings.webhookUrl)) {
            throw new Error('Invalid n8n webhook URL');
        }
    }

    /**
     * Send message using the configured backend
     * @param {string} message - User message
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} - API response
     */
    async sendMessage(message, context = {}) {
        if (this.backend === 'ollama') {
            return await this.sendMessageToOllama(message, context);
        } else {
            return await this.sendMessageToN8n(message, context);
        }
    }

    /**
     * Send message to Ollama
     * @param {string} message - User message
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} - API response
     */
    async sendMessageToOllama(message, context = {}) {
        if (!this.ollamaClient) {
            throw new Error('Ollama client not initialized');
        }

        try {
            const response = await this.ollamaClient.sendMessage(message, {
                category: context.category || 'GENERAL',
                model: this.settings.ollamaModel,
                temperature: this.settings.temperature || 0.7,
                ...context
            });

            return {
                message: response.message,
                sessionId: context.sessionId || this.ollamaClient.generateSessionId(),
                timestamp: response.timestamp,
                success: true,
                backend: 'ollama',
                metadata: response.metadata
            };
        } catch (error) {
            console.error('Ollama API error:', error);
            throw new Error(`Ollama error: ${error.message}`);
        }
    }

    /**
     * Send message to n8n webhook
     * @param {string} message - User message
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} - API response
     */
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

        // Make request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.settings.timeout * 1000);

        try {
            const response = await fetch(this.settings.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...this.parseCustomHeaders()
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
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

            // Process response
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
                throw new Error('Request timeout');
            }
            
            throw new Error(`n8n webhook error: ${error.message}`);
        }
    }

    /**
     * Parse custom headers from settings
     */
    parseCustomHeaders() {
        if (!this.settings.customHeaders) {
            return {};
        }

        try {
            return JSON.parse(this.settings.customHeaders);
        } catch (error) {
            console.warn('Invalid custom headers JSON:', error);
            return {};
        }
    }

    /**
     * Test connection for current backend
     * @returns {Promise<Object>} - Connection test result
     */
    async testConnection() {
        if (this.backend === 'ollama') {
            return await this.testOllamaConnection();
        } else {
            return await this.testN8nConnection();
        }
    }

    /**
     * Test Ollama connection
     */
    async testOllamaConnection() {
        try {
            if (!this.ollamaClient) {
                return {
                    connected: false,
                    error: 'Ollama client not initialized'
                };
            }

            const status = await this.ollamaClient.getConnectionStatus();
            return {
                connected: status.connected,
                error: status.error,
                url: status.url,
                models: status.models,
                defaultModel: status.defaultModel,
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

    /**
     * Test n8n connection
     */
    async testN8nConnection() {
        try {
            if (!this.settings.webhookUrl) {
                return {
                    connected: false,
                    error: 'No n8n webhook URL configured'
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
                    'Accept': 'application/json',
                    ...this.parseCustomHeaders()
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

    /**
     * Get available models (for Ollama)
     */
    async getAvailableModels() {
        if (this.backend === 'ollama' && this.ollamaClient) {
            return this.ollamaClient.getAvailableModels();
        }
        return [];
    }

    /**
     * Get current backend
     */
    getCurrentBackend() {
        return this.backend;
    }

    /**
     * Switch backend
     */
    async switchBackend(newBackend, settings) {
        this.backend = newBackend;
        await this.initialize(settings);
    }

    /**
     * Generate session ID
     */
    generateSessionId() {
        const prefix = this.backend === 'ollama' ? 'ollama' : 'n8n';
        return `${prefix}_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate URL format
     */
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedApiClient;
} else {
    window.UnifiedApiClient = UnifiedApiClient;
}