# Chrome Extension AI Chatbot - Project Structure

```
chrome-extension-ai-chatbot/
├── manifest.json                 # Extension manifest (V3)
├── icons/                       # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                       # Popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/                  # Service worker
│   └── background.js
├── content/                     # Content scripts (optional)
│   └── content.js
├── options/                     # Settings page
│   ├── options.html
│   ├── options.css
│   └── options.js
├── lib/                        # Shared utilities
│   ├── api-client.js
│   ├── storage.js
│   └── utils.js
└── assets/                     # Static assets
    ├── styles/
    └── images/
```

## Component Architecture

### Core Components
1. **ChatInterface** - Main chat UI component
2. **MessageBubble** - Individual message display
3. **InputField** - Message input with send button
4. **SettingsPanel** - Configuration interface
5. **HistoryManager** - Chat history management

### Service Layer
1. **WebhookClient** - n8n webhook communication
2. **StorageManager** - Local data persistence
3. **MessageQueue** - Message processing queue
4. **EventBus** - Component communication

### Data Models
1. **Message** - Chat message structure
2. **Conversation** - Chat session container
3. **Settings** - User configuration
4. **ApiResponse** - n8n response format