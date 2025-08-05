/**
 * Chrome Extension Options/Settings Page JavaScript
 * Handles advanced settings configuration and management
 */

class OptionsPage {
    constructor() {
        this.settings = {};
        this.isDirty = false;
        this.connectionStatus = {
            connected: false,
            lastTest: null,
            error: null
        };
        
        this.init();
    }

    /**
     * Initialize the options page
     */
    async init() {
        this.bindElements();
        this.bindEvents();
        await this.loadSettings();
        await this.loadDataStats();
        await this.checkConnection();
        
        // Mark page as clean after initial load
        this.isDirty = false;
        this.updateSaveButton();
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        // Backend selection
        this.backendSelect = document.getElementById('backend-select');
        
        // Form elements
        this.webhookUrlInput = document.getElementById('webhook-url');
        this.ollamaUrlInput = document.getElementById('ollama-url');
        this.ollamaModelSelect = document.getElementById('ollama-model');
        this.temperatureInput = document.getElementById('temperature');
        this.timeoutInput = document.getElementById('api-timeout');
        this.maxRetriesInput = document.getElementById('max-retries');
        this.saveHistoryCheckbox = document.getElementById('save-history');
        this.autoScrollCheckbox = document.getElementById('auto-scroll');
        this.notificationsCheckbox = document.getElementById('notifications');
        this.showToggleButtonCheckbox = document.getElementById('show-toggle-button');
        this.themeSelect = document.getElementById('theme');
        this.sessionDurationInput = document.getElementById('session-duration');
        this.debugModeCheckbox = document.getElementById('debug-mode');
        this.customHeadersTextarea = document.getElementById('custom-headers');
        
        // Backend-specific sections
        this.n8nSettings = document.getElementById('n8n-settings');
        this.ollamaSettings = document.getElementById('ollama-settings');
        
        // Ollama-specific elements
        this.modelsCount = document.getElementById('models-count');
        this.refreshModelsBtn = document.getElementById('refresh-models');

        // Status elements
        this.connectionDot = document.getElementById('connection-dot');
        this.connectionText = document.getElementById('connection-text');
        this.connectionResult = document.getElementById('connection-result');

        // Data stats elements
        this.messageCount = document.getElementById('message-count');
        this.storageSize = document.getElementById('storage-size');
        this.lastCleanup = document.getElementById('last-cleanup');

        // Buttons
        this.testConnectionBtn = document.getElementById('test-connection');
        this.exportDataBtn = document.getElementById('export-data');
        this.clearDataBtn = document.getElementById('clear-data');
        this.cleanupDataBtn = document.getElementById('cleanup-data');
        this.resetSettingsBtn = document.getElementById('reset-settings');
        this.cancelBtn = document.getElementById('cancel-settings');
        this.saveBtn = document.getElementById('save-settings');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Backend selection
        this.backendSelect.addEventListener('change', this.handleBackendChange.bind(this));
        
        // Form change events
        [
            this.webhookUrlInput,
            this.ollamaUrlInput,
            this.temperatureInput,
            this.timeoutInput,
            this.maxRetriesInput,
            this.sessionDurationInput,
            this.customHeadersTextarea
        ].forEach(element => {
            if (element) {
                element.addEventListener('input', this.handleFormChange.bind(this));
                element.addEventListener('blur', this.validateField.bind(this));
            }
        });

        [
            this.saveHistoryCheckbox,
            this.autoScrollCheckbox,
            this.notificationsCheckbox,
            this.showToggleButtonCheckbox,
            this.debugModeCheckbox
        ].forEach(element => {
            if (element) {
                element.addEventListener('change', this.handleFormChange.bind(this));
            }
        });

        if (this.ollamaModelSelect) {
            this.ollamaModelSelect.addEventListener('change', this.handleFormChange.bind(this));
        }

        this.themeSelect.addEventListener('change', this.handleThemeChange.bind(this));

        // Button events
        this.testConnectionBtn.addEventListener('click', this.testConnection.bind(this));
        this.exportDataBtn.addEventListener('click', this.exportData.bind(this));
        this.clearDataBtn.addEventListener('click', this.clearData.bind(this));
        this.cleanupDataBtn.addEventListener('click', this.cleanupData.bind(this));
        this.resetSettingsBtn.addEventListener('click', this.resetSettings.bind(this));
        this.cancelBtn.addEventListener('click', this.cancelChanges.bind(this));
        this.saveBtn.addEventListener('click', this.saveSettings.bind(this));
        
        // Ollama-specific events
        if (this.refreshModelsBtn) {
            this.refreshModelsBtn.addEventListener('click', this.refreshOllamaModels.bind(this));
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));

        // Before unload warning
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

        // Auto-test connection when URLs change
        if (this.webhookUrlInput) {
            this.webhookUrlInput.addEventListener('input', this.debounce(this.autoTestConnection.bind(this), 2000));
        }
        if (this.ollamaUrlInput) {
            this.ollamaUrlInput.addEventListener('input', this.debounce(this.autoTestConnection.bind(this), 2000));
        }
    }

    /**
     * Handle form changes
     */
    handleFormChange() {
        this.isDirty = true;
        this.updateSaveButton();
        this.validateForm();
    }

    /**
     * Handle backend selection change
     */
    async handleBackendChange() {
        const backend = this.backendSelect.value;
        this.toggleBackendSettings(backend);
        
        // Load models if switching to Ollama
        if (backend === 'ollama') {
            await this.loadOllamaModels();
        }
        
        this.handleFormChange();
    }

    /**
     * Toggle backend-specific settings visibility
     */
    toggleBackendSettings(backend) {
        if (backend === 'ollama') {
            this.n8nSettings.style.display = 'none';
            this.ollamaSettings.style.display = 'block';
        } else {
            this.n8nSettings.style.display = 'block';
            this.ollamaSettings.style.display = 'none';
        }
        
        // Update header description
        const headerDescription = document.querySelector('.settings-header p');
        if (headerDescription) {
            if (backend === 'ollama') {
                headerDescription.textContent = 'Configure your local Ollama instance';
            } else {
                headerDescription.textContent = 'Configure your n8n webhook integration';
            }
        }
    }

    /**
     * Handle theme changes immediately
     */
    async handleThemeChange() {
        const theme = this.themeSelect.value;
        await this.applyTheme(theme);
        this.handleFormChange();
    }

    /**
     * Apply theme
     */
    async applyTheme(theme) {
        // Apply theme to current page
        document.documentElement.setAttribute('data-theme', theme);
        
        // Store theme preference
        try {
            const settings = await this.getStoredSettings();
            settings.theme = theme;
            await chrome.storage.local.set({ settings });
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    }

    /**
     * Validate individual field
     */
    validateField(event) {
        const field = event.target;
        const value = field.value.trim();
        
        switch (field.id) {
            case 'webhook-url':
                this.validateWebhookUrl(field, value);
                break;
            case 'ollama-url':
                this.validateOllamaUrl(field, value);
                break;
            case 'temperature':
                this.validateTemperature(field, value);
                break;
            case 'api-timeout':
                this.validateTimeout(field, value);
                break;
            case 'max-retries':
                this.validateRetries(field, value);
                break;
            case 'session-duration':
                this.validateSessionDuration(field, value);
                break;
            case 'custom-headers':
                this.validateCustomHeaders(field, value);
                break;
        }
    }

    /**
     * Validate webhook URL
     */
    validateWebhookUrl(field, value) {
        const isValid = !value || this.isValidUrl(value);
        this.setFieldValidation(field, isValid, 'Please enter a valid HTTPS URL');
        return isValid;
    }

    /**
     * Validate Ollama URL
     */
    validateOllamaUrl(field, value) {
        const isValid = !value || this.isValidUrl(value);
        this.setFieldValidation(field, isValid, 'Please enter a valid HTTP/HTTPS URL');
        return isValid;
    }

    /**
     * Validate temperature
     */
    validateTemperature(field, value) {
        const num = parseFloat(value);
        const isValid = num >= 0.1 && num <= 2.0;
        this.setFieldValidation(field, isValid, 'Temperature must be between 0.1 and 2.0');
        return isValid;
    }

    /**
     * Validate timeout
     */
    validateTimeout(field, value) {
        const num = parseInt(value);
        const isValid = num >= 5 && num <= 600;
        this.setFieldValidation(field, isValid, 'Timeout must be between 5 and 600 seconds');
        return isValid;
    }

    /**
     * Validate retries
     */
    validateRetries(field, value) {
        const num = parseInt(value);
        const isValid = num >= 0 && num <= 5;
        this.setFieldValidation(field, isValid, 'Retries must be between 0 and 5');
        return isValid;
    }

    /**
     * Validate session duration
     */
    validateSessionDuration(field, value) {
        const num = parseInt(value);
        const isValid = num >= 1 && num <= 168;
        this.setFieldValidation(field, isValid, 'Session duration must be between 1 and 168 hours');
        return isValid;
    }

    /**
     * Validate custom headers JSON
     */
    validateCustomHeaders(field, value) {
        if (!value) return true;
        
        try {
            JSON.parse(value);
            this.setFieldValidation(field, true);
            return true;
        } catch (error) {
            this.setFieldValidation(field, false, 'Invalid JSON format');
            return false;
        }
    }

    /**
     * Set field validation state
     */
    setFieldValidation(field, isValid, errorMessage = '') {
        const container = field.closest('.form-group');
        const existingError = container.querySelector('.field-error');
        
        if (existingError) {
            existingError.remove();
        }
        
        if (isValid) {
            field.classList.remove('error');
        } else {
            field.classList.add('error');
            if (errorMessage) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                errorDiv.textContent = errorMessage;
                container.appendChild(errorDiv);
            }
        }
    }

    /**
     * Validate entire form
     */
    validateForm() {
        const backend = this.backendSelect.value;
        let isValid = true;
        
        // Validate based on selected backend
        if (backend === 'n8n') {
            isValid = this.validateWebhookUrl(this.webhookUrlInput, this.webhookUrlInput.value.trim()) && isValid;
            isValid = this.validateCustomHeaders(this.customHeadersTextarea, this.customHeadersTextarea.value.trim()) && isValid;
        } else if (backend === 'ollama') {
            isValid = this.validateOllamaUrl(this.ollamaUrlInput, this.ollamaUrlInput.value.trim()) && isValid;
            isValid = this.validateTemperature(this.temperatureInput, this.temperatureInput.value) && isValid;
        }
        
        // Common validations
        isValid = this.validateTimeout(this.timeoutInput, this.timeoutInput.value) && isValid;
        isValid = this.validateRetries(this.maxRetriesInput, this.maxRetriesInput.value) && isValid;
        isValid = this.validateSessionDuration(this.sessionDurationInput, this.sessionDurationInput.value) && isValid;
        
        return isValid;
    }

    /**
     * Update save button state
     */
    updateSaveButton() {
        this.saveBtn.disabled = !this.isDirty;
        this.saveBtn.textContent = this.isDirty ? '💾 Save Settings' : '✅ Saved';
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            this.settings = await this.getStoredSettings();
            this.populateForm(this.settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showToast('Failed to load settings', 'error');
        }
    }

    /**
     * Get stored settings
     */
    async getStoredSettings() {
        const result = await chrome.storage.local.get(['settings']);
        return result.settings || this.getDefaultSettings();
    }

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            backend: 'n8n',
            webhookUrl: '',
            ollamaUrl: 'http://localhost:11434',
            ollamaModel: '',
            temperature: 0.7,
            timeout: 30,
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
    }

    /**
     * Populate form with settings
     */
    populateForm(settings) {
        // Backend selection
        this.backendSelect.value = settings.backend || 'n8n';
        this.toggleBackendSettings(settings.backend || 'n8n');
        
        // n8n settings
        this.webhookUrlInput.value = settings.webhookUrl || '';
        this.customHeadersTextarea.value = settings.customHeaders || '';
        
        // Ollama settings
        if (this.ollamaUrlInput) {
            this.ollamaUrlInput.value = settings.ollamaUrl || 'http://localhost:11434';
        }
        if (this.temperatureInput) {
            this.temperatureInput.value = settings.temperature || 0.7;
        }
        
        // Common settings
        this.timeoutInput.value = settings.timeout || 30;
        this.maxRetriesInput.value = settings.maxRetries || 3;
        this.saveHistoryCheckbox.checked = settings.saveHistory !== false;
        this.autoScrollCheckbox.checked = settings.autoScroll !== false;
        this.notificationsCheckbox.checked = settings.notifications !== false;
        this.showToggleButtonCheckbox.checked = settings.showToggleButton !== false;
        this.themeSelect.value = settings.theme || 'light';
        this.sessionDurationInput.value = settings.sessionDuration || 24;
        this.debugModeCheckbox.checked = settings.debugMode === true;
        
        // Load Ollama models if backend is Ollama
        if (settings.backend === 'ollama') {
            this.loadOllamaModels().then(() => {
                if (this.ollamaModelSelect && settings.ollamaModel) {
                    this.ollamaModelSelect.value = settings.ollamaModel;
                }
            });
        }
        
        // Apply theme
        this.applyTheme(settings.theme || 'light');
    }

    /**
     * Save settings
     */
    async saveSettings() {
        if (!this.validateForm()) {
            this.showToast('Please fix validation errors before saving', 'error');
            return;
        }

        try {
            const newSettings = this.gatherFormData();
            await chrome.storage.local.set({ settings: newSettings });
            
            this.settings = newSettings;
            this.isDirty = false;
            this.updateSaveButton();
            
            this.showToast('Settings saved successfully!', 'success');
            
            // Test connection if webhook URL changed
            if (newSettings.webhookUrl && newSettings.webhookUrl !== this.settings.webhookUrl) {
                setTimeout(() => this.testConnection(), 1000);
            }
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    /**
     * Gather form data
     */
    gatherFormData() {
        const customHeaders = this.customHeadersTextarea.value.trim();
        let parsedHeaders = '';
        
        if (customHeaders) {
            try {
                // Validate and format JSON
                parsedHeaders = JSON.stringify(JSON.parse(customHeaders));
            } catch (error) {
                parsedHeaders = '';
            }
        }

        return {
            backend: this.backendSelect.value,
            webhookUrl: this.webhookUrlInput.value.trim(),
            ollamaUrl: this.ollamaUrlInput ? this.ollamaUrlInput.value.trim() : 'http://localhost:11434',
            ollamaModel: this.ollamaModelSelect ? this.ollamaModelSelect.value : '',
            temperature: this.temperatureInput ? parseFloat(this.temperatureInput.value) || 0.7 : 0.7,
            timeout: Math.max(5, Math.min(600, parseInt(this.timeoutInput.value) || 30)),
            maxRetries: Math.max(0, Math.min(5, parseInt(this.maxRetriesInput.value) || 3)),
            saveHistory: this.saveHistoryCheckbox.checked,
            autoScroll: this.autoScrollCheckbox.checked,
            notifications: this.notificationsCheckbox.checked,
            showToggleButton: this.showToggleButtonCheckbox.checked,
            theme: this.themeSelect.value,
            sessionDuration: Math.max(1, Math.min(168, parseInt(this.sessionDurationInput.value) || 24)),
            debugMode: this.debugModeCheckbox.checked,
            customHeaders: parsedHeaders,
            version: '0.7.0'
        };
    }

    /**
     * Test connection for current backend
     */
    async testConnection() {
        const backend = this.backendSelect.value;
        
        // Validate based on backend
        if (backend === 'n8n') {
            const webhookUrl = this.webhookUrlInput.value.trim();
            if (!webhookUrl) {
                this.updateConnectionStatus(false, 'No n8n webhook URL provided');
                return;
            }
            if (!this.isValidUrl(webhookUrl)) {
                this.updateConnectionStatus(false, 'Invalid n8n webhook URL');
                return;
            }
        } else if (backend === 'ollama') {
            const ollamaUrl = this.ollamaUrlInput.value.trim();
            if (!ollamaUrl) {
                this.updateConnectionStatus(false, 'No Ollama URL provided');
                return;
            }
            if (!this.isValidUrl(ollamaUrl)) {
                this.updateConnectionStatus(false, 'Invalid Ollama URL');
                return;
            }
        }

        this.testConnectionBtn.disabled = true;
        this.testConnectionBtn.innerHTML = '<span class="btn-icon">⏳</span>Testing...';
        
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'testConnection' }, resolve);
            });
            
            if (response.success) {
                const result = response.data;
                this.updateConnectionStatus(result.connected, result.error);
                this.connectionStatus = {
                    connected: result.connected,
                    lastTest: new Date(),
                    error: result.error
                };
                
                // Update models count for Ollama
                if (backend === 'ollama' && result.connected && result.models !== undefined) {
                    this.updateModelsCount(result.models);
                    if (result.models > 0) {
                        await this.loadOllamaModels();
                    }
                }
            } else {
                this.updateConnectionStatus(false, response.error);
            }
            
        } catch (error) {
            console.error('Connection test failed:', error);
            this.updateConnectionStatus(false, error.message);
        } finally {
            this.testConnectionBtn.disabled = false;
            this.testConnectionBtn.innerHTML = '<span class="btn-icon">🔍</span>Test Connection';
        }
    }

    /**
     * Auto test connection (debounced)
     */
    async autoTestConnection() {
        const backend = this.backendSelect.value;
        let shouldTest = false;
        
        if (backend === 'n8n' && this.webhookUrlInput.value.trim() && this.isValidUrl(this.webhookUrlInput.value.trim())) {
            shouldTest = true;
        } else if (backend === 'ollama' && this.ollamaUrlInput.value.trim() && this.isValidUrl(this.ollamaUrlInput.value.trim())) {
            shouldTest = true;
        }
        
        if (shouldTest) {
            await this.testConnection();
        }
    }

    /**
     * Update connection status display
     */
    updateConnectionStatus(connected, error = null) {
        this.connectionDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
        this.connectionText.textContent = connected ? 'Connected' : 'Disconnected';
        
        // Clear previous result
        this.connectionResult.textContent = '';

        if (connected) {
            const successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.textContent = '✅ Connection successful';
            this.connectionResult.appendChild(successDiv);
        } else if (error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = `❌ ${error}`;
            this.connectionResult.appendChild(errorDiv);
        }
    }

    /**
     * Load available Ollama models
     */
    async loadOllamaModels() {
        if (!this.ollamaModelSelect) return;
        
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'getAvailableModels' }, resolve);
            });
            
            if (response.success) {
                const models = response.data;
                this.populateModelSelect(models);
                this.updateModelsCount(models.length);
            } else {
                console.error('Failed to load Ollama models:', response.error);
                this.updateModelsCount(0);
            }
        } catch (error) {
            console.error('Failed to load Ollama models:', error);
            this.updateModelsCount(0);
        }
    }

    /**
     * Populate model select dropdown
     */
    populateModelSelect(models) {
        if (!this.ollamaModelSelect) return;
        
        // Clear existing options
        this.ollamaModelSelect.innerHTML = '<option value="">Auto-select best available model</option>';
        
        // Add model options
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = `${model.name} (${this.formatBytes(model.size || 0)})`;
            this.ollamaModelSelect.appendChild(option);
        });
    }

    /**
     * Update models count display
     */
    updateModelsCount(count) {
        if (this.modelsCount) {
            if (count === 0) {
                this.modelsCount.textContent = 'No models loaded';
                this.modelsCount.style.color = '#ef4444';
            } else {
                this.modelsCount.textContent = `${count} model${count > 1 ? 's' : ''} available`;
                this.modelsCount.style.color = '#10b981';
            }
        }
    }

    /**
     * Refresh Ollama models
     */
    async refreshOllamaModels() {
        if (this.refreshModelsBtn) {
            this.refreshModelsBtn.disabled = true;
            this.refreshModelsBtn.textContent = 'Refreshing...';
        }
        
        try {
            await this.loadOllamaModels();
            this.showToast('Models refreshed successfully', 'success');
        } catch (error) {
            console.error('Failed to refresh models:', error);
            this.showToast('Failed to refresh models', 'error');
        } finally {
            if (this.refreshModelsBtn) {
                this.refreshModelsBtn.disabled = false;
                this.refreshModelsBtn.textContent = 'Refresh';
            }
        }
    }

    /**
     * Check initial connection
     */
    async checkConnection() {
        const backend = this.settings.backend || 'n8n';
        
        if (backend === 'n8n' && this.settings.webhookUrl) {
            await this.testConnection();
        } else if (backend === 'ollama' && this.settings.ollamaUrl) {
            await this.testConnection();
        } else {
            const message = backend === 'ollama' ? 'No Ollama URL configured' : 'No webhook URL configured';
            this.updateConnectionStatus(false, message);
        }
    }

    /**
     * Load data statistics
     */
    async loadDataStats() {
        try {
            const result = await chrome.storage.local.get(['chatHistory', 'lastCleanup']);
            const history = result.chatHistory || [];
            const lastCleanup = result.lastCleanup;
            
            this.messageCount.textContent = history.length.toLocaleString();
            
            const storageSize = JSON.stringify(result).length;
            this.storageSize.textContent = this.formatBytes(storageSize);
            
            if (lastCleanup) {
                this.lastCleanup.textContent = new Date(lastCleanup).toLocaleDateString();
            } else {
                this.lastCleanup.textContent = 'Never';
            }
            
        } catch (error) {
            console.error('Failed to load data stats:', error);
        }
    }

    /**
     * Export chat data
     */
    async exportData() {
        try {
            const result = await chrome.storage.local.get(['chatHistory']);
            const history = result.chatHistory || [];
            
            if (history.length === 0) {
                this.showToast('No chat history to export', 'info');
                return;
            }
            
            const exportData = {
                exportDate: new Date().toISOString(),
                messageCount: history.length,
                messages: history
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chatbot-history-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showToast('Chat history exported successfully', 'success');
            
        } catch (error) {
            console.error('Failed to export data:', error);
            this.showToast('Failed to export data', 'error');
        }
    }

    /**
     * Clear all data
     */
    async clearData() {
        const confirmed = confirm('Are you sure you want to clear all chat history and data? This action cannot be undone.');
        if (!confirmed) return;
        
        try {
            await chrome.storage.local.clear();
            
            // Restore settings
            await chrome.storage.local.set({ settings: this.getDefaultSettings() });
            
            await this.loadDataStats();
            this.showToast('All data cleared successfully', 'success');
            
        } catch (error) {
            console.error('Failed to clear data:', error);
            this.showToast('Failed to clear data', 'error');
        }
    }

    /**
     * Cleanup old data
     */
    async cleanupData() {
        try {
            const result = await chrome.storage.local.get(['chatHistory']);
            const history = result.chatHistory || [];
            
            // Remove messages older than 30 days
            const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const cleanHistory = history.filter(msg => {
                try {
                    return new Date(msg.timestamp).getTime() > cutoffTime;
                } catch {
                    return false;
                }
            });
            
            const removedCount = history.length - cleanHistory.length;
            
            if (removedCount > 0) {
                await chrome.storage.local.set({ 
                    chatHistory: cleanHistory,
                    lastCleanup: new Date().toISOString()
                });
                
                await this.loadDataStats();
                this.showToast(`Cleaned up ${removedCount} old messages`, 'success');
            } else {
                this.showToast('No old messages to clean up', 'info');
            }
            
        } catch (error) {
            console.error('Failed to cleanup data:', error);
            this.showToast('Failed to cleanup data', 'error');
        }
    }

    /**
     * Reset settings to default
     */
    async resetSettings() {
        const confirmed = confirm('Are you sure you want to reset all settings to default values?');
        if (!confirmed) return;
        
        try {
            const defaults = this.getDefaultSettings();
            await chrome.storage.local.set({ settings: defaults });
            
            this.settings = defaults;
            this.populateForm(defaults);
            this.isDirty = false;
            this.updateSaveButton();
            
            this.showToast('Settings reset to defaults', 'success');
            
        } catch (error) {
            console.error('Failed to reset settings:', error);
            this.showToast('Failed to reset settings', 'error');
        }
    }

    /**
     * Cancel changes
     */
    async cancelChanges() {
        if (this.isDirty) {
            const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?');
            if (!confirmed) return;
        }
        
        // Reload original settings
        await this.loadSettings();
        this.isDirty = false;
        this.updateSaveButton();
        
        this.showToast('Changes cancelled', 'info');
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    if (this.isDirty) {
                        this.saveSettings();
                    }
                    break;
                case 'z':
                    if (this.isDirty) {
                        event.preventDefault();
                        this.cancelChanges();
                    }
                    break;
            }
        }
    }

    /**
     * Handle before unload
     */
    handleBeforeUnload(event) {
        if (this.isDirty) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        }[type] || 'ℹ️';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'toast-icon';
        iconSpan.textContent = icon;

        const messageSpan = document.createElement('span');
        messageSpan.className = 'toast-message';
        messageSpan.textContent = message;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => toast.remove());

        toast.appendChild(iconSpan);
        toast.appendChild(messageSpan);
        toast.appendChild(closeBtn);

        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    /**
     * Utility functions
     */
    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    debounce(func, wait) {
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
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsPage();
});