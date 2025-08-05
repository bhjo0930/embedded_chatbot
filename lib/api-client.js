/**
 * n8n Webhook API Client
 * Handles communication with n8n webhook endpoint
 */
class N8nApiClient {
    constructor() {
        this.baseURL = null;
        this.timeout = 30000; // 30 seconds default
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Initialize the API client with settings
     * @param {Object} settings - Configuration settings
     */
    async initialize(settings) {
        this.baseURL = settings.webhookUrl;
        this.timeout = (settings.timeout || 30) * 1000;
        
        // Validate webhook URL
        if (!this.isValidWebhookUrl(this.baseURL)) {
            throw new Error('Invalid webhook URL provided');
        }
    }

    /**
     * Validate webhook URL format
     * @param {string} url - URL to validate
     * @returns {boolean} - Is valid URL
     */
    isValidWebhookUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
        } catch {
            return false;
        }
    }

    /**
     * Send message to n8n webhook
     * @param {string} message - User message
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} - API response
     */
    async sendMessage(message, context = {}) {
        if (!this.baseURL) {
            throw new Error('API client not initialized. Please configure webhook URL.');
        }

        const payload = {
            data: {
                text: message.trim(),
                category: context.category || 'GENERAL'
            },
            timestamp: new Date().toISOString(),
            sessionId: context.sessionId || this.generateSessionId(),
            userId: context.userId || 'chrome-extension-user',
            metadata: {
                source: 'chrome-extension',
                version: '0.7.0',
                userAgent: navigator.userAgent,
                agentType: context.category || 'GENERAL',
                ...context.metadata
            }
        };

        return this.makeRequest(payload);
    }

    /**
     * Make HTTP request with retry logic
     * @param {Object} payload - Request payload
     * @returns {Promise<Object>} - Response data
     */
    async makeRequest(payload, retryCount = 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Handle different response statuses
            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response);
                throw new ApiError(
                    `HTTP ${response.status}: ${errorData.message || response.statusText}`,
                    response.status,
                    errorData
                );
            }

            const data = await response.json();
            return this.validateResponse(data);

        } catch (error) {
            clearTimeout(timeoutId);

            // Handle specific error types
            if (error.name === 'AbortError') {
                throw new ApiError('Request timeout', 408);
            }

            if (error instanceof ApiError) {
                throw error;
            }

            // Retry logic for network errors
            if (retryCount < this.maxRetries && this.isRetryableError(error)) {
                await this.delay(this.retryDelay * Math.pow(2, retryCount));
                return this.makeRequest(payload, retryCount + 1);
            }

            throw new ApiError(
                `Network error: ${error.message}`,
                0,
                { originalError: error.message }
            );
        }
    }

    /**
     * Parse error response from API
     * @param {Response} response - Fetch response
     * @returns {Object} - Error data
     */
    async parseErrorResponse(response) {
        try {
            return await response.json();
        } catch {
            return { message: response.statusText || 'Unknown error' };
        }
    }

    /**
     * Validate API response structure
     * @param {Object} data - Response data
     * @returns {Object} - Validated response
     */
    validateResponse(data) {
        // Expected n8n webhook response structure
        const response = {
            message: '',
            success: true,
            timestamp: new Date().toISOString(),
            ...data
        };

        // Handle n8n array response format
        if (Array.isArray(data) && data.length > 0 && data[0].output) {
            response.message = data[0].output;
        } else {
            // Ensure required fields exist
            if (!response.message && !response.response && !response.text && !response.output) {
                throw new ApiError('Invalid response: missing message content', 422);
            }
            // Normalize response message
            response.message = response.message || response.response || response.text || response.output || '';
        }

        return response;
    }

    /**
     * Check if error is retryable
     * @param {Error} error - Error to check
     * @returns {boolean} - Is retryable
     */
    isRetryableError(error) {
        // Retry on network errors, timeout, or 5xx server errors
        return (
            error.code === 0 || // Network error
            error.code >= 500 || // Server error
            error.message.includes('timeout') ||
            error.message.includes('network')
        );
    }

    /**
     * Generate unique session ID
     * @returns {string} - Session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Delay utility for retry logic
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} - Delay promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test webhook connection
     * @returns {Promise<boolean>} - Connection status
     */
    async testConnection() {
        try {
            const response = await this.sendMessage('Test connection', {
                metadata: { isTest: true }
            });
            return response.success !== false;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    /**
     * Get connection status
     * @returns {Promise<Object>} - Connection status info
     */
    async getConnectionStatus() {
        if (!this.baseURL) {
            return {
                connected: false,
                error: 'No webhook URL configured'
            };
        }

        try {
            const isConnected = await this.testConnection();
            return {
                connected: isConnected,
                url: this.baseURL,
                timeout: this.timeout / 1000
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                url: this.baseURL
            };
        }
    }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
    constructor(message, code = 0, details = {}) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.details = details;
    }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { N8nApiClient, ApiError };
} else {
    window.N8nApiClient = N8nApiClient;
    window.ApiError = ApiError;
}