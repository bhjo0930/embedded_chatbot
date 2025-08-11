# AI Chatbot Chrome Extension v0.9.2

A modern Chrome extension that integrates with n8n webhooks to provide AI-powered chatbot functionality directly in your browser.

<img width="1486" height="815" alt="스크린샷 2025-08-06 오전 11 27 59" src="https://github.com/user-attachments/assets/ac7067eb-18af-46dc-8bae-e23cb335839e" />


## 🚀 Features

- **Dual Backend Support**: Choose between n8n webhook or Ollama local instance
- **Multi-Agent Category Selection**: Choose from 8 specialized AI agents (General, HR, IT, Data, Finance, Marketing, Legal, Security)
- **Real-time Chat Interface**: Modern, responsive chat UI with typing indicators
- **n8n Webhook Integration**: Seamless connection to your n8n automation workflows with category routing
- **Ollama Local Integration**: Direct connection to local Ollama instance with model selection
- **Message Persistence**: Local storage of chat history with cleanup options
- **Connection Management**: Auto-retry, timeout handling, and status monitoring
- **Advanced Settings**: Comprehensive configuration panel with theme support
- **Privacy Focused**: All data stored locally, no external tracking
- **Extensible Design**: Modular architecture for easy customization

## 📋 Requirements

- **Browser**: Chrome (Manifest V3 compatible)
- **n8n Instance**: Running n8n workflow with webhook endpoint
- **AI Integration**: Your n8n workflow should connect to an AI service (OpenAI, Anthropic, etc.)

## 🛠️ Installation

### Development Installation

1. **Clone or Download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension directory
5. **Pin the extension** to your toolbar for easy access
6. **Test Installation**: Open `test-extension.html` in your browser to verify

### Production Installation

*Coming soon to Chrome Web Store*

### 🚨 Troubleshooting Installation Issues

If you encounter "Service worker registration failed" error:

1. **Check File Structure**: Ensure all files are in correct directories
2. **Reload Extension**: Go to `chrome://extensions/` and click reload button
3. **Clear Cache**: Restart Chrome completely
4. **Check Console**: Open DevTools and check for specific error messages

**Common Issues:**
- ❌ `importScripts` errors → Fixed in latest version
- ❌ Missing icon files → Ensure `icons/` directory exists
- ❌ Content script errors → Check `content/` directory

## ⚙️ Configuration

### 1. n8n Webhook Setup

Your n8n webhook should:

**Accept POST requests** with this structure:
```json
{
  "message": "User's message text",
  "category": "HR",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "sessionId": "session_12345",
  "userId": "chrome-extension-user",
  "metadata": {
    "source": "chrome-extension",
    "version": "1.0.0",
    "userAgent": "Mozilla/5.0...",
    "agentType": "HR"
  }
}
```

**Return responses** in this format:
```json
{
  "message": "AI assistant response",
  "success": true
}
```

### 2. Extension Configuration

1. **Click the extension icon** in your browser toolbar
2. **Click the settings button** (⚙️) in the chat header
3. **Enter your n8n webhook URL**
4. **Test the connection** using the "Test Connection" button
5. **Configure additional settings** as needed

#### Settings Options

- **Webhook URL**: Your n8n webhook endpoint (required)
- **Request Timeout**: Maximum wait time for responses (5-600 seconds)
- **Save Chat History**: Enable/disable local message storage
- **Theme**: Light, dark, or auto (system) theme
- **Auto Scroll**: Automatically scroll to new messages

## 🎯 Usage

### Category Selection

1. **Choose your AI agent** from the category selector:
   - 🤖 **General** - General purpose AI assistant
   - 👥 **HR** - Human Resources specialist
   - 💻 **IT** - IT Support and technical help
   - 📊 **Data** - Data analysis and insights
   - 💰 **Finance** - Financial expertise
   - 📢 **Marketing** - Marketing and campaigns
   - ⚖️ **Legal** - Legal advice and compliance
   - 🔒 **Security** - Cybersecurity and security specialist

2. **Toggle categories** using the dropdown arrow
3. **Selected category is saved** and restored on next use

### Basic Chat

1. **Click the extension icon** to open the chat popup
2. **Select your preferred AI agent** from the category selector
3. **Type your message** in the input field
4. **Press Enter or click send** to submit
5. **View AI responses** in the chat interface

### Advanced Features

- **Clear Chat**: Use the trash icon to clear chat history
- **Export History**: Download chat history as JSON (via options page)
- **Keyboard Shortcuts**: 
  - `Enter`: Send message
  - `Shift + Enter`: New line
  - `Escape`: Close settings modal

## 🏗️ Architecture

### Core Components

```
chrome-extension-ai-chatbot/
├── manifest.json              # Extension configuration
├── popup/                     # Main chat interface
│   ├── popup.html            # Chat UI structure
│   ├── popup.css             # Chat styling
│   └── popup.js              # Chat functionality
├── background/               # Service worker
│   └── background.js         # Background processes
├── options/                  # Settings page
│   ├── options.html          # Settings UI
│   ├── options.css           # Settings styling
│   └── options.js            # Settings functionality
├── lib/                      # Shared utilities
│   ├── api-client.js         # n8n webhook client
│   ├── storage.js            # Data persistence
│   └── utils.js              # Helper functions
└── content/                  # Optional page integration
    └── content.js            # Content script
```

### Data Flow

```
User Input → Popup UI → Background Script → n8n Webhook → AI Service
                    ↓
Local Storage ← Message History ← API Response ← AI Response
```

## 🔧 Development

### Project Structure

- **`manifest.json`**: Chrome extension configuration
- **`popup/`**: Main chat interface components
- **`background/`**: Service worker for API calls and data management
- **`options/`**: Advanced settings page
- **`lib/`**: Shared utilities and helpers
- **`content/`**: Optional content script for page integration

### Key Classes

- **`N8nApiClient`**: Handles webhook communication with retry logic
- **`StorageManager`**: Manages local data persistence and cleanup
- **`ChatbotPopup`**: Main chat interface controller
- **`OptionsPage`**: Advanced settings management

### Adding New Features

1. **API Changes**: Modify `lib/api-client.js`
2. **UI Changes**: Update `popup/` files
3. **Settings**: Extend `options/` files
4. **Storage**: Modify `lib/storage.js`
5. **Background Tasks**: Update `background/background.js`

## 🔒 Privacy & Security

- **Local Storage Only**: All chat data stored locally in browser
- **No External Tracking**: No analytics or tracking services
- **Secure Communication**: HTTPS required for webhook endpoints
- **Data Control**: Users can export/clear data at any time
- **Permission Minimal**: Only requests necessary permissions

## 🐛 Troubleshooting

### Common Issues

**Connection Failed**
- Verify webhook URL is correct and accessible
- Check n8n workflow is active and properly configured
- Ensure webhook accepts POST requests with JSON payload
- Test webhook directly with tools like Postman

**Messages Not Sending**
- Check browser console for error messages
- Verify extension has proper permissions
- Test connection in extension settings
- Check n8n workflow execution logs

**Chat History Missing**
- Ensure "Save Chat History" is enabled in settings
- Check if storage quota is exceeded
- Verify browser local storage is enabled

### Debug Mode

Enable debug mode in extension settings for detailed logging:

1. Open extension options page
2. Navigate to "Advanced Settings"
3. Enable "Debug Mode"
4. Check browser console for detailed logs

## 📝 API Reference

### Message Format

The extension sends messages to your n8n webhook in this format:

```typescript
interface WebhookRequest {
  message: string;           // User's message
  category: string;          // Selected AI agent category
  timestamp: string;         // ISO timestamp
  sessionId: string;         // Unique session identifier
  userId: string;           // User identifier
  metadata: {
    source: string;         // Always "chrome-extension"
    version: string;        // Extension version
    userAgent: string;      // Browser user agent
    agentType: string;      // Same as category field
    [key: string]: any;     // Additional metadata
  };
}
```

### Expected Response

Your n8n webhook should respond with:

```typescript
interface WebhookResponse {
  message: string;          // AI response text (required)
  success?: boolean;        // Success status (optional)
  [key: string]: any;      // Additional response data
}
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/new-feature`
3. **Make your changes** with proper documentation
4. **Test thoroughly** across different scenarios
5. **Submit a pull request** with detailed description

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd chrome-extension-ai-chatbot

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load unpacked"
# 4. Select the project directory
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **n8n Community**: For the amazing automation platform
- **Chrome Extensions Team**: For the robust extension APIs
- **Contributors**: Thanks to all who help improve this project

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Questions**: Start a GitHub Discussion
- **Feature Requests**: Use GitHub Issues with enhancement label

---

**Made with ❤️ for the automation community**
