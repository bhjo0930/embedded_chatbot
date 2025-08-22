/**
 * Chrome Extension Popup JavaScript
 * Handles UI interactions and message sending
 */

class ChatbotPopup {
    constructor() {
        this.messageInput = null;
        this.sendButton = null;
        this.messagesContainer = null;
        this.typingIndicator = null;
        this.connectionStatus = null;
        this.charCount = null;
        this.settingsModal = null;
        this.isTyping = false;
        this.currentSessionId = null;
        this.selectedCategory = 'GENERAL';
        this.categoryOptions = null;
        this.categoryToggle = null;
        this.botAvatar = null;
        this.botName = null;
        this.settings = {};
        
        this.init();
    }

    /**
     * Initialize the popup
     */
    async init() {
        this.bindElements();
        this.bindEvents();
        await this.loadSettings();
        await this.loadChatHistory();
        await this.checkConnection();
        await this.initializeCategories();
        this.messageInput.focus();
        
        
        // 주기적으로 연결 상태 확인 (5분마다)
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, 5 * 60 * 1000);
    }

    /**
     * Bind DOM elements
     */
    bindElements() {
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.messagesContainer = document.getElementById('chat-messages');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.connectionStatus = document.getElementById('connection-status');
        this.charCount = document.getElementById('char-count');
        this.settingsModal = document.getElementById('settings-modal');
        this.categoryOptions = document.getElementById('category-options');
        this.categoryToggle = document.getElementById('category-toggle');
        this.botAvatar = document.getElementById('bot-avatar');
        this.botName = document.getElementById('bot-name');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Message input events
        this.messageInput.addEventListener('input', this.handleInputChange.bind(this));
        this.messageInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Send button
        this.sendButton.addEventListener('click', this.handleSendMessage.bind(this));
        
        // Header buttons
        document.getElementById('settings-btn').addEventListener('click', this.showSettings.bind(this));
        document.getElementById('new-session').addEventListener('click', this.createNewSession.bind(this));
        document.getElementById('clear-chat').addEventListener('click', this.clearChat.bind(this));
        document.getElementById('summarize-page').addEventListener('click', this.handleSummarizePage.bind(this));
        
        // Settings modal
        document.getElementById('close-settings').addEventListener('click', this.hideSettings.bind(this));
        document.getElementById('cancel-settings').addEventListener('click', this.hideSettings.bind(this));
        document.getElementById('save-settings').addEventListener('click', this.saveSettings.bind(this));
        
        // Modal overlay click
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', this.autoResizeTextarea.bind(this));
        
        // Category selection events
        this.categoryToggle.addEventListener('click', this.toggleCategoryOptions.bind(this));
        
        // Category button events will be added dynamically in populateCategories()
    }

    /**
     * Handle input change
     */
    handleInputChange() {
        const message = this.messageInput.value.trim();
        const charCount = this.messageInput.value.length;
        const maxLength = this.settings.maxMessageLength || 4000;
        
        // Update character count
        this.charCount.textContent = `${charCount}/${maxLength}`;
        
        // Update send button state
        this.sendButton.disabled = !message || this.isTyping || charCount > maxLength;
        
        // Update character count color
        if (charCount > maxLength * 0.9) {
            this.charCount.style.color = '#ef4444';
        } else if (charCount > maxLength * 0.75) {
            this.charCount.style.color = '#f59e0b';
        } else {
            this.charCount.style.color = '#94a3b8';
        }
    }

    /**
     * Handle summarize page button click
     */
    async handleSummarizePage() {
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'getPageContent' }, resolve);
            });

            if (response.success) {
                this.openSummarizerView(response.data.html, response.data.title);
            } else {
                alert(`Error: ${response.error}`);
            }
        } catch (error) {
            console.error('Failed to get page content:', error);
            alert('Failed to get page content. Please try again.');
        }
    }

    /**
     * Open a new view with page content for summarization
     */
    openSummarizerView(htmlContent, pageTitle) {
        const newWindow = window.open('', '_blank');
        newWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Page Summary: ${pageTitle}</title>
                <style>
                    body { font-family: sans-serif; line-height: 1.6; padding: 20px; background-color: #f4f4f9; color: #333; }
                    #content-wrapper { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .collapsible { background-color: #eee; color: #444; cursor: pointer; padding: 12px; width: 100%; border: none; text-align: left; outline: none; font-size: 16px; margin-top: 5px; border-radius: 4px; }
                    .collapsible:hover { background-color: #ddd; }
                    .collapsible.active { background-color: #ccc; }
                    .content { padding: 0 18px; display: none; overflow: hidden; background-color: white; }
                    #question-box { margin-bottom: 20px; padding: 15px; background: #eef; border-radius: 8px; }
                    #question-input { width: calc(100% - 90px); padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
                    #ask-button { padding: 10px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
                    #ask-button:hover { background-color: #0056b3; }
                </style>
            </head>
            <body>
                <div id="content-wrapper">
                    <h2>Summary of: ${pageTitle}</h2>
                    <div id="question-box">
                        <input type="text" id="question-input" placeholder="Ask a question about the content...">
                        <button id="ask-button">Ask</button>
                    </div>
                    <div id="page-content"></div>
                </div>
                <script>
                    const html = `${htmlContent.replace(/`/g, '\`')}`;
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const body = doc.body;

                    // Sanitize the body content here if needed

                    const contentDiv = document.getElementById('page-content');
                    
                    // Simple collapsible logic
                    let sectionCount = 0;
                    body.querySelectorAll('div, section, article').forEach(el => {
                        if (el.innerText.trim().length > 100) { // Only make larger sections collapsible
                            sectionCount++;
                            const button = document.createElement('button');
                            button.className = 'collapsible';
                            button.textContent = 'Section ' + sectionCount + ' (click to expand)';
                            
                            const content = document.createElement('div');
                            content.className = 'content';
                            content.innerHTML = el.innerHTML;

                            contentDiv.appendChild(button);
                            contentDiv.appendChild(content);

                            button.addEventListener('click', function() {
                                this.classList.toggle('active');
                                const content = this.nextElementSibling;
                                if (content.style.display === "block") {
                                    content.style.display = "none";
                                } else {
                                    content.style.display = "block";
                                }
                            });
                        }
                    });

                    document.getElementById('ask-button').addEventListener('click', () => {
                        const question = document.getElementById('question-input').value;
                        if(question) {
                            // This is where you would send the question and the page content
                            // to your AI backend for an answer.
                            alert('Question: ' + question);
                        }
                    });
                </script>
            </body>
            </html>
        `);
        newWindow.document.close();
    }

    /**
     * Handle keydown events
     */
    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendMessage();
        }
        
        // 키보드 단축키 지원
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k':
                    e.preventDefault();
                    this.clearChat();
                    break;
                case ',':
                    e.preventDefault();
                    this.showSettings();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                    e.preventDefault();
                    this.selectCategoryByNumber(parseInt(e.key) - 1);
                    break;
            }
        }
        
        // ESC 키로 설정 모달 닫기
        if (e.key === 'Escape' && this.settingsModal.style.display === 'flex') {
            this.hideSettings();
        }
    }

    /**
     * Select category by number (0-7)
     */
    selectCategoryByNumber(index) {
        const categoryButtons = document.querySelectorAll('.category-btn');
        if (categoryButtons[index]) {
            categoryButtons[index].click();
        }
    }

    /**
     * Auto-resize textarea
     */
    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 100) + 'px';
    }

    /**
     * Handle sending message
     */
    async handleSendMessage(messageText = null) {
        const message = messageText || this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        try {
            // Store last message for retry functionality
            this.lastUserMessage = message;
            
            // Add user message to UI (only if not retrying)
            if (!messageText) {
                this.addMessage(message, 'user');
                
                // Clear input and update state
                this.messageInput.value = '';
                this.handleInputChange();
                this.autoResizeTextarea();
            }
            
            // Show typing indicator
            this.showTyping();
            
            // Send message to background script with selected category
            const response = await this.sendMessageToBackground(message, {
                category: this.selectedCategory
            });
            
            // Hide typing indicator
            this.hideTyping();
            
            // Add bot response to UI
            if (response.success) {
                this.addMessage(response.data.message, 'bot');
                this.currentSessionId = response.data.sessionId;
            } else {
                // 더 구체적인 에러 메시지 제공
                let errorMessage = response.error;
                if (errorMessage.includes('Empty response')) {
                    errorMessage = 'n8n 워크플로우에서 응답을 받지 못했습니다. 워크플로우 설정을 확인해주세요.';
                } else if (errorMessage.includes('timeout')) {
                    errorMessage = '응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
                } else if (errorMessage.includes('Network error')) {
                    errorMessage = '네트워크 연결을 확인하고 다시 시도해주세요.';
                }
                this.addMessage(errorMessage, 'bot', true);
            }
            
        } catch (error) {
            console.error('Failed to send message:', error);
            this.hideTyping();
            this.addMessage('메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.', 'bot', true);
        }
        
        // Focus back to input
        if (!messageText) {
            this.messageInput.focus();
        }
    }

    /**
     * Send message to background script
     */
    sendMessageToBackground(message, context = {}) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'sendMessage',
                data: {
                    message: message,
                    sessionId: this.currentSessionId,
                    category: context.category || this.selectedCategory,
                    ...context
                }
            }, resolve);
        });
    }

    /**
     * Add message to chat UI
     */
    addMessage(content, type, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${type}-message${isError ? ' error-message' : ''}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Safely handle content to prevent XSS
        if (!isError && type === 'bot') {
            // For bot messages, use secure DOM formatting
            contentDiv.appendChild(this.formatBotMessage(content));
        } else {
            // For user messages and errors, treat as plain text
            const lines = String(content).split('\n');
            lines.forEach((line, index) => {
                contentDiv.appendChild(document.createTextNode(line));
                if (index < lines.length - 1) {
                    contentDiv.appendChild(document.createElement('br'));
                }
            });
        }
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.formatTime(new Date());
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        // 에러 메시지인 경우 재시도 버튼 추가
        if (isError && type === 'bot') {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-button';
            retryBtn.textContent = '다시 시도';
            retryBtn.onclick = () => this.retryLastMessage();
            messageDiv.appendChild(retryBtn);
        }
        
        // Remove welcome message if exists
        const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Safely formats bot message. It handles newlines and links, but avoids innerHTML.
     * All content is treated as text, preventing XSS.
     */
    formatBotMessage(content) {
        const fragment = document.createDocumentFragment();
        // This regex finds URLs in the text.
        const linkRegex = /(https?:\/\/[^\s"'<>`]+)/g;

        String(content).split('\n').forEach((line, lineIndex, lines) => {
            let lastIndex = 0;
            let match;

            // Find all links in the current line
            while ((match = linkRegex.exec(line)) !== null) {
                // Add text before the link
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(line.substring(lastIndex, match.index)));
                }

                // Create the link element
                const a = document.createElement('a');
                a.href = match[0];
                a.target = '_blank';
                a.rel = 'noopener noreferrer'; // Security best practice
                a.className = 'external-link';
                a.textContent = match[0]; // Use textContent for safety
                fragment.appendChild(a);

                lastIndex = linkRegex.lastIndex;
            }

            // Add any remaining text after the last link
            if (lastIndex < line.length) {
                fragment.appendChild(document.createTextNode(line.substring(lastIndex)));
            }

            // Add a line break if it's not the last line
            if (lineIndex < lines.length - 1) {
                fragment.appendChild(document.createElement('br'));
            }
        });

        // For simplicity and security, markdown features like bold, italics, or code blocks
        // that were previously handled with insecure regex-to-HTML have been removed.
        // This implementation focuses on the critical task of preventing XSS.
        // Re-implementing full markdown safely would require a proper, trusted parser library.
        return fragment;
    }

    /**
     * Retry last message
     */
    retryLastMessage() {
        if (this.lastUserMessage) {
            this.handleSendMessage(this.lastUserMessage);
        }
    }

    /**
     * Format time for display
     */
    formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    /**
     * Show typing indicator
     */
    showTyping() {
        this.isTyping = true;
        this.typingIndicator.style.display = 'flex';
        this.sendButton.disabled = true;
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTyping() {
        this.isTyping = false;
        this.typingIndicator.style.display = 'none';
        this.handleInputChange(); // Update send button state
    }

    /**
     * Scroll to bottom of messages
     */
    scrollToBottom() {
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }

    /**
     * Load chat history
     */
    async loadChatHistory() {
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'getChatHistory', limit: 50 }, resolve);
            });
            
            if (response.success && response.data.length > 0) {
                // Remove welcome message
                const welcomeMessage = this.messagesContainer.querySelector('.welcome-message');
                if (welcomeMessage) {
                    welcomeMessage.remove();
                }
                
                // Add historical messages
                response.data.forEach(message => {
                    this.addHistoricalMessage(message);
                });
                
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    /**
     * Add historical message to UI
     */
    addHistoricalMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${message.type}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message.content;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.formatTime(new Date(message.timestamp));
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        this.messagesContainer.appendChild(messageDiv);
    }

    /**
     * Create a new session
     */
    async createNewSession() {
        try {
            console.log('[AI Chatbot] Creating new session...');
            
            // Send request to background script to create new session
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'createNewSession'
                }, resolve);
            });

            if (response.success) {
                // Clear current session
                this.currentSessionId = response.data.sessionId;
                
                // Clear messages but keep welcome message
                this.messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        <div class="message-bubble bot-message">
                            <div class="message-content">
                                👋 Hello! I'm your AI assistant. How can I help you today?
                            </div>
                            <div class="message-time">Just now</div>
                        </div>
                    </div>
                `;

                // Update welcome message for current category
                this.updateWelcomeMessage(this.selectedCategory);
                
                console.log(`[AI Chatbot] New session created: ${this.currentSessionId}`);
                
                // Show feedback message
                this.addMessage('✨ New session started!', 'bot');
                
            } else {
                console.error('[AI Chatbot] Failed to create new session:', response.error);
                this.addMessage(`Error creating new session: ${response.error}`, 'bot', true);
            }
        } catch (error) {
            console.error('[AI Chatbot] Failed to create new session:', error);
            this.addMessage(`Error creating new session: ${error.message}`, 'bot', true);
        }
    }

    /**
     * Clear chat history
     */
    async clearChat() {
        if (!confirm('Are you sure you want to clear the chat history?')) {
            return;
        }
        
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'clearHistory' }, resolve);
            });
            
            if (response.success) {
                // Clear UI
                this.messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        <div class="message-bubble bot-message">
                            <div class="message-content">
                                👋 Hello! I'm your AI assistant. How can I help you today?
                            </div>
                            <div class="message-time">Just now</div>
                        </div>
                    </div>
                `;
                
                // Reset session
                this.currentSessionId = null;
            }
        } catch (error) {
            console.error('Failed to clear chat:', error);
            alert('Failed to clear chat history. Please try again.');
        }
    }

    /**
     * Show settings modal
     */
    showSettings() {
        this.settingsModal.style.display = 'flex';
        document.getElementById('webhook-url').focus();
    }

    /**
     * Hide settings modal
     */
    hideSettings() {
        this.settingsModal.style.display = 'none';
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'getSettings' }, resolve);
            });
            
            if (response.success) {
                this.settings = response.data;
                const settings = response.data;
                
                // Backend selection
                const backendSelect = document.getElementById('backend-select');
                if (backendSelect) {
                    backendSelect.value = settings.backend || 'n8n';
                    this.toggleBackendSettings(settings.backend || 'n8n');
                    
                    // Add event listener for backend change
                    backendSelect.addEventListener('change', (e) => {
                        this.toggleBackendSettings(e.target.value);
                    });
                }
                
                // n8n settings
                document.getElementById('webhook-url').value = settings.webhookUrl || '';
                
                // Ollama settings
                const ollamaUrlInput = document.getElementById('ollama-url');
                if (ollamaUrlInput) {
                    ollamaUrlInput.value = settings.ollamaUrl || 'http://localhost:11434';
                }
                
                // Common settings
                document.getElementById('api-timeout').value = settings.timeout || 30;
                document.getElementById('save-history').checked = settings.saveHistory !== false;
                this.messageInput.maxLength = this.settings.maxMessageLength || 4000;
                
                // Load Ollama models if backend is Ollama
                if (settings.backend === 'ollama') {
                    await this.loadOllamaModels();
                }
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    /**
     * Toggle backend-specific settings visibility
     */
    toggleBackendSettings(backend) {
        const n8nGroup = document.getElementById('n8n-url-group');
        const ollamaUrlGroup = document.getElementById('ollama-url-group');
        const ollamaModelGroup = document.getElementById('ollama-model-group');
        
        if (backend === 'ollama') {
            if (n8nGroup) n8nGroup.style.display = 'none';
            if (ollamaUrlGroup) ollamaUrlGroup.style.display = 'block';
            if (ollamaModelGroup) ollamaModelGroup.style.display = 'block';
            this.loadOllamaModels();
        } else {
            if (n8nGroup) n8nGroup.style.display = 'block';
            if (ollamaUrlGroup) ollamaUrlGroup.style.display = 'none';
            if (ollamaModelGroup) ollamaModelGroup.style.display = 'none';
        }
    }

    /**
     * Load available Ollama models
     */
    async loadOllamaModels() {
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'getAvailableModels' }, resolve);
            });
            
            const modelSelect = document.getElementById('ollama-model');
            if (response.success && modelSelect) {
                modelSelect.innerHTML = '<option value="">Auto-select</option>';
                
                response.data.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load Ollama models:', error);
        }
    }

    /**
     * Save settings
     */
    async saveSettings() {
        try {
            const backendSelect = document.getElementById('backend-select');
            const backend = backendSelect ? backendSelect.value : 'n8n';
            
            const webhookUrl = document.getElementById('webhook-url').value.trim();
            const ollamaUrlInput = document.getElementById('ollama-url');
            const ollamaUrl = ollamaUrlInput ? ollamaUrlInput.value.trim() : 'http://localhost:11434';
            const ollamaModelSelect = document.getElementById('ollama-model');
            const ollamaModel = ollamaModelSelect ? ollamaModelSelect.value : '';
            
            const timeout = parseInt(document.getElementById('api-timeout').value) || 30;
            const saveHistory = document.getElementById('save-history').checked;
            
            // Validate URLs based on backend
            if (backend === 'n8n' && webhookUrl && !this.isValidUrl(webhookUrl)) {
                alert('Please enter a valid n8n webhook URL');
                return;
            }
            
            if (backend === 'ollama' && ollamaUrl && !this.isValidUrl(ollamaUrl)) {
                alert('Please enter a valid Ollama URL');
                return;
            }
            
            const settings = {
                backend,
                webhookUrl,
                ollamaUrl,
                ollamaModel,
                timeout: Math.max(5, Math.min(600, timeout)),
                saveHistory
            };
            
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ 
                    action: 'saveSettings', 
                    data: settings 
                }, resolve);
            });
            
            if (response.success) {
                this.hideSettings();
                await this.checkConnection();
                alert('Settings saved successfully!');
            } else {
                alert(`Failed to save settings: ${response.error}`);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings. Please try again.');
        }
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

    /**
     * Check webhook connection
     */
    async checkConnection() {
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'testConnection' }, resolve);
            });
            
            if (response.success) {
                const result = response.data;
                this.updateConnectionStatus(result.connected, result.error);
            } else {
                this.updateConnectionStatus(false, response.error);
            }
        } catch (error) {
            console.error('Failed to check connection:', error);
            this.updateConnectionStatus(false, error.message);
        }
    }

    /**
     * Update connection status display
     */
    updateConnectionStatus(connected, error) {
        this.connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
        this.connectionStatus.className = `bot-status ${connected ? 'connected' : 'disconnected'}`;
        
        if (!connected && error) {
            this.connectionStatus.title = `Connection error: ${error}`;
        } else {
            this.connectionStatus.title = '';
        }
    }

    /**
     * Toggle category options display
     */
    toggleCategoryOptions() {
        const isCollapsed = this.categoryOptions.classList.contains('collapsed');
        
        if (isCollapsed) {
            this.categoryOptions.classList.remove('collapsed');
            this.categoryToggle.classList.remove('collapsed');
        } else {
            this.categoryOptions.classList.add('collapsed');
            this.categoryToggle.classList.add('collapsed');
        }
    }

    /**
     * Select a category
     */
    selectCategory(event) {
        const button = event.currentTarget;
        const category = button.dataset.category;
        const icon = button.dataset.icon;
        
        // Remove active class from all buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected button
        button.classList.add('active');
        
        // Update selected category
        this.selectedCategory = category;
        
        // Update header
        this.updateBotHeader(category, icon);
        
        // Update selected category display
        this.updateSelectedCategoryDisplay(category);
        
        // Save selection to storage
        this.saveCategorySelection(category);
        
        // Update welcome message
        this.updateWelcomeMessage(category);
    }

    /**
     * Update bot header with category info
     */
    updateBotHeader(category, icon) {
        this.botAvatar.textContent = icon;
        
        const categoryNames = {
            general: 'General AI',
            hr: 'HR Assistant',
            it: 'IT Support',
            data: 'Data Analyst',
            finance: 'Finance Expert',
            marketing: 'Marketing Specialist',
            legal: 'Legal Advisor',
            support: 'Customer Support'
        };
        
        this.botName.textContent = categoryNames[category] || 'AI Assistant';
    }

    /**
     * Update selected category display in header
     */
    updateSelectedCategoryDisplay(category) {
        const selectedCategorySpan = document.querySelector('.selected-category');
        
        if (selectedCategorySpan) {
            const categoryDisplayNames = {
                GENERAL: 'General',
                HR: 'HR',
                IT: 'IT',
                DATA: 'Data',
                FINANCE: 'Finance',
                MARKETING: 'Marketing',
                LEGAL: 'Legal',
                SECURITY: 'Security'
            };
            
            selectedCategorySpan.textContent = categoryDisplayNames[category] || 'General';
        }
    }

    /**
     * Update welcome message for category
     */
    updateWelcomeMessage(category) {
        const welcomeMessage = document.querySelector('.welcome-message .message-content');
        if (welcomeMessage) {
            const categoryMessages = {
                general: '👋 Hello! I\'m your General AI assistant. How can I help you today?',
                hr: '👥 Hi! I\'m your HR assistant. I can help with policies, benefits, and HR questions.',
                it: '💻 Hello! I\'m your IT support assistant. Ready to help with technical issues and questions.',
                data: '📊 Hi there! I\'m your Data analyst. I can help with data insights and analysis.',
                finance: '💰 Hello! I\'m your Finance expert. I can assist with financial questions and analysis.',
                marketing: '📢 Hi! I\'m your Marketing specialist. Ready to help with campaigns and strategies.',
                legal: '⚖️ Hello! I\'m your Legal advisor. I can help with legal questions and compliance.',
                support: '🎧 Hi! I\'m your Customer Support assistant. How can I help you today?'
            };
            
            welcomeMessage.textContent = categoryMessages[category] || categoryMessages.general;
        }
    }

    /**
     * Save category selection to storage
     */
    async saveCategorySelection(category) {
        try {
            await chrome.storage.local.set({ selectedCategory: category });
        } catch (error) {
            console.error('Failed to save category selection:', error);
        }
    }

    /**
     * Load saved category selection
     */
    async loadCategorySelection() {
        try {
            const result = await chrome.storage.local.get(['selectedCategory']);
            const savedCategory = result.selectedCategory || 'GENERAL';
            
            // Find and click the saved category button
            const categoryButton = document.querySelector(`[data-category="${savedCategory}"]`);
            if (categoryButton) {
                categoryButton.click();
            } else {
                // If saved category is not visible, select the first available category
                const firstButton = document.querySelector('.category-btn');
                if (firstButton) {
                    firstButton.click();
                }
            }
        } catch (error) {
            console.error('Failed to load category selection:', error);
        }
    }

    /**
     * Initialize category selector
     */
    async initializeCategories() {
        await this.populateCategories();
        await this.loadCategorySelection();
        
        // Initialize with collapsed state on small screens
        if (window.innerWidth < 400) {
            this.categoryOptions.classList.add('collapsed');
            this.categoryToggle.classList.add('collapsed');
        }
    }

    /**
     * Populate categories based on user settings
     */
    async populateCategories() {
        try {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'getSettings' }, resolve);
            });
            
            if (!response.success) {
                console.error('Failed to get settings:', response.error);
                return;
            }
            
            const settings = response.data;
            const visibleCategories = settings.visibleCategories || {
                GENERAL: true,
                HR: false,
                IT: false,
                DATA: false,
                FINANCE: false,
                MARKETING: false,
                LEGAL: false,
                SECURITY: false
            };
            
            const categories = [
                { key: 'GENERAL', name: 'General', icon: '🤖' },
                { key: 'HR', name: 'HR', icon: '👥' },
                { key: 'IT', name: 'IT', icon: '💻' },
                { key: 'DATA', name: 'Data', icon: '📊' },
                { key: 'FINANCE', name: 'Finance', icon: '💰' },
                { key: 'MARKETING', name: 'Marketing', icon: '📢' },
                { key: 'LEGAL', name: 'Legal', icon: '⚖️' },
                { key: 'SECURITY', name: 'Security', icon: '🛡️' }
            ];
            
            // Clear existing category buttons
            this.categoryOptions.innerHTML = '';
            
            // Add only visible categories
            categories.forEach(category => {
                if (visibleCategories[category.key]) {
                    const button = document.createElement('button');
                    button.className = 'category-btn';
                    button.dataset.category = category.key;
                    button.dataset.icon = category.icon;
                    button.innerHTML = `
                        <span class="category-icon">${category.icon}</span>
                        <span class="category-name">${category.name}</span>
                    `;
                    
                    // Add click event listener
                    button.addEventListener('click', this.selectCategory.bind(this));
                    
                    this.categoryOptions.appendChild(button);
                }
            });
            
        } catch (error) {
            console.error('Failed to populate categories:', error);
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new ChatbotPopup();
});

// Debug function for testing message formatting
window.testMessageFormatting = function() {
    const testMessage = `개인정보보호위원회는 합성데이터(Synthetic data)의 안전한 생성 및 활용을 지원하기 위해 「합성데이터 생성·활용 안내서」를 발간했습니다. 주요 내용은 다음과 같습니다:\n\n1. **합성데이터 정의**: 원본 데이터의 구조·통계적 특성을 학습해 생성한 가상 데이터로, 개인 식별정보 노출 없이 데이터 공유·활용 가능.\n2. **안내서 주요 내용**:\n - 생성·활용 절차: 사전 준비 → 합성데이터 생성 → 안전성/유용성 검증 → 심의위원회 평가 → 활용 및 안전 관리\n - 개인정보 식별 가능성 대응을 위한 단계별 세부 가이드\n - 비정형 데이터(이미지 등) 활용 시 유의사항 및 안전성 검증 절차\n3. **의의**: 산업·연구 현장에서 합성데이터 활용 기준·방법론을 체계화해 애로사항 해소\n4. **참고 자료**: \n - 합성데이터 생성 참조모델(2024년 5월) 및 '가명정보 지원 플랫폼(dataprivacy.go.kr)'에서 다운로드 가능\n\n이 안내서는 합성데이터를 익명정보로 활용하기 위한 기준을 제시하며, 산학연·법률 전문가가 참여해 작성되었습니다.`;
    
    if (window.chatbot) {
        window.chatbot.addMessage(testMessage, 'bot');
    } else {
        console.log('Chatbot instance not found');
    }
};

// Make chatbot instance globally accessible for debugging
window.chatbot = null;