/**
 * Ollama API Client
 * Handles communication with Ollama local instance
 */
class OllamaClient {
    constructor() {
        this.baseURL = 'http://localhost:11434';
        this.timeout = 30000; // 30 seconds default
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.availableModels = [];
    }

    /**
     * Initialize the Ollama client with settings
     * @param {Object} settings - Configuration settings
     */
    async initialize(settings) {
        this.baseURL = settings.ollamaUrl || 'http://localhost:11434';
        this.timeout = (settings.timeout || 30) * 1000;

        // Validate Ollama URL
        if (!this.isValidOllamaUrl(this.baseURL)) {
            throw new Error('Invalid Ollama URL provided');
        }

        // Load available models
        await this.loadAvailableModels();
    }

    /**
     * Validate Ollama URL format
     * @param {string} url - URL to validate
     * @returns {boolean} - Is valid URL
     */
    isValidOllamaUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Load available models from Ollama
     */
    async loadAvailableModels() {
        try {
            const response = await fetch(`${this.baseURL}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.availableModels = data.models || [];
                console.log('Available Ollama models:', this.availableModels.map(m => m.name));
            }
        } catch (error) {
            console.warn('Failed to load Ollama models:', error);
            this.availableModels = [];
        }
    }

    /**
     * Get available models
     * @returns {Array} - List of available models
     */
    getAvailableModels() {
        return this.availableModels;
    }

    /**
     * Send message to Ollama
     * @param {string} message - User message
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} - API response
     */
    async sendMessage(message, context = {}) {
        if (!this.baseURL) {
            throw new Error('Ollama client not initialized. Please configure Ollama URL.');
        }

        const model = context.model || this.getDefaultModel();
        if (!model) {
            throw new Error('No Ollama model available. Please install a model first.');
        }

        const systemPrompt = this.getSystemPrompt(context.category || 'GENERAL');

        const payload = {
            model: model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: message.trim()
                }
            ],
            stream: false,
            options: {
                temperature: context.temperature || 0.7,
                top_p: context.top_p || 0.9,
                top_k: context.top_k || 40
            }
        };

        return this.makeRequest('/api/chat', payload);
    }

    /**
     * Get default model (prefer llama2, llama3, or first available)
     */
    getDefaultModel() {
        if (this.availableModels.length === 0) {
            return null;
        }

        // Prefer specific models
        const preferredModels = ['llama3', 'llama2', 'mistral', 'codellama'];

        for (const preferred of preferredModels) {
            const found = this.availableModels.find(model =>
                model.name.toLowerCase().includes(preferred)
            );
            if (found) {
                return found.name;
            }
        }

        // Return first available model
        return this.availableModels[0].name;
    }

    /**
     * Get system prompt based on category
     * @param {string} category - AI agent category
     * @returns {string} - System prompt
     */
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
     * Make HTTP request with retry logic
     * @param {string} endpoint - API endpoint
     * @param {Object} payload - Request payload
     * @returns {Promise<Object>} - Response data
     */
    async makeRequest(endpoint, payload, retryCount = 0) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await this.parseErrorResponse(response);
                throw new OllamaError(
                    `HTTP ${response.status}: ${errorData.error || response.statusText}`,
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
                throw new OllamaError('Request timeout', 408);
            }

            if (error instanceof OllamaError) {
                throw error;
            }

            // Retry logic for network errors
            if (retryCount < this.maxRetries && this.isRetryableError(error)) {
                await this.delay(this.retryDelay * Math.pow(2, retryCount));
                return this.makeRequest(endpoint, payload, retryCount + 1);
            }

            throw new OllamaError(
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
            return { error: response.statusText || 'Unknown error' };
        }
    }

    /**
     * Validate API response structure
     * @param {Object} data - Response data
     * @returns {Object} - Validated response
     */
    validateResponse(data) {
        if (!data.message || !data.message.content) {
            throw new OllamaError('Invalid response: missing message content', 422);
        }

        // Parse and clean the response to remove thinking parts
        const cleanedMessage = this.parseOllamaResponse(data.message.content);

        return {
            message: cleanedMessage,
            success: true,
            timestamp: new Date().toISOString(),
            model: data.model,
            metadata: {
                total_duration: data.total_duration,
                load_duration: data.load_duration,
                prompt_eval_count: data.prompt_eval_count,
                eval_count: data.eval_count,
                eval_duration: data.eval_duration
            }
        };
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
            error.message.includes('network') ||
            error.message.includes('ECONNREFUSED')
        );
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

    /**
     * Generate unique session ID
     * @returns {string} - Session ID
     */
    generateSessionId() {
        return `ollama_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
     * Test Ollama connection
     * @returns {Promise<boolean>} - Connection status
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                await this.loadAvailableModels();
                return this.availableModels.length > 0;
            }
            return false;
        } catch (error) {
            console.error('Ollama connection test failed:', error);
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
                error: 'No Ollama URL configured'
            };
        }

        try {
            const isConnected = await this.testConnection();
            return {
                connected: isConnected,
                url: this.baseURL,
                timeout: this.timeout / 1000,
                models: this.availableModels.length,
                defaultModel: this.getDefaultModel()
            };
        } catch (error) {
            return {
                connected: false,
                error: error.message,
                url: this.baseURL
            };
        }
    }

    /**
     * Pull/download a model
     * @param {string} modelName - Name of model to pull
     * @returns {Promise<boolean>} - Success status
     */
    async pullModel(modelName) {
        try {
            const response = await fetch(`${this.baseURL}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: modelName,
                    stream: false
                })
            });

            if (response.ok) {
                await this.loadAvailableModels();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to pull model:', error);
            return false;
        }
    }
}

/**
 * Custom Ollama Error class
 */
class OllamaError extends Error {
    constructor(message, code = 0, details = {}) {
        super(message);
        this.name = 'OllamaError';
        this.code = code;
        this.details = details;
    }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OllamaClient, OllamaError };
} else {
    window.OllamaClient = OllamaClient;
    window.OllamaError = OllamaError;
}