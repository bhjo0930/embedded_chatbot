/**
 * AI Chatbot Sidebar Content Script
 * Creates a sidebar chatbot interface on web pages
 */

class ChatbotSidebar {
    constructor() {
        this.isOpen = false;
        this.selectedCategory = 'GENERAL';
        this.currentSessionId = null;
        this.isTyping = false;
        this.settings = {};
        
        // DOM elements
        this.sidebar = null;
        this.toggleButton = null;
        this.messagesContainer = null;
        this.messageInput = null;
        this.sendButton = null;
        this.categoryOptions = null;
        this.typingIndicator = null;
        this.botAvatar = null;
        this.botName = null;
        this.charCount = null;
        
        this.init();
    }

    /**
     * Initialize the sidebar
     */
    async init() {
        // Skip on restricted pages
        if (this.shouldSkipPage()) {
            return;
        }

        try {
            await this.loadSettings();
            this.createToggleButton();
            this.createSidebar();
            this.bindEvents();
            await this.loadCategorySelection();
            
            // Set initial toggle button visibility based on settings
            const showToggleButton = this.settings.showToggleButton !== false; // Default to true
            this.setToggleButtonVisibility(showToggleButton);
            
            console.log('[AI Chatbot] Sidebar initialized');
        } catch (error) {
            console.error('[AI Chatbot] Failed to initialize sidebar:', error);
        }
    }

    /**
     * Check if we should skip this page
     */
    shouldSkipPage() {
        const skipDomains = [
            'chrome-extension://',
            'chrome://',
            'moz-extension://',
            'about:',
            'file://'
        ];
        
        const currentUrl = window.location.href.toLowerCase();
        return skipDomains.some(domain => currentUrl.startsWith(domain));
    }

    /**
     * Load settings from extension storage
     */
    async loadSettings() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
                if (response && response.success) {
                    this.settings = response.data;
                } else {
                    this.settings = { 
                        webhookUrl: '',
                        timeout: 30,
                        saveHistory: true
                    };
                }
                resolve();
            });
        });
    }

    /**
     * Create the toggle button
     */
    createToggleButton() {
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'ai-chatbot-toggle';
        this.toggleButton.innerHTML = '💬';
        this.toggleButton.title = 'Toggle AI Chatbot';
        this.toggleButton.setAttribute('aria-label', 'Toggle AI Chatbot');
        
        document.body.appendChild(this.toggleButton);
    }

    /**
     * Create the sidebar
     */
    createSidebar() {
        this.sidebar = document.createElement('div');
        this.sidebar.className = 'ai-chatbot-sidebar';
        this.sidebar.innerHTML = this.getSidebarHTML();
        
        document.body.appendChild(this.sidebar);
        
        // Get references to elements
        this.messagesContainer = this.sidebar.querySelector('.ai-chatbot-messages');
        this.messageInput = this.sidebar.querySelector('.ai-chatbot-input');
        this.sendButton = this.sidebar.querySelector('.ai-chatbot-send-btn');
        this.categoryOptions = this.sidebar.querySelector('.ai-chatbot-category-options');
        this.typingIndicator = this.sidebar.querySelector('.ai-chatbot-typing');
        this.botAvatar = this.sidebar.querySelector('.ai-chatbot-avatar');
        this.botName = this.sidebar.querySelector('.ai-chatbot-details h3');
        this.charCount = this.sidebar.querySelector('.ai-chatbot-char-count');
    }

    /**
     * Get sidebar HTML structure
     */
    getSidebarHTML() {
        return `
            <!-- Header -->
            <div class="ai-chatbot-header">
                <div class="ai-chatbot-header-info">
                    <div class="ai-chatbot-avatar">🤖</div>
                    <div class="ai-chatbot-details">
                        <h3>General AI</h3>
                        <div class="ai-chatbot-status">Ready to help</div>
                    </div>
                </div>
                <button class="ai-chatbot-close" title="Close Chatbot">&times;</button>
            </div>

            <!-- Category Selection -->
            <div class="ai-chatbot-categories">
                <div class="ai-chatbot-category-header">
                    <span class="ai-chatbot-category-title">Select AI Agent:</span>
                    <button class="ai-chatbot-category-toggle" title="Toggle Categories">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7,10L12,15L17,10H7Z"/>
                        </svg>
                    </button>
                </div>
                <div class="ai-chatbot-category-options">
                    <button class="ai-chatbot-category-btn active" data-category="GENERAL" data-icon="🤖">
                        <span class="ai-chatbot-category-icon">🤖</span>
                        <span class="ai-chatbot-category-name">General</span>
                    </button>
                    <button class="ai-chatbot-category-btn" data-category="HR" data-icon="👥">
                        <span class="ai-chatbot-category-icon">👥</span>
                        <span class="ai-chatbot-category-name">HR</span>
                    </button>
                    <button class="ai-chatbot-category-btn" data-category="IT" data-icon="💻">
                        <span class="ai-chatbot-category-icon">💻</span>
                        <span class="ai-chatbot-category-name">IT</span>
                    </button>
                    <button class="ai-chatbot-category-btn" data-category="DATA" data-icon="📊">
                        <span class="ai-chatbot-category-icon">📊</span>
                        <span class="ai-chatbot-category-name">Data</span>
                    </button>
                    <button class="ai-chatbot-category-btn" data-category="FINANCE" data-icon="💰">
                        <span class="ai-chatbot-category-icon">💰</span>
                        <span class="ai-chatbot-category-name">Finance</span>
                    </button>
                    <button class="ai-chatbot-category-btn" data-category="MARKETING" data-icon="📢">
                        <span class="ai-chatbot-category-icon">📢</span>
                        <span class="ai-chatbot-category-name">Marketing</span>
                    </button>
                    <button class="ai-chatbot-category-btn" data-category="LEGAL" data-icon="⚖️">
                        <span class="ai-chatbot-category-icon">⚖️</span>
                        <span class="ai-chatbot-category-name">Legal</span>
                    </button>
                    <button class="ai-chatbot-category-btn" data-category="SECURITY" data-icon="🔒">
                        <span class="ai-chatbot-category-icon">🔒</span>
                        <span class="ai-chatbot-category-name">Security</span>
                    </button>
                </div>
            </div>

            <!-- Chat Messages -->
            <div class="ai-chatbot-messages">
                <div class="ai-chatbot-welcome">
                    <div class="ai-chatbot-message bot">
                        👋 Hello! I'm your General AI assistant. How can I help you today?
                        <div class="ai-chatbot-message-time">Just now</div>
                    </div>
                </div>
            </div>

            <!-- Typing Indicator -->
            <div class="ai-chatbot-typing">
                <div class="ai-chatbot-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span>AI is typing...</span>
            </div>

            <!-- Input Area -->
            <div class="ai-chatbot-input-area">
                <div class="ai-chatbot-input-wrapper">
                    <textarea 
                        class="ai-chatbot-input" 
                        placeholder="Type your message..." 
                        rows="1"
                        maxlength="2000"
                    ></textarea>
                    <button class="ai-chatbot-send-btn" disabled title="Send message">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                        </svg>
                    </button>
                </div>
                <div class="ai-chatbot-char-count">0/2000</div>
            </div>
        `;
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Toggle button
        this.toggleButton.addEventListener('click', this.toggleSidebar.bind(this));
        
        // Close button
        const closeButton = this.sidebar.querySelector('.ai-chatbot-close');
        closeButton.addEventListener('click', this.closeSidebar.bind(this));
        
        // Message input
        this.messageInput.addEventListener('input', this.handleInputChange.bind(this));
        this.messageInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Send button
        this.sendButton.addEventListener('click', this.sendMessage.bind(this));
        
        // Category selection
        const categoryToggle = this.sidebar.querySelector('.ai-chatbot-category-toggle');
        categoryToggle.addEventListener('click', this.toggleCategories.bind(this));
        
        const categoryButtons = this.sidebar.querySelectorAll('.ai-chatbot-category-btn');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', this.selectCategory.bind(this));
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', this.autoResizeTextarea.bind(this));
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeSidebar();
            }
        });
    }

    /**
     * Toggle sidebar open/close
     */
    toggleSidebar() {
        if (this.isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    /**
     * Open sidebar
     */
    openSidebar() {
        this.sidebar.classList.add('open');
        this.toggleButton.classList.add('sidebar-open');
        this.toggleButton.innerHTML = '✕';
        this.toggleButton.title = 'Close AI Chatbot';
        document.body.classList.add('ai-chatbot-sidebar-open');
        this.isOpen = true;
        
        // Focus input
        setTimeout(() => {
            this.messageInput.focus();
        }, 300);
    }

    /**
     * Close sidebar
     */
    closeSidebar() {
        this.sidebar.classList.remove('open');
        this.toggleButton.classList.remove('sidebar-open');
        this.toggleButton.innerHTML = '💬';
        this.toggleButton.title = 'Open AI Chatbot';
        document.body.classList.remove('ai-chatbot-sidebar-open');
        this.isOpen = false;
    }

    /**
     * Handle input change
     */
    handleInputChange() {
        const message = this.messageInput.value.trim();
        const charCount = this.messageInput.value.length;
        
        // Update character count
        this.charCount.textContent = `${charCount}/2000`;
        
        // Update send button state
        this.sendButton.disabled = !message || this.isTyping;
        
        // Update character count color
        if (charCount > 1800) {
            this.charCount.style.color = '#ef4444';
        } else if (charCount > 1500) {
            this.charCount.style.color = '#f59e0b';
        } else {
            this.charCount.style.color = '#94a3b8';
        }
    }

    /**
     * Handle keydown events
     */
    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
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
     * Send message
     */
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        try {
            // Add user message to UI
            this.addMessage(message, 'user');
            
            // Clear input and update state
            this.messageInput.value = '';
            this.handleInputChange();
            this.autoResizeTextarea();
            
            // Show typing indicator
            this.showTyping();
            
            // Send message to background script
            const response = await this.sendMessageToBackground(message);
            
            // Hide typing indicator
            this.hideTyping();
            
            // Add bot response to UI
            if (response.success) {
                this.addMessage(response.data.message, 'bot');
                this.currentSessionId = response.data.sessionId;
            } else {
                this.addMessage(`Error: ${response.error}`, 'bot', true);
            }
            
        } catch (error) {
            console.error('[AI Chatbot] Failed to send message:', error);
            this.hideTyping();
            this.addMessage(`Error: ${error.message}`, 'bot', true);
        }
        
        // Focus back to input
        this.messageInput.focus();
    }

    /**
     * Send message to background script
     */
    sendMessageToBackground(message) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'sendMessage',
                data: {
                    message: message,
                    sessionId: this.currentSessionId,
                    category: this.selectedCategory
                }
            }, resolve);
        });
    }

    /**
     * Add message to chat UI
     */
    addMessage(content, type, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-chatbot-message ${type}${isError ? ' error' : ''}`;
        
        const timeStr = this.formatTime(new Date());
        
        // Sanitize and format content
        const formattedContent = (!isError && type === 'bot') ?
            this.formatBotMessage(content) : DOMUtils.escapeHTML(content);

        messageDiv.innerHTML = `
            ${formattedContent}
            <div class="ai-chatbot-message-time">${timeStr}</div>
        `;
        
        // Remove welcome message if exists
        const welcomeMessage = this.messagesContainer.querySelector('.ai-chatbot-welcome');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * Format bot message with enhanced markdown support
     */
    formatBotMessage(content) {
        if (!content || typeof content !== 'string') {
            return content;
        }

        const safeContent = DOMUtils.escapeHTML(content);

        return safeContent
            // Handle numbered lists (1. 2. 3.)
            .replace(/^(\d+)\.\s+(.+)$/gm, '<div class="list-item numbered"><span class="list-number">$1.</span> $2</div>')
            // Handle bullet points (- or *)
            .replace(/^[-*]\s+(.+)$/gm, '<div class="list-item bullet"><span class="bullet">•</span> $1</div>')
            // Handle bold text (**text**)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Handle italic text (*text*)
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Handle inline code (`code`)
            .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
            // Handle code blocks (```code```)
            .replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>')
            // Handle line breaks (both literal \n and escaped \\n)
            .replace(/\\n/g, '\n')  // Convert escaped \n to actual newlines first
            .replace(/\n/g, '<br>') // Then convert newlines to <br> tags
            // Handle URLs
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" class="external-link">$1</a>')
            // Handle section headers (### text)
            .replace(/^###\s+(.+)$/gm, '<h4 class="section-header">$1</h4>')
            .replace(/^##\s+(.+)$/gm, '<h3 class="section-header">$1</h3>')
            .replace(/^#\s+(.+)$/gm, '<h2 class="section-header">$1</h2>')
            // Clean up multiple consecutive <br> tags
            .replace(/(<br\s*\/?>){3,}/g, '<br><br>');
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
        this.typingIndicator.classList.add('show');
        this.sendButton.disabled = true;
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTyping() {
        this.isTyping = false;
        this.typingIndicator.classList.remove('show');
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
     * Toggle category options display
     */
    toggleCategories() {
        const isCollapsed = this.categoryOptions.classList.contains('collapsed');
        
        if (isCollapsed) {
            this.categoryOptions.classList.remove('collapsed');
        } else {
            this.categoryOptions.classList.add('collapsed');
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
        this.sidebar.querySelectorAll('.ai-chatbot-category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to selected button
        button.classList.add('active');
        
        // Update selected category
        this.selectedCategory = category;
        
        // Update header
        this.updateBotHeader(category, icon);
        
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
            GENERAL: 'General AI',
            HR: 'HR Assistant',
            IT: 'IT Support',
            DATA: 'Data Analyst',
            FINANCE: 'Finance Expert',
            MARKETING: 'Marketing Specialist',
            LEGAL: 'Legal Advisor',
            SECURITY: 'Security Specialist'
        };
        
        this.botName.textContent = categoryNames[category] || 'AI Assistant';
    }

    /**
     * Update welcome message for category
     */
    updateWelcomeMessage(category) {
        const welcomeMessage = this.messagesContainer.querySelector('.ai-chatbot-welcome .ai-chatbot-message');
        if (welcomeMessage) {
            const categoryMessages = {
                GENERAL: '👋 Hello! I\'m your General AI assistant. How can I help you today?',
                HR: '👥 Hi! I\'m your HR assistant. I can help with policies, benefits, and HR questions.',
                IT: '💻 Hello! I\'m your IT support assistant. Ready to help with technical issues and questions.',
                DATA: '📊 Hi there! I\'m your Data analyst. I can help with data insights and analysis.',
                FINANCE: '💰 Hello! I\'m your Finance expert. I can assist with financial questions and analysis.',
                MARKETING: '📢 Hi! I\'m your Marketing specialist. Ready to help with campaigns and strategies.',
                LEGAL: '⚖️ Hello! I\'m your Legal advisor. I can help with legal questions and compliance.',
                SECURITY: '🔒 Hello! I\'m your Security specialist. I can help with cybersecurity questions and security best practices.'
            };
            
            const messageContent = categoryMessages[category] || categoryMessages.GENERAL;
            welcomeMessage.innerHTML = `
                ${messageContent}
                <div class="ai-chatbot-message-time">Just now</div>
            `;
        }
    }

    /**
     * Save category selection to storage
     */
    async saveCategorySelection(category) {
        try {
            chrome.runtime.sendMessage({
                action: 'saveData',
                data: { selectedCategory: category }
            });
        } catch (error) {
            console.error('[AI Chatbot] Failed to save category selection:', error);
        }
    }

    /**
     * Load saved category selection
     */
    async loadCategorySelection() {
        try {
            chrome.runtime.sendMessage({ action: 'getData', key: 'selectedCategory' }, (response) => {
                if (response && response.success) {
                    const savedCategory = response.data || 'GENERAL';
                    
                    // Find and click the saved category button
                    const categoryButton = this.sidebar.querySelector(`[data-category="${savedCategory}"]`);
                    if (categoryButton) {
                        categoryButton.click();
                    }
                }
            });
        } catch (error) {
            console.error('[AI Chatbot] Failed to load category selection:', error);
        }
    }

    /**
     * Set toggle button visibility
     */
    setToggleButtonVisibility(visible) {
        if (this.toggleButton) {
            if (visible) {
                this.toggleButton.style.display = 'flex';
                this.toggleButton.style.opacity = '1';
                console.log('[AI Chatbot] Toggle button shown');
            } else {
                this.toggleButton.style.display = 'none';
                this.toggleButton.style.opacity = '0';
                console.log('[AI Chatbot] Toggle button hidden');
                
                // Also close sidebar if it's open
                if (this.isOpen) {
                    this.closeSidebar();
                }
            }
        }
    }
}

// Initialize the sidebar when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatbotSidebar();
    });
} else {
    new ChatbotSidebar();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleSidebar') {
        // Find the existing sidebar instance or create a new one
        if (window.chatbotSidebar) {
            window.chatbotSidebar.toggleSidebar();
        } else {
            // Create new instance if it doesn't exist
            window.chatbotSidebar = new ChatbotSidebar();
            // Open it after a short delay to allow initialization
            setTimeout(() => {
                window.chatbotSidebar.openSidebar();
            }, 100);
        }
        sendResponse({ success: true });
    } else if (request.action === 'setToggleButtonVisibility') {
        // Set toggle button visibility
        if (window.chatbotSidebar) {
            window.chatbotSidebar.setToggleButtonVisibility(request.visible);
        } else {
            // Create new instance if it doesn't exist
            window.chatbotSidebar = new ChatbotSidebar();
            setTimeout(() => {
                window.chatbotSidebar.setToggleButtonVisibility(request.visible);
            }, 100);
        }
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});

// Store the sidebar instance globally for access from background script
let sidebarInstance = null;

// Initialize the sidebar when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        sidebarInstance = new ChatbotSidebar();
        window.chatbotSidebar = sidebarInstance;
    });
} else {
    sidebarInstance = new ChatbotSidebar();
    window.chatbotSidebar = sidebarInstance;
}

// Export for potential use by other scripts
if (typeof window !== 'undefined') {
    window.ChatbotSidebar = ChatbotSidebar;
}