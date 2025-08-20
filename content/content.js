(function() {
    if (window.chatbotSidebarInjected) {
        return;
    }
    window.chatbotSidebarInjected = true;

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
            this.htmlButton = null;
            this.categoryOptions = null;
            this.typingIndicator = null;
            this.botAvatar = null;
            this.botName = null;
            this.charCount = null;
            this.resizeHandle = null;
            
            // Resize state
            this.isResizing = false;
            this.startX = 0;
            this.startWidth = 400;

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
                this.populateCategories();
                this.bindEvents();
                await this.loadCategorySelection();

                // Set initial toggle button visibility based on settings
                const showToggleButton = this.settings.showToggleButton !== false; // Default to true
                this.setToggleButtonVisibility(showToggleButton);

                // Set initial HTML button visibility based on settings
                const showHtmlButton = this.settings.showHtmlButton !== false; // Default to true
                this.setHtmlButtonVisibility(showHtmlButton);
                
                // Apply saved sidebar width with !important
                const savedWidth = this.settings.sidebarWidth || 400;
                this.sidebar.style.setProperty('width', `${savedWidth}px`, 'important');

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
            this.htmlButton = this.sidebar.querySelector('.ai-chatbot-html-btn');
            this.categoryOptions = this.sidebar.querySelector('.ai-chatbot-category-options');
            this.typingIndicator = this.sidebar.querySelector('.ai-chatbot-typing');
            this.botAvatar = this.sidebar.querySelector('.ai-chatbot-avatar');
            this.botName = this.sidebar.querySelector('.ai-chatbot-details h3');
            this.charCount = this.sidebar.querySelector('.ai-chatbot-char-count');
            this.attachmentsArea = this.sidebar.querySelector('.ai-chatbot-attachments-area');
            this.resizeHandle = this.sidebar.querySelector('.ai-chatbot-resize-handle');
            
            // Debug: Check if resize handle was found
            if (this.resizeHandle) {
                console.log('[AI Chatbot] Resize handle found and ready');
            } else {
                console.error('[AI Chatbot] Resize handle not found!');
            }
        }

        /**
         * Get sidebar HTML structure
         */
        getSidebarHTML() {
            return `
                <!-- Resize Handle -->
                <div class="ai-chatbot-resize-handle"></div>
                
                <!-- Header -->
                <div class="ai-chatbot-header">
                    <div class="ai-chatbot-header-info">
                        <div class="ai-chatbot-avatar">
                            <img src="${chrome.runtime.getURL('icons/icon48.png')}" alt="AI Chatbot" width="24" height="24">
                        </div>
                        <div class="ai-chatbot-details">
                            <h3>General AI</h3>
                            <div class="ai-chatbot-status">Ready to help</div>
                        </div>
                    </div>
                    <div class="ai-chatbot-header-buttons">
                        <button class="ai-chatbot-new" title="New Session">New</button>
                        <button class="ai-chatbot-close" title="Close Chatbot">&times;</button>
                    </div>
                </div>

                <!-- Category Selection -->
                <div class="ai-chatbot-categories">
                    <div class="ai-chatbot-category-header">
                        <span class="ai-chatbot-category-title">Select AI Agent: <span class="ai-chatbot-selected-category">General</span></span>
                        <button class="ai-chatbot-category-toggle" title="Toggle Categories">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7,10L12,15L17,10H7Z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="ai-chatbot-category-options">
                        <!-- Category buttons will be dynamically populated based on settings -->
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
                    <!-- Attachments Area -->
                    <div class="ai-chatbot-attachments-area" style="display: none;">
                        <!-- Attachments will be added here dynamically -->
                    </div>
                    
                    <div class="ai-chatbot-input-wrapper">
                        <textarea 
                            class="ai-chatbot-input" 
                            placeholder="Type your message..." 
                            rows="1"
                            maxlength="4000"
                        ></textarea>
                        <button class="ai-chatbot-html-btn" title="Add current page HTML to chat">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                            </svg>
                        </button>
                        <button class="ai-chatbot-send-btn" disabled title="Send message">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="ai-chatbot-char-count">0/4000</div>
                </div>
            `;
        }

        /**
         * Populate category buttons based on settings
         */
        populateCategories() {
            const categoryOptions = this.sidebar.querySelector('.ai-chatbot-category-options');
            if (!categoryOptions) return;

            const categories = [
                { key: 'GENERAL', name: 'General', icon: '🤖' },
                { key: 'HR', name: 'HR', icon: '👥' },
                { key: 'IT', name: 'IT', icon: '💻' },
                { key: 'DATA', name: 'Data', icon: '📊' },
                { key: 'FINANCE', name: 'Finance', icon: '💰' },
                { key: 'MARKETING', name: 'Marketing', icon: '📢' },
                { key: 'LEGAL', name: 'Legal', icon: '⚖️' },
                { key: 'SECURITY', name: 'Security', icon: '🔒' }
            ];

            const visibleCategories = this.settings.visibleCategories || {
                GENERAL: true,
                HR: false,
                IT: false,
                DATA: false,
                FINANCE: false,
                MARKETING: false,
                LEGAL: false,
                SECURITY: false
            };

            // Clear existing buttons
            categoryOptions.innerHTML = '';

            // Add visible category buttons
            let firstVisibleCategory = null;
            categories.forEach(category => {
                if (visibleCategories[category.key]) {
                    const button = document.createElement('button');
                    button.className = 'ai-chatbot-category-btn';
                    button.setAttribute('data-category', category.key);
                    button.setAttribute('data-icon', category.icon);
                    
                    button.innerHTML = `
                        <span class="ai-chatbot-category-icon">${category.icon}</span>
                        <span class="ai-chatbot-category-name">${category.name}</span>
                    `;
                    
                    categoryOptions.appendChild(button);
                    
                    // Set the first visible category as default active
                    if (!firstVisibleCategory) {
                        firstVisibleCategory = category.key;
                        button.classList.add('active');
                    }
                }
            });

            // Update the selected category title
            if (firstVisibleCategory) {
                const selectedCategorySpan = this.sidebar.querySelector('.ai-chatbot-selected-category');
                if (selectedCategorySpan) {
                    const firstCategory = categories.find(c => c.key === firstVisibleCategory);
                    selectedCategorySpan.textContent = firstCategory ? firstCategory.name : 'General';
                }
            }
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

            // New session button
            const newButton = this.sidebar.querySelector('.ai-chatbot-new');
            newButton.addEventListener('click', this.createNewSession.bind(this));

            // Message input
            this.messageInput.addEventListener('input', this.handleInputChange.bind(this));
            this.messageInput.addEventListener('keydown', this.handleKeyDown.bind(this));

            // Send button
            this.sendButton.addEventListener('click', this.sendMessage.bind(this));

            // HTML button
            this.htmlButton.addEventListener('click', this.addPageHtml.bind(this));

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
            
            // Resize functionality
            if (this.resizeHandle) {
                this.resizeHandle.addEventListener('mousedown', this.startResize.bind(this));
                document.addEventListener('mousemove', this.handleResize.bind(this));
                document.addEventListener('mouseup', this.stopResize.bind(this));
                console.log('[AI Chatbot] Resize events bound successfully');
            } else {
                console.error('[AI Chatbot] Cannot bind resize events - handle not found');
            }
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
            
            // Apply current sidebar width to body margin
            const currentWidth = this.sidebar.offsetWidth;
            document.body.style.setProperty('margin-right', `${currentWidth}px`, 'important');
            
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
            document.body.style.removeProperty('margin-right');
            this.isOpen = false;
        }

        /**
         * Handle input change
         */
        handleInputChange() {
            const message = this.messageInput.value.trim();
            const charCount = this.messageInput.value.length;

            // Calculate attachment content length
            let attachmentLength = 0;
            if (this.attachmentsArea.children.length > 0) {
                const attachments = Array.from(this.attachmentsArea.children);
                attachments.forEach(attachment => {
                    const content = attachment.dataset.content || '';
                    attachmentLength += content.length + 200; // Add overhead for attachment tags
                });
            }

            const totalLength = charCount + attachmentLength;
            const maxLength = 4000;
            const availableLength = Math.max(0, maxLength - attachmentLength);

            // Update character count display
            if (attachmentLength > 0) {
                this.charCount.textContent = `${charCount}/${availableLength} (${attachmentLength} from attachments)`;
            } else {
                this.charCount.textContent = `${charCount}/${maxLength}`;
            }

            // Update send button state
            const hasAttachments = this.attachmentsArea.children.length > 0;
            this.sendButton.disabled = (!message && !hasAttachments) || this.isTyping || totalLength > maxLength;

            // Update character count color
            const ratio = totalLength / maxLength;
            if (ratio > 0.95) {
                this.charCount.style.color = '#ef4444';
            } else if (ratio > 0.8) {
                this.charCount.style.color = '#f59e0b';
            } else {
                this.charCount.style.color = '#94a3b8';
            }

            // Update input maxlength dynamically
            this.messageInput.setAttribute('maxlength', availableLength.toString());
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
            const hasAttachments = this.attachmentsArea.children.length > 0;

            if ((!message && !hasAttachments) || this.isTyping) return;

            try {
                // Build complete message with attachments
                let completeMessage = '';

                // Add attachments to message
                if (hasAttachments) {
                    const attachments = Array.from(this.attachmentsArea.children);
                    attachments.forEach(attachment => {
                        completeMessage += `<attachment>
<icon>${attachment.dataset.icon}</icon>
<filename>${attachment.dataset.filename}</filename>
<type>${attachment.dataset.type}</type>
<url>${attachment.dataset.url}</url>
<content>${attachment.dataset.content}</content>
</attachment>

`;
                    });
                }

                // Add user message
                if (message) {
                    completeMessage += message;
                }

                // Check message length and truncate if necessary
                const maxTotalLength = 3800; // Leave some buffer for API processing
                if (completeMessage.length > maxTotalLength) {
                    console.warn('[AI Chatbot] Message too long, truncating...', completeMessage.length);
                    completeMessage = completeMessage.substring(0, maxTotalLength) + '\n... (message truncated due to length)';
                }

                // Add user message to UI
                this.addMessage(completeMessage, 'user');

                // Clear input and attachments
                this.messageInput.value = '';
                this.messageInput.placeholder = 'Type your message...';
                this.clearAttachments();
                this.handleInputChange();
                this.autoResizeTextarea();

                // Show typing indicator
                this.showTyping();

                // Send message to background script (include complete message with attachments)
                const response = await this.sendMessageToBackground(message, completeMessage);

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
        sendMessageToBackground(message, completeMessage = null) {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'sendMessage',
                    data: {
                        message: completeMessage || message,
                        sessionId: this.currentSessionId,
                        category: this.selectedCategory
                    }
                }, resolve);
            });
        }

        /**
         * Add message to chat UI safely, preventing XSS.
         */
        addMessage(content, type, isError = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `ai-chatbot-message ${type}${isError ? ' error' : ''}`;

            // The container for the actual message content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'ai-chatbot-message-content';

            if (type === 'bot' && !isError) {
                // Sanitize the content from the bot before formatting
                const sanitizedContent = this.sanitizeHtml(content);
                const formattedContent = this.formatBotMessage(sanitizedContent);
                contentDiv.appendChild(formattedContent);
            } else if (type === 'user' && !isError && (content.includes('<attachment>') || content.includes('<details>'))) {
                // For user messages with attachment or details tags, also use formatting
                // This is content generated by the extension itself, so it's considered safe.
                contentDiv.appendChild(this.formatBotMessage(content));
            } else {
                // For user messages and errors, treat as plain text.
                // Split by newlines to preserve them.
                const lines = String(content).split('\n');
                lines.forEach((line, index) => {
                    contentDiv.appendChild(document.createTextNode(line));
                    if (index < lines.length - 1) {
                        contentDiv.appendChild(document.createElement('br'));
                    }
                });
            }
            messageDiv.appendChild(contentDiv);

            const timeDiv = document.createElement('div');
            timeDiv.className = 'ai-chatbot-message-time';
            timeDiv.textContent = this.formatTime(new Date());
            messageDiv.appendChild(timeDiv);

            // Remove welcome message if exists
            const welcomeMessage = this.messagesContainer.querySelector('.ai-chatbot-welcome');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }

            this.messagesContainer.appendChild(messageDiv);
            this.scrollToBottom();
        }

        /**
         * Safely formats bot message with basic markdown support.
         * Handles newlines, links, and basic formatting while preventing XSS.
         */
        formatBotMessage(content) {
            const fragment = document.createDocumentFragment();
            const lines = String(content).split('\n');
            let insideDetails = false;
            let insideAttachment = false;
            let attachmentData = {};

            lines.forEach((line, lineIndex) => {
                // Check if we're inside attachment tag
                if (line.trim().startsWith('<attachment>')) {
                    insideAttachment = true;
                    attachmentData = {};
                    return;
                } else if (line.trim() === '</attachment>') {
                    insideAttachment = false;
                    // Create attachment element
                    this.createAttachmentElement(attachmentData, fragment);
                    attachmentData = {};
                    return;
                }

                // Process attachment data
                if (insideAttachment) {
                    if (line.trim().startsWith('<icon>')) {
                        attachmentData.icon = line.replace(/<\/?icon>/g, '').trim();
                    } else if (line.trim().startsWith('<filename>')) {
                        attachmentData.filename = line.replace(/<\/?filename>/g, '').trim();
                    } else if (line.trim().startsWith('<type>')) {
                        attachmentData.type = line.replace(/<\/?type>/g, '').trim();
                    } else if (line.trim().startsWith('<url>')) {
                        attachmentData.url = line.replace(/<\/?url>/g, '').trim();
                    } else if (line.trim().startsWith('<content>')) {
                        attachmentData.content = line.replace(/<\/?content>/g, '').trim();
                    }
                    return;
                }

                // Check if we're inside details tag
                if (line.trim().startsWith('<details>')) {
                    insideDetails = true;
                } else if (line.trim() === '</details>') {
                    insideDetails = false;
                    // Clean up references
                    delete fragment._currentDetails;
                    delete fragment._currentDetailsContent;
                    return;
                }

                // Process the line
                if (insideDetails && fragment._currentDetailsContent &&
                    !line.trim().startsWith('<summary>') &&
                    line.trim() !== '</summary>'
                    &&
                    line.trim() !== '') {
                    // Add content to details content area
                    this.processLineWithFormatting(line, fragment._currentDetailsContent);
                    
                    // Only add br between consecutive text lines in details
                    if (lineIndex < lines.length - 1) {
                        const nextLine = lines[lineIndex + 1];
                        if (nextLine && 
                            nextLine.trim() !== '' &&
                            nextLine.trim() !== '</details>'
                            &&
                            !nextLine.trim().startsWith('<') &&
                            !nextLine.trim().startsWith('#')) {
                            fragment._currentDetailsContent.appendChild(document.createElement('br'));
                        }
                    }
                } else {
                    this.processLineWithFormatting(line, fragment);

                    // Add a line break only for consecutive text lines (not after headers, lists, tables, etc.)
                    if (lineIndex < lines.length - 1 && 
                        line.trim() !== '' &&
                        !line.trim().startsWith('<') &&
                        !line.trim().endsWith('>') &&
                        !line.trim().startsWith('#') &&
                        !line.trim().match(/^\s*[\*\-\+]\s/)
                        &&
                        !line.trim().match(/^\s*\d+\.\s/)
                        &&
                        !line.includes('|')) {
                        
                        const nextLine = lines[lineIndex + 1];
                        // Only add br if next line is also regular text (not empty, not special formatting)
                        if (nextLine && 
                            nextLine.trim() !== '' &&
                            !nextLine.trim().startsWith('<') &&
                            !nextLine.trim().startsWith('#') &&
                            !nextLine.trim().match(/^\s*[\*\-\+]\s/)
                            &&
                            !nextLine.trim().match(/^\s*\d+\.\s/)
                            &&
                            !nextLine.includes('|')) {
                            fragment.appendChild(document.createElement('br'));
                        }
                    }
                }
            });

            // Process any remaining table rows at the end
            if (fragment._pendingTableRows && fragment._pendingTableRows.length > 0) {
                this.processCompleteTable(fragment._pendingTableRows, fragment);
                fragment._pendingTableRows = [];
            }

            return fragment;
        }

        /**
         * Process a single line with safe markdown formatting
         */
        processLineWithFormatting(line, fragment) {
            // Handle attachment tags
            if (line.trim().startsWith('<attachment>')) {
                this.processAttachmentTag(line, fragment, 'attachment');
                return;
            }

            if (line.trim() === '</attachment>') {
                // Attachment closing tag is handled by the opening tag processor
                return;
            }

            // Handle details/summary tags
            if (line.trim().startsWith('<details>')) {
                this.processDetailsTag(line, fragment, 'details');
                return;
            }

            if (line.trim().startsWith('<summary>')) {
                this.processDetailsTag(line, fragment, 'summary');
                return;
            }

            if (line.trim() === '</details>' || line.trim() === '</summary>') {
                // These closing tags are handled by the opening tag processor
                return;
            }

            // Handle table rows - collect all table-related lines
            if (line.includes('|')) {
                // Initialize pending table rows if not exists
                fragment._pendingTableRows = fragment._pendingTableRows || [];
                
                // Add line to pending rows (including separator lines for now)
                fragment._pendingTableRows.push(line);
                return;
            }

            // Process any pending table rows when we encounter a non-table line
            if (fragment._pendingTableRows && fragment._pendingTableRows.length > 0) {
                this.processCompleteTable(fragment._pendingTableRows, fragment);
                fragment._pendingTableRows = [];
            }

            // Handle headers
            if (line.startsWith('#')) {
                this.processHeader(line, fragment);
                return;
            }

            // Handle horizontal rules (---, ***, ___)
            if (line.match(/^\s*[-*_]{3,}\s*$/)) {
                this.processHorizontalRule(line, fragment);
                return;
            }

            // Handle list items
            if (line.match(/^\s*[\*\-\+]\s/) || line.match(/^\s*\d+\.\s/)) {
                this.processListItem(line, fragment);
                return;
            }

            // Skip standalone separator lines that might be table separators
            if (line.match(/^\s*[-:|\]s]+\s*$/)) {
                // This is likely a table separator or similar, skip it
                return;
            }

            // Process regular text with inline formatting
            this.processInlineFormatting(line, fragment);
        }

        /**
         * Process complete table from multiple rows
         */
        processCompleteTable(tableRows, fragment) {
            if (!tableRows || tableRows.length === 0) return;

            // Filter out separator rows and empty rows more accurately
            const validRows = tableRows.filter(row => {
                const trimmed = row.trim();
                if (!trimmed || !trimmed.includes('|')) return false;
                
                // Check if it's a separator row (contains only |, -, :, and spaces)
                // More comprehensive pattern to catch all separator variations
                const isSeparator = /^[\]s\|:\-]+\s*$/.test(trimmed) || 
                                   /^\|[\s:\-\|]*\|$/.test(trimmed) ||
                                   /^[\]s]*\|?[\s:\-]+\|?[\s]*$/.test(trimmed);
                
                return !isSeparator;
            });

            if (validRows.length === 0) return;

            // Create table container
            const tableContainer = document.createElement('div');
            tableContainer.className = 'markdown-table';
            tableContainer.style.cssText = `
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                overflow: hidden;
                margin: 12px 0;
                background: #fff;
            `;

            validRows.forEach((row, rowIndex) => {
                // Split by | and trim, but keep empty cells (don't filter them out)
                const allCells = row.split('|').map(cell => cell.trim());
                // Remove first and last empty cells (from leading/trailing |)
                const cells = allCells.slice(
                    allCells[0] === '' ? 1 : 0,
                    allCells[allCells.length - 1] === '' ? -1 : allCells.length
                );
                
                if (cells.length > 0) {
                    const tableRow = document.createElement('div');
                    tableRow.className = 'markdown-table-row';
                    
                    // Header row styling
                    if (rowIndex === 0) {
                        tableRow.style.cssText = `
                            display: flex;
                            background: #f8fafc;
                            border-bottom: 2px solid #e2e8f0;
                            font-weight: 600;
                        `;
                    } else {
                        tableRow.style.cssText = `
                            display: flex;
                            border-bottom: 1px solid #e2e8f0;
                            background: ${rowIndex % 2 === 1 ? '#fff' : '#f9fafb'};
                        `;
                    }

                    cells.forEach((cellText, cellIndex) => {
                        const cell = document.createElement('div');
                        cell.className = 'markdown-table-cell';
                        cell.style.cssText = `
                            flex: 1;
                            padding: 12px 16px;
                            border-right: ${cellIndex < cells.length - 1 ? '1px solid #e2e8f0' : 'none'};
                            min-width: 0;
                            word-wrap: break-word;
                        `;

                        // Process inline formatting in cell
                        this.processInlineFormatting(cellText, cell);
                        tableRow.appendChild(cell);
                    });

                    tableContainer.appendChild(tableRow);
                }
            });

            fragment.appendChild(tableContainer);
        }

        /**
         * Process table row (legacy - disabled)
         */
        processTableRow(line, fragment) {
            // This function is now completely handled by processCompleteTable
            // Disabled to prevent duplicate table creation
            return;
        }

        /**
         * Process header
         */
        processHeader(line, fragment) {
            const level = line.match(/^#+/)[0].length;
            const text = line.replace(/^#+\s*/, '').replace(/\s*#+$/, '');

            const header = document.createElement(`h${Math.min(level, 6)}`);
            header.style.cssText = 'font-weight: bold; margin: 16px 0 8px 0; color: var(--color-text);';

            this.processInlineFormatting(text, header);
            fragment.appendChild(header);
        }

        /**
         * Process horizontal rule (---, ***, ___)
         */
        processHorizontalRule(line, fragment) {
            const hr = document.createElement('hr');
            hr.style.cssText = `
                border: none;
                border-top: 2px solid #e2e8f0;
                margin: 20px 0;
                width: 100%;
            `;
            fragment.appendChild(hr);
        }

        /**
         * Process list item
         */
        processListItem(line, fragment) {
            const listItem = document.createElement('div');
            listItem.style.cssText = 'margin: 4px 0; padding-left: 16px; position: relative;';

            // Add bullet or number
            const bullet = document.createElement('span');
            bullet.style.cssText = 'position: absolute; left: 0; color: var(--color-brand);';

            if (line.match(/^\s*\d+\.\s/)) {
                const number = line.match(/^\s*(\d+)\.\s/)[1];
                bullet.textContent = `${number}.`;
            } else {
                bullet.textContent = '•';
            }

            listItem.appendChild(bullet);

            // Add content
            const content = line.replace(/^\s*(?:[\*\-\+]|\d+\.)\s/, '');
            this.processInlineFormatting(content, listItem);

            fragment.appendChild(listItem);
        }

        /**
         * Process details/summary tags
         */
        processDetailsTag(line, fragment, tagType) {
            if (tagType === 'details') {
                const details = document.createElement('details');
                // CSS styles are handled by the CSS file

                // Store reference for adding content
                fragment._currentDetails = details;
                fragment.appendChild(details);
            } else if (tagType === 'summary') {
                const summary = document.createElement('summary');
                // CSS styles are handled by the CSS file

                // Extract content from summary tag
                const summaryContent = line.replace(/<\/?summary>/g, '').trim();
                this.processInlineFormatting(summaryContent, summary);

                if (fragment._currentDetails) {
                    fragment._currentDetails.appendChild(summary);

                    // Create content container
                    const contentDiv = document.createElement('div');
                    // CSS styles are handled by the CSS file
                    fragment._currentDetails.appendChild(contentDiv);
                    fragment._currentDetailsContent = contentDiv;
                }
            }
        }

        /**
         * Create attachment element
         */
        createAttachmentElement(data, fragment) {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'ai-chatbot-attachment';

            // Create attachment content
            const iconDiv = document.createElement('div');
            iconDiv.className = 'ai-chatbot-attachment-icon';
            iconDiv.textContent = data.icon || '📄';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'ai-chatbot-attachment-content';

            const filenameDiv = document.createElement('div');
            filenameDiv.className = 'ai-chatbot-attachment-filename';
            filenameDiv.textContent = data.filename || 'Untitled';

            const typeDiv = document.createElement('div');
            typeDiv.className = 'ai-chatbot-attachment-type';
            typeDiv.textContent = data.type || 'FILE';

            contentDiv.appendChild(filenameDiv);
            contentDiv.appendChild(typeDiv);

            // Add remove button (optional)
            const removeBtn = document.createElement('button');
            removeBtn.className = 'ai-chatbot-attachment-remove';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove attachment';

            attachmentDiv.appendChild(iconDiv);
            attachmentDiv.appendChild(contentDiv);
            attachmentDiv.appendChild(removeBtn);

            // Store attachment data for potential use
            attachmentDiv.dataset.url = data.url || '';
            attachmentDiv.dataset.content = data.content || '';

            fragment.appendChild(attachmentDiv);
        }

        /**
         * Process attachment tags (deprecated - replaced by createAttachmentElement)
         */
        processAttachmentTag(line, fragment, tagType) {
            // This function is kept for compatibility but not used
            // Attachment processing is now handled in formatBotMessage
        }

        /**
         * Process inline formatting (bold, italic, code, links)
         */
        processInlineFormatting(text, container) {
            const linkRegex = /(https?:\/\/[^\s"'<>`]+)/g;
            const boldRegex = /\*\*(.*?)\*\*/g;
            const italicRegex = /\*(.*?)\*/g;
            const codeRegex = /`([^`]+)`/g;

            let lastIndex = 0;
            const matches = [];

            // Collect all matches with their positions
            let match;

            // Links
            while ((match = linkRegex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: linkRegex.lastIndex,
                    type: 'link',
                    content: match[0],
                    text: match[0]
                });
            }

            // Bold
            boldRegex.lastIndex = 0;
            while ((match = boldRegex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: boldRegex.lastIndex,
                    type: 'bold',
                    content: match[0],
                    text: match[1]
                });
            }

            // Code (process before italic to avoid conflicts)
            codeRegex.lastIndex = 0;
            while ((match = codeRegex.exec(text)) !== null) {
                matches.push({
                    start: match.index,
                    end: codeRegex.lastIndex,
                    type: 'code',
                    content: match[0],
                    text: match[1]
                });
            }

            // Italic (but not if it's part of bold)
            italicRegex.lastIndex = 0;
            while ((match = italicRegex.exec(text)) !== null) {
                // Skip if this is part of a bold pattern
                const isBold = text.substring(Math.max(0, match.index - 1), match.index + match[0].length + 1).includes('**');
                if (!isBold) {
                    matches.push({
                        start: match.index,
                        end: italicRegex.lastIndex,
                        type: 'italic',
                        content: match[0],
                        text: match[1]
                    });
                }
            }

            // Sort matches by position
            matches.sort((a, b) => a.start - b.start);

            // Remove overlapping matches (keep the first one)
            const filteredMatches = [];
            let lastEnd = 0;

            matches.forEach(match => {
                if (match.start >= lastEnd) {
                    filteredMatches.push(match);
                    lastEnd = match.end;
                }
            });

            // Process text with formatting
            lastIndex = 0;
            filteredMatches.forEach(match => {
                // Add text before the match
                if (match.start > lastIndex) {
                    container.appendChild(document.createTextNode(text.substring(lastIndex, match.start)));
                }

                // Add formatted element
                let element;
                switch (match.type) {
                    case 'link':
                        element = document.createElement('a');
                        element.href = match.text;
                        element.target = '_blank';
                        element.rel = 'noopener noreferrer';
                        element.className = 'external-link';
                        element.textContent = match.text;
                        break;

                    case 'bold':
                        element = document.createElement('strong');
                        element.textContent = match.text;
                        break;

                    case 'italic':
                        element = document.createElement('em');
                        element.textContent = match.text;
                        break;

                    case 'code':
                        element = document.createElement('code');
                        element.style.cssText = 'background: var(--bg-gray); padding: 2px 4px; border-radius: 3px; font-family: monospace;';
                        element.textContent = match.text;
                        break;
                }

                container.appendChild(element);
                lastIndex = match.end;
            });

            // Add remaining text
            if (lastIndex < text.length) {
                container.appendChild(document.createTextNode(text.substring(lastIndex)));
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
            // Keep the icon image, don't change the avatar content

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
         * Update selected category display in header
         */
        updateSelectedCategoryDisplay(category) {
            const selectedCategorySpan = this.sidebar.querySelector('.ai-chatbot-selected-category');

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

                // Clear existing content safely
                welcomeMessage.textContent = '';

                // Create content elements safely
                const contentDiv = document.createElement('div');
                contentDiv.textContent = messageContent;

                const timeDiv = document.createElement('div');
                timeDiv.className = 'ai-chatbot-message-time';
                timeDiv.textContent = 'Just now';

                welcomeMessage.appendChild(contentDiv);
                welcomeMessage.appendChild(timeDiv);
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

        /**
         * Set HTML button visibility
         */
        setHtmlButtonVisibility(visible) {
            if (this.htmlButton) {
                if (visible) {
                    this.htmlButton.style.display = 'flex';
                    console.log('[AI Chatbot] HTML button shown');
                } else {
                    this.htmlButton.style.display = 'none';
                    console.log('[AI Chatbot] HTML button hidden');
                }
            }
        }

        /**
         * Start resizing the sidebar
         */
        startResize(e) {
            e.preventDefault();
            this.isResizing = true;
            this.startX = e.clientX;
            this.startWidth = this.sidebar.offsetWidth;
            
            console.log('[AI Chatbot] Start resize:', {
                startX: this.startX,
                startWidth: this.startWidth
            });
            
            // Add resizing class for visual feedback
            this.resizeHandle.classList.add('resizing');
            this.sidebar.classList.add('resizing');
            document.body.classList.add('ai-chatbot-resizing');
            
            // Prevent text selection during resize
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        }

        /**
         * Handle resize movement
         */
        handleResize(e) {
            if (!this.isResizing) return;
            
            e.preventDefault();
            
            // Calculate new width (resize from left edge, so subtract movement)
            const deltaX = this.startX - e.clientX;
            const newWidth = Math.max(300, Math.min(800, this.startWidth + deltaX));
            
            console.log('[AI Chatbot] Resizing:', {
                startX: this.startX,
                clientX: e.clientX,
                deltaX: deltaX,
                startWidth: this.startWidth,
                newWidth: newWidth
            });
            
            // Update sidebar width with !important
            this.sidebar.style.setProperty('width', `${newWidth}px`, 'important');
            
            // Update body margin if sidebar is open
            if (this.isOpen) {
                document.body.style.setProperty('margin-right', `${newWidth}px`, 'important');
            }
        }

        /**
         * Stop resizing the sidebar
         */
        stopResize(e) {
            if (!this.isResizing) return;
            
            this.isResizing = false;
            
            // Remove resizing classes
            this.resizeHandle.classList.remove('resizing');
            this.sidebar.classList.remove('resizing');
            document.body.classList.remove('ai-chatbot-resizing');
            
            // Restore normal cursor and text selection
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            
            // Save the new width to settings
            const newWidth = this.sidebar.offsetWidth;
            this.saveSidebarWidth(newWidth);
            
            console.log('[AI Chatbot] Sidebar resized to:', newWidth + 'px');
        }

        /**
         * Save sidebar width to settings
         */
        async saveSidebarWidth(width) {
            try {
                const settings = await this.loadSettingsFromStorage();
                settings.sidebarWidth = width;
                
                chrome.runtime.sendMessage({
                    action: 'saveSettings',
                    data: settings
                });
            } catch (error) {
                console.error('[AI Chatbot] Failed to save sidebar width:', error);
            }
        }

        /**
         * Load settings from storage (helper method)
         */
        async loadSettingsFromStorage() {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
                    if (response && response.success) {
                        resolve(response.data);
                    } else {
                        resolve({
                            webhookUrl: '',
                            timeout: 30,
                            saveHistory: true,
                            sidebarWidth: 400
                        });
                    }
                });
            });
        }

        /**
         * Add current page HTML to chat
         */
        async addPageHtml() {
            try {
                // Get page HTML content
                const pageHtml = this.getPageHtml();
                const pageTitle = document.title;
                const pageUrl = window.location.href;

                // Create attachment data
                const attachmentData = {
                    icon: '🌐',
                    filename: pageTitle,
                    type: 'HTML',
                    url: pageUrl,
                    content: pageHtml
                };

                // Add attachment to the attachments area
                this.addAttachmentToInput(attachmentData);

                // Clear input and focus for user question
                this.messageInput.value = '';
                this.messageInput.placeholder = 'Ask a question about this page...';
                this.handleInputChange();
                this.messageInput.focus();

                // Show success feedback
                console.log('[AI Chatbot] Page HTML attached successfully:', {
                    title: pageTitle,
                    contentLength: pageHtml.length,
                    url: pageUrl
                });

            } catch (error) {
                console.error('[AI Chatbot] Failed to add page HTML:', error);
                this.addMessage(`Error getting page HTML: ${error.message}`, 'bot', true);
            }
        }

        /**
         * Add attachment to input area
         */
        addAttachmentToInput(attachmentData) {
            // Create attachment element
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'ai-chatbot-input-attachment';

            // Create attachment content
            const iconDiv = document.createElement('div');
            iconDiv.className = 'ai-chatbot-input-attachment-icon';
            iconDiv.textContent = attachmentData.icon || '📄';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'ai-chatbot-input-attachment-content';

            const filenameDiv = document.createElement('div');
            filenameDiv.className = 'ai-chatbot-input-attachment-filename';
            filenameDiv.textContent = attachmentData.filename || 'Untitled';

            const typeDiv = document.createElement('div');
            typeDiv.className = 'ai-chatbot-input-attachment-type';
            typeDiv.textContent = attachmentData.type || 'FILE';

            contentDiv.appendChild(filenameDiv);
            contentDiv.appendChild(typeDiv);

            // Add remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'ai-chatbot-input-attachment-remove';
            removeBtn.innerHTML = '×';
            removeBtn.title = 'Remove attachment';
            removeBtn.addEventListener('click', () => {
                this.removeAttachmentFromInput(attachmentDiv);
            });

            attachmentDiv.appendChild(iconDiv);
            attachmentDiv.appendChild(contentDiv);
            attachmentDiv.appendChild(removeBtn);

            // Store attachment data
            attachmentDiv.dataset.url = attachmentData.url || '';
            attachmentDiv.dataset.content = attachmentData.content || '';
            attachmentDiv.dataset.filename = attachmentData.filename || '';
            attachmentDiv.dataset.type = attachmentData.type || '';
            attachmentDiv.dataset.icon = attachmentData.icon || '';

            // Add to attachments area
            this.attachmentsArea.appendChild(attachmentDiv);
            this.attachmentsArea.style.display = 'block';

            // Update input state after adding attachment
            this.handleInputChange();
        }

        /**
         * Remove attachment from input area
         */
        removeAttachmentFromInput(attachmentElement) {
            attachmentElement.remove();

            // Hide attachments area if no attachments left
            if (this.attachmentsArea.children.length === 0) {
                this.attachmentsArea.style.display = 'none';
                this.messageInput.placeholder = 'Type your message...';
            }

            // Update input state after removing attachment
            this.handleInputChange();
        }

        /**
         * Clear all attachments from input area
         */
        clearAttachments() {
            this.attachmentsArea.innerHTML = '';
            this.attachmentsArea.style.display = 'none';
        }



        /**
         * Get cleaned HTML content from current page
         */
        getPageHtml() {
            try {
                let extractedContent = '';

                // Strategy 1: Try to find main content containers
                const mainContentSelectors = [
                    'main', 'article', '[role="main"]', '.content', '.main-content',
                    '#content', '#main', '.post-content', '.entry-content'
                ];

                for (const selector of mainContentSelectors) {
                    const element = document.querySelector(selector);
                    if (element && this.isVisible(element)) {
                        extractedContent = this.extractTextContent(element);
                        if (extractedContent && extractedContent.length > 200) {
                            break;
                        }
                    }
                }

                // Strategy 2: If main content is insufficient, try comprehensive extraction from body
                if (!extractedContent || extractedContent.length < 200) {
                    extractedContent = this.extractTextContent(document.body);
                }

                // Strategy 3: If still insufficient, extract from meta tags and structured data
                if (!extractedContent || extractedContent.length < 100) {
                    extractedContent = this.extractFromMetaAndStructuredData();
                }

                // Final cleanup
                extractedContent = extractedContent
                    .replace(/\s+/g, ' ')
                    .replace(/\n\s*\n/g, '\n\n')
                    .trim();

                // Limit the content length
                const maxLength = 3500;
                if (extractedContent.length > maxLength) {
                    extractedContent = extractedContent.substring(0, maxLength) + '\n... (content truncated)';
                }

                return extractedContent || 'No meaningful content found on this page.';

            } catch (error) {
                console.error('[AI Chatbot] Error getting page HTML:', error);
                return 'Error: Could not extract page content.';
            }
        }

        /**
         * Extract content from meta tags and structured data
         */
        extractFromMetaAndStructuredData() {
            const contentParts = [];

            // Extract from meta tags
            const title = document.querySelector('title')?.textContent?.trim();
            if (title) contentParts.push(`Title: ${title}`);

            const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim();
            if (description) contentParts.push(`Description: ${description}`);

            const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim();
            if (ogTitle && ogTitle !== title) contentParts.push(`OG Title: ${ogTitle}`);

            const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim();
            if (ogDescription && ogDescription !== description) contentParts.push(`OG Description: ${ogDescription}`);

            // Extract from JSON-LD structured data
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            jsonLdScripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    if (data.name) contentParts.push(`Product Name: ${data.name}`);
                    if (data.description) contentParts.push(`Product Description: ${data.description}`);
                    if (data.brand?.name) contentParts.push(`Brand: ${data.brand.name}`);
                    if (data.offers?.price) contentParts.push(`Price: ${data.offers.price}`);
                    if (data.aggregateRating?.ratingValue) {
                        contentParts.push(`Rating: ${data.aggregateRating.ratingValue} (${data.aggregateRating.reviewCount} reviews)`);
                    }
                } catch (e) {
                    // Ignore JSON parsing errors
                }
            });

            return contentParts.join('\n');
        }

        /**
         * Check if text is likely non-content (navigation, ads, etc.)
         */
        isLikelyNonContent(text) {
            const nonContentPatterns = [
                /^(home|about|contact|login|register|subscribe|menu|navigation|settings|dashboard|profile|logout)$/i,
                /^(share|like|follow|tweet|facebook|twitter|instagram|pinterest|linkedin)$/i,
                /^(advertisement|sponsored|ad|cookie|privacy policy|terms of service|all rights reserved)$/i,
                /^(loading|error|404|not found|oops|uh oh)$/i,
                /^(이전|다음|닫기|열기|더보기|접기|펼치기|메뉴|로그인|회원가입|고객센터)$/i,
                /^(오늘 하루|하루|열지 않음|보지 않음|다시 보지 않기)$/i,
                /^[\]d\s\-\+\*\\/=\(\)\[\]\{\}<>.,:;!@#$%^&_?~`]+$/,
                /^[^\w\s]*$/,
                /^(click here|read more|learn more|see more|get started|try now|buy now|shop now)$/i,
                /^(blind|sr-only|screen-reader|visually-hidden|hidden)$/i, // Screen reader text
                /^\s*$/,
                /^(새창|새창 열림|팝업|레이어|모달|알림|안내)$/i,
                /^(accept|decline|close|ok|cancel|yes|no|got it)$/i
            ];

            const trimmedText = text.trim();

            // Skip very short texts that are likely UI elements
            if (trimmedText.length < 5) return true;

            // Skip texts that are mostly punctuation
            const alphanumericCount = (trimmedText.match(/[a-zA-Z0-9가-힣]/g) || []).length;
            if (alphanumericCount / trimmedText.length < 0.6) return true;

            return nonContentPatterns.some(pattern => pattern.test(trimmedText));
        }

        /**
         * Check if an element is visible to the user
         */
        isVisible(elem) {
            if (!(elem instanceof Element)) return false;
            const style = getComputedStyle(elem);
            if (style.display === 'none') return false;
            if (style.visibility !== 'visible') return false;
            if (style.opacity < 0.1) return false;
            if (elem.offsetWidth + elem.offsetHeight + elem.getBoundingClientRect().height +
                elem.getBoundingClientRect().width === 0) {
                return false;
            }
            const elemCenter = {
                x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
                y: elem.getBoundingClientRect().top + elem.offsetHeight / 2
            };
            if (elemCenter.x < 0) return false;
            if (elemCenter.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
            if (elemCenter.y < 0) return false;
            if (elemCenter.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
            let pointContainer = document.elementFromPoint(elemCenter.x, elemCenter.y);
            do {
                if (pointContainer === elem) return true;
            } while (pointContainer = pointContainer.parentNode);
            return false;
        }

        /**
         * Extract meaningful text content from an element
         */
        extractTextContent(element) {
            const clone = element.cloneNode(true);

            // Remove unwanted elements
            const unwantedSelectors = [
                'script', 'style', 'nav', 'header', 'footer', 'aside',
                '.advertisement', '.ads', '.sidebar', '.menu', '.popup', '.modal',
                '#ai-chatbot-sidebar', '#ai-chatbot-toggle',
                '.social-share', '.comments', '.related-posts', '.newsletter',
                'button', 'input', 'form', '.btn', '.button', '[role="button"]',
                '[role="dialog"]', '[role="alert"]', '[role="banner"]', '[role="contentinfo"]',
                '[aria-hidden="true"]', '.sr-only', '.visually-hidden',
                '#cookie-consent', '.cookie-banner', '#privacy-popup'
            ];

            unwantedSelectors.forEach(selector => {
                clone.querySelectorAll(selector).forEach(el => el.remove());
            });

            const processTable = (tableNode) => {
                let tableContent = '\n';
                const rows = tableNode.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('th, td');
                    let rowContent = '| ';
                    cells.forEach(cell => {
                        rowContent += getText(cell).replace(/\s+/g, ' ').trim() + ' | ';
                    });
                    tableContent += rowContent + '\n';
                });
                return tableContent;
            };

            // Function to recursively extract text
            const getText = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent.trim();
                    return this.isLikelyNonContent(text) ? '' : text;
                }
                if (node.nodeType === Node.ELEMENT_NODE && this.isVisible(node)) {
                    if (node.tagName === 'TABLE') {
                        return processTable(node);
                    }

                    let content = '';
                    const isBlock = window.getComputedStyle(node).display === 'block';
                    if (isBlock) content += '\n';

                    for (const child of node.childNodes) {
                        content += getText(child) + ' '; // Add space between child nodes
                    }

                    if (isBlock) content += '\n';
                    return content;
                }
                return '';
            };

            return getText(clone).replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
        }

        /**
         * Sanitize HTML content to prevent XSS attacks
         */
        sanitizeHtml(content) {
            // Try multiple ways to access DOMPurify
            let DOMPurify = null;
            
            // Check for global DOMPurify
            if (typeof window !== 'undefined' && window.DOMPurify) {
                DOMPurify = window.DOMPurify;
            } else if (typeof globalThis !== 'undefined' && globalThis.DOMPurify) {
                DOMPurify = globalThis.DOMPurify;
            } else if (typeof self !== 'undefined' && self.DOMPurify) {
                DOMPurify = self.DOMPurify;
            }

            // If DOMPurify is available, use it
            if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
                try {
                    return DOMPurify.sanitize(content, {
                        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'details', 'summary'],
                        ALLOWED_ATTR: ['href', 'target', 'rel']
                    });
                } catch (error) {
                    console.warn('[AI Chatbot] DOMPurify sanitization failed:', error);
                    // Fall through to manual sanitization
                }
            }

            // Fallback: basic HTML sanitization
            if (typeof content !== 'string') {
                return '';
            }

            // Remove dangerous tags
            content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            content = content.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
            content = content.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
            content = content.replace(/<embed[^>]*>/gi, '');
            content = content.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
            content = content.replace(/<input[^>]*>/gi, '');
            content = content.replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '');

            // Remove dangerous attributes
            content = content.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, ''); // onclick, onload, etc.
            content = content.replace(/\sjavascript\s*:/gi, '');
            content = content.replace(/\svbscript\s*:/gi, '');
            content = content.replace(/\sdata\s*:/gi, '');

            return content;
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
                    
                    // Clear messages container except for welcome message
                    const welcomeMessage = this.messagesContainer.querySelector('.ai-chatbot-welcome');
                    this.messagesContainer.innerHTML = '';
                    
                    // Re-add welcome message
                    if (welcomeMessage) {
                        this.messagesContainer.appendChild(welcomeMessage);
                    } else {
                        // Create default welcome message if not exists
                        const defaultWelcome = document.createElement('div');
                        defaultWelcome.className = 'ai-chatbot-welcome';
                        defaultWelcome.innerHTML = `
                            <div class="ai-chatbot-message bot">
                                👋 Hello! I'm your General AI assistant. How can I help you today?
                                <div class="ai-chatbot-message-time">Just now</div>
                            </div>
                        `;
                        this.messagesContainer.appendChild(defaultWelcome);
                    }

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
        } else if (request.action === 'setHtmlButtonVisibility') {
            // Set HTML button visibility
            if (window.chatbotSidebar) {
                window.chatbotSidebar.setHtmlButtonVisibility(request.visible);
            } else {
                // Create new instance if it doesn't exist
                window.chatbotSidebar = new ChatbotSidebar();
                setTimeout(() => {
                    window.chatbotSidebar.setHtmlButtonVisibility(request.visible);
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
        window.ChatBotSidebar = ChatbotSidebar;
    }
})();