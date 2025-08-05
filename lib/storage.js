/**
 * Chrome Extension Storage Manager
 * Handles local storage operations for chat data and settings
 */
class StorageManager {
    constructor() {
        this.storageArea = chrome.storage.local;
        this.maxMessages = 1000; // Maximum messages to keep
        this.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    }

    /**
     * Get stored settings
     * @returns {Promise<Object>} - Settings object
     */
    async getSettings() {
        try {
            const result = await this.storageArea.get(['settings']);
            return result.settings || this.getDefaultSettings();
        } catch (error) {
            console.error('Failed to get settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Save settings
     * @param {Object} settings - Settings to save
     * @returns {Promise<boolean>} - Success status
     */
    async saveSettings(settings) {
        try {
            const validatedSettings = this.validateSettings(settings);
            await this.storageArea.set({ settings: validatedSettings });
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    /**
     * Get default settings
     * @returns {Object} - Default settings
     */
    getDefaultSettings() {
        return {
            webhookUrl: '',
            timeout: 30,
            saveHistory: true,
            theme: 'light',
            notifications: true,
            autoScroll: true,
            version: '0.7.0'
        };
    }

    /**
     * Validate settings object
     * @param {Object} settings - Settings to validate
     * @returns {Object} - Validated settings
     */
    validateSettings(settings) {
        const defaults = this.getDefaultSettings();
        const validated = { ...defaults };

        // Validate webhook URL
        if (settings.webhookUrl && typeof settings.webhookUrl === 'string') {
            validated.webhookUrl = settings.webhookUrl.trim();
        }

        // Validate timeout
        if (settings.timeout && typeof settings.timeout === 'number') {
            validated.timeout = Math.max(5, Math.min(600, settings.timeout));
        }

        // Validate boolean settings
        ['saveHistory', 'notifications', 'autoScroll'].forEach(key => {
            if (typeof settings[key] === 'boolean') {
                validated[key] = settings[key];
            }
        });

        // Validate theme
        if (settings.theme && ['light', 'dark', 'auto'].includes(settings.theme)) {
            validated.theme = settings.theme;
        }

        return validated;
    }

    /**
     * Get chat history
     * @param {number} limit - Maximum messages to retrieve
     * @returns {Promise<Array>} - Array of messages
     */
    async getChatHistory(limit = 100) {
        try {
            const result = await this.storageArea.get(['chatHistory']);
            const history = result.chatHistory || [];
            
            // Clean old messages
            const cleanHistory = this.cleanOldMessages(history);
            
            // Return limited results
            return cleanHistory.slice(-limit);
        } catch (error) {
            console.error('Failed to get chat history:', error);
            return [];
        }
    }

    /**
     * Save message to chat history
     * @param {Object} message - Message to save
     * @returns {Promise<boolean>} - Success status
     */
    async saveMessage(message) {
        try {
            const settings = await this.getSettings();
            if (!settings.saveHistory) {
                return true; // Skip saving if disabled
            }

            const validatedMessage = this.validateMessage(message);
            const history = await this.getChatHistory(this.maxMessages - 1);
            
            history.push(validatedMessage);
            
            await this.storageArea.set({ chatHistory: history });
            return true;
        } catch (error) {
            console.error('Failed to save message:', error);
            return false;
        }
    }

    /**
     * Validate message object
     * @param {Object} message - Message to validate
     * @returns {Object} - Validated message
     */
    validateMessage(message) {
        return {
            id: message.id || this.generateMessageId(),
            type: message.type || 'user', // 'user' or 'bot'
            content: String(message.content || '').trim(),
            timestamp: message.timestamp || new Date().toISOString(),
            sessionId: message.sessionId || null,
            metadata: message.metadata || {}
        };
    }

    /**
     * Generate unique message ID
     * @returns {string} - Message ID
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean old messages from history
     * @param {Array} messages - Messages array
     * @returns {Array} - Cleaned messages
     */
    cleanOldMessages(messages) {
        const cutoffTime = Date.now() - this.maxAge;
        
        return messages.filter(message => {
            try {
                const messageTime = new Date(message.timestamp).getTime();
                return messageTime > cutoffTime;
            } catch {
                return false; // Remove invalid timestamps
            }
        });
    }

    /**
     * Clear chat history
     * @returns {Promise<boolean>} - Success status
     */
    async clearChatHistory() {
        try {
            await this.storageArea.set({ chatHistory: [] });
            return true;
        } catch (error) {
            console.error('Failed to clear chat history:', error);
            return false;
        }
    }

    /**
     * Get current session ID
     * @returns {Promise<string>} - Session ID
     */
    async getSessionId() {
        try {
            const result = await this.storageArea.get(['currentSession']);
            if (result.currentSession && this.isValidSession(result.currentSession)) {
                return result.currentSession.id;
            }
            
            // Create new session
            const newSession = this.createNewSession();
            await this.storageArea.set({ currentSession: newSession });
            return newSession.id;
        } catch (error) {
            console.error('Failed to get session ID:', error);
            return this.generateSessionId();
        }
    }

    /**
     * Create new chat session
     * @returns {Object} - New session object
     */
    createNewSession() {
        return {
            id: this.generateSessionId(),
            startTime: new Date().toISOString(),
            messageCount: 0
        };
    }

    /**
     * Check if session is valid (not expired)
     * @param {Object} session - Session to validate
     * @returns {boolean} - Is valid
     */
    isValidSession(session) {
        try {
            const sessionTime = new Date(session.startTime).getTime();
            const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
            return (Date.now() - sessionTime) < maxSessionAge;
        } catch {
            return false;
        }
    }

    /**
     * Generate session ID
     * @returns {string} - Session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Update session message count
     * @returns {Promise<void>}
     */
    async incrementMessageCount() {
        try {
            const result = await this.storageArea.get(['currentSession']);
            if (result.currentSession) {
                result.currentSession.messageCount = (result.currentSession.messageCount || 0) + 1;
                await this.storageArea.set({ currentSession: result.currentSession });
            }
        } catch (error) {
            console.error('Failed to update message count:', error);
        }
    }

    /**
     * Get storage usage statistics
     * @returns {Promise<Object>} - Usage stats
     */
    async getStorageStats() {
        try {
            const result = await this.storageArea.get(null); // Get all data
            const totalSize = JSON.stringify(result).length;
            const messageCount = (result.chatHistory || []).length;
            
            return {
                totalSize,
                messageCount,
                estimatedSizeKB: Math.round(totalSize / 1024),
                maxMessages: this.maxMessages,
                usage: messageCount / this.maxMessages
            };
        } catch (error) {
            console.error('Failed to get storage stats:', error);
            return {
                totalSize: 0,
                messageCount: 0,
                estimatedSizeKB: 0,
                maxMessages: this.maxMessages,
                usage: 0
            };
        }
    }

    /**
     * Export chat history
     * @param {string} format - Export format ('json' or 'text')
     * @returns {Promise<string>} - Exported data
     */
    async exportChatHistory(format = 'json') {
        try {
            const history = await this.getChatHistory();
            
            if (format === 'text') {
                return history.map(msg => {
                    const time = new Date(msg.timestamp).toLocaleString();
                    const sender = msg.type === 'user' ? 'You' : 'AI';
                    return `[${time}] ${sender}: ${msg.content}`;
                }).join('\n');
            }
            
            return JSON.stringify(history, null, 2);
        } catch (error) {
            console.error('Failed to export chat history:', error);
            return '';
        }
    }

    /**
     * Clean up old data and optimize storage
     * @returns {Promise<Object>} - Cleanup results
     */
    async cleanup() {
        try {
            const history = await this.getChatHistory();
            const cleanHistory = this.cleanOldMessages(history);
            const removedCount = history.length - cleanHistory.length;
            
            if (removedCount > 0) {
                await this.storageArea.set({ chatHistory: cleanHistory });
            }
            
            return {
                success: true,
                removedMessages: removedCount,
                remainingMessages: cleanHistory.length
            };
        } catch (error) {
            console.error('Failed to cleanup storage:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else {
    window.StorageManager = StorageManager;
}