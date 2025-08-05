/**
 * Message Virtualizer
 * 대량의 메시지를 효율적으로 렌더링하기 위한 가상화 시스템
 */
class MessageVirtualizer {
    constructor(container, itemHeight = 80) {
        this.container = container;
        this.itemHeight = itemHeight;
        this.visibleItems = [];
        this.allMessages = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.startIndex = 0;
        this.endIndex = 0;
        
        this.init();
    }

    init() {
        this.containerHeight = this.container.clientHeight;
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Resize observer for responsive design
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.containerHeight = this.container.clientHeight;
                this.updateVisibleItems();
            });
            this.resizeObserver.observe(this.container);
        }
    }

    setMessages(messages) {
        this.allMessages = messages;
        this.updateVisibleItems();
    }

    addMessage(message) {
        this.allMessages.push(message);
        this.updateVisibleItems();
        this.scrollToBottom();
    }

    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.updateVisibleItems();
    }

    updateVisibleItems() {
        const totalHeight = this.allMessages.length * this.itemHeight;
        const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
        const buffer = 5; // 버퍼 아이템 수

        this.startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - buffer);
        this.endIndex = Math.min(this.allMessages.length, this.startIndex + visibleCount + buffer * 2);

        this.render();
    }

    render() {
        // 기존 메시지 제거
        this.container.innerHTML = '';

        // 상단 스페이서
        if (this.startIndex > 0) {
            const topSpacer = document.createElement('div');
            topSpacer.style.height = `${this.startIndex * this.itemHeight}px`;
            this.container.appendChild(topSpacer);
        }

        // 보이는 메시지들 렌더링
        for (let i = this.startIndex; i < this.endIndex; i++) {
            const message = this.allMessages[i];
            if (message) {
                const messageElement = this.createMessageElement(message);
                this.container.appendChild(messageElement);
            }
        }

        // 하단 스페이서
        if (this.endIndex < this.allMessages.length) {
            const bottomSpacer = document.createElement('div');
            bottomSpacer.style.height = `${(this.allMessages.length - this.endIndex) * this.itemHeight}px`;
            this.container.appendChild(bottomSpacer);
        }
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-bubble ${message.type}-message${message.isError ? ' error-message' : ''}`;
        messageDiv.style.minHeight = `${this.itemHeight}px`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = message.formattedContent || message.content;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.formatTime(new Date(message.timestamp));
        
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        return messageDiv;
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.container.scrollTop = this.container.scrollHeight;
        });
    }

    formatTime(date) {
        return date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.container.removeEventListener('scroll', this.handleScroll);
    }
}

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MessageVirtualizer;
} else {
    window.MessageVirtualizer = MessageVirtualizer;
}