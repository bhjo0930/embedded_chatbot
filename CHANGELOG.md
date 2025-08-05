# Changelog

All notable changes to the AI Chatbot Chrome Extension will be documented in this file.

## [0.7.0] - 2025-01-08

### 🚀 Major Feature: Extension Icon Integration

#### Smart Extension Icon Behavior
- **Extension Icon Click**: Now toggles sidebar on web pages or shows popup on restricted pages
- **Intelligent Routing**: Automatically determines whether to show sidebar or popup based on page type
- **Dynamic Script Injection**: Automatically injects content scripts when needed
- **Fallback Mechanism**: Graceful fallback to popup if sidebar injection fails

#### Enhanced Content Script System
- **Background Communication**: Seamless message passing between background and content scripts
- **Global Instance Management**: Proper singleton pattern for sidebar instances
- **Auto-initialization**: Content scripts initialize automatically on page load
- **Error Recovery**: Robust error handling and recovery mechanisms

#### Improved User Experience
- **Unified Interface**: Consistent experience between popup and sidebar
- **Enhanced Message Formatting**: Full markdown support in both popup and sidebar
- **Category Standardization**: All categories now use uppercase format consistently
- **Smart Page Detection**: Automatic detection of restricted pages (chrome://, extension pages)

### 🔧 Technical Improvements

#### Manifest V3 Enhancements
- **Scripting Permission**: Added `scripting` permission for dynamic content injection
- **Dynamic Popup**: Removed default popup to enable smart icon behavior
- **Content Script Optimization**: Improved content script loading and execution

#### Architecture Updates
- **Message Routing**: Enhanced message passing system between components
- **State Management**: Better state synchronization across popup and sidebar
- **Error Handling**: Comprehensive error handling and logging

#### Code Quality
- **TypeScript-like Patterns**: Better type checking and validation
- **Modern JavaScript**: Updated to use modern JavaScript features
- **Performance Optimization**: Reduced memory footprint and improved responsiveness

### 📱 User Interface

#### Sidebar Enhancements
- **Responsive Design**: Better adaptation to different screen sizes
- **Smooth Animations**: Enhanced open/close animations
- **Visual Consistency**: Matching design language with popup
- **Accessibility**: Improved keyboard navigation and screen reader support

#### Message Display
- **Rich Formatting**: Support for lists, code blocks, headers, and links
- **Line Break Handling**: Proper handling of `\n` and `\\n` characters
- **Typography**: Enhanced readability with better fonts and spacing
- **Color Coding**: Syntax highlighting for code blocks

### 🎯 Usage Scenarios

#### Web Pages
1. Click extension icon → Sidebar toggles
2. Use sidebar for contextual AI assistance
3. Categories automatically sync with popup preferences

#### Restricted Pages
1. Click extension icon → Popup opens
2. Full functionality available in popup
3. Settings and preferences accessible

### 🔄 Migration & Compatibility

#### Automatic Migration
- **Settings Preservation**: All existing settings automatically migrated
- **Category Updates**: Lowercase categories automatically converted to uppercase
- **Backward Compatibility**: Existing workflows continue to work seamlessly

#### Enhanced Features
- **Improved Performance**: Faster loading and response times
- **Better Error Messages**: More informative error handling
- **Enhanced Logging**: Better debugging and troubleshooting support

### 🛠️ Developer Experience

#### Debugging Tools
- **Global Access**: Sidebar instance accessible via `window.chatbotSidebar`
- **Enhanced Logging**: Detailed console logging for troubleshooting
- **Error Reporting**: Comprehensive error reporting and stack traces

#### Code Organization
- **Modular Architecture**: Better separation of concerns
- **Reusable Components**: Shared formatting and utility functions
- **Documentation**: Improved inline documentation and comments

---

## [0.6.0] - 2025-01-08

### 🎨 Enhanced User Experience

#### Message Formatting & Display
- **Enhanced Markdown Support**: Full support for bold (`**text**`), italic (`*text*`), inline code (`` `code` ``), and code blocks (` ```code``` `)
- **Improved Line Breaks**: Proper handling of `\n` and `\\n` characters in AI responses
- **List Support**: Automatic formatting of numbered lists (`1. item`) and bullet lists (`- item`, `* item`)
- **Section Headers**: Support for markdown headers (`#`, `##`, `###`)
- **Auto-link Detection**: Automatic conversion of URLs to clickable links
- **Enhanced Typography**: Better spacing, colors, and visual hierarchy for formatted content

#### Category System Standardization
- **Uppercase Categories**: All categories standardized to uppercase format (GENERAL, HR, IT, DATA, FINANCE, MARKETING, LEGAL, SUPPORT)
- **Consistent API**: Unified category handling across all backends and components
- **Updated Documentation**: All examples and documentation updated to reflect uppercase categories

#### Developer Experience
- **Debug Functions**: Added `testMessageFormatting()` function for testing message display
- **Global Access**: Chatbot instance accessible via `window.chatbot` for debugging
- **Enhanced CSS**: Comprehensive styling for all message formatting elements

### 🔧 Technical Improvements

#### Code Quality
- **Deprecated Method Updates**: Replaced all `substr()` calls with `substring()` for modern JavaScript compliance
- **Enhanced Error Handling**: Better error messages and user feedback
- **Performance Optimizations**: Improved message rendering and formatting performance

#### UI/UX Enhancements
- **Visual Consistency**: Improved visual consistency across all formatted elements
- **Better Readability**: Enhanced contrast and spacing for better text readability
- **Responsive Design**: Improved formatting display on different screen sizes

### 📋 Updated Components

#### Frontend
- **popup/popup.js**: Enhanced `formatBotMessage()` function with comprehensive markdown support
- **popup/popup.css**: Added extensive styling for formatted message elements
- **popup/popup.html**: Updated category buttons with uppercase values

#### Backend
- **background/background.js**: Updated system prompts and category handling
- **lib/ollama-client.js**: Standardized category processing
- **lib/unified-api-client.js**: Consistent category handling across backends

#### Configuration
- **All config files**: Updated to use uppercase categories
- **Test files**: Updated test cases and examples
- **Documentation**: Comprehensive updates to reflect new category system

### 🎯 Supported Message Formats

```markdown
**Bold text** and *italic text*
`inline code` and code blocks
1. Numbered lists
- Bullet lists
### Section headers
https://auto-linked-urls.com
```

### 🚀 Migration from v0.5.0

- **Automatic**: Categories are automatically converted to uppercase
- **Backward Compatible**: Old lowercase categories still work
- **Enhanced Display**: Existing messages benefit from improved formatting

---

## [0.5.0] - 2025-01-08

### 🎉 Major Features Added

#### Dual Backend Support
- **n8n Webhook Integration**: Connect to n8n workflows for AI processing
- **Ollama Local Support**: Run AI models locally with Ollama
- **Backend Switching**: Easy toggle between n8n and Ollama in settings

#### Advanced Settings & Configuration
- **Comprehensive Settings Page**: Full-featured options page with organized sections
- **Connection Testing**: Built-in connection test for both backends
- **Custom Headers**: Support for custom HTTP headers in n8n requests
- **Temperature Control**: Adjustable creativity settings for Ollama models
- **Timeout & Retry Configuration**: Customizable request timeouts and retry logic

#### Enhanced User Experience
- **Theme Support**: Light, dark, and auto themes
- **Chat History**: Persistent conversation history with export/import
- **Auto-scroll**: Automatic scrolling to new messages
- **Notifications**: Browser notifications for new messages
- **Session Management**: Intelligent session handling with 24-hour expiry

#### Performance & Debugging
- **Debug Mode**: Detailed logging and performance monitoring
- **Performance Analytics**: API call tracking, memory usage monitoring
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **CORS Support**: Proper CORS configuration for Ollama integration

### 🔧 Technical Improvements

#### Response Processing
- **Smart Response Parsing**: Automatic removal of AI "thinking" patterns
- **Multi-language Support**: Works with both English and Korean responses
- **Content Cleaning**: Removes meta-commentary and analysis artifacts

#### Data Management
- **Local Storage**: Efficient browser storage management
- **Data Export**: Export chat history as JSON
- **Data Cleanup**: Automatic cleanup of old messages (30+ days)
- **Storage Statistics**: Real-time storage usage monitoring

#### Security & Validation
- **Input Validation**: Comprehensive validation for all user inputs
- **URL Validation**: Proper URL format checking for webhook/Ollama endpoints
- **JSON Validation**: Safe JSON parsing with error handling
- **Settings Validation**: Type checking and range validation for all settings

### 🎨 User Interface
- **Modern Design**: Clean, professional interface with smooth animations
- **Responsive Layout**: Works on different screen sizes
- **Accessibility**: Proper contrast ratios and keyboard navigation
- **Visual Feedback**: Loading states, success/error indicators
- **Organized Settings**: Grouped settings with clear descriptions

### 🔌 Integration Features
- **Multiple AI Categories**: Support for HR, IT, Data, Finance, Marketing, Legal, Support agents
- **System Prompts**: Category-specific system prompts for better responses
- **Model Selection**: Automatic and manual Ollama model selection
- **Connection Status**: Real-time connection status indicators

### 🛠️ Developer Experience
- **Modular Architecture**: Clean separation of concerns
- **Error Logging**: Comprehensive error logging and debugging
- **Performance Monitoring**: Built-in performance tracking
- **Code Documentation**: Extensive inline documentation

### 📋 Supported Features
- ✅ n8n webhook integration
- ✅ Ollama local AI models
- ✅ Chat history persistence
- ✅ Theme customization
- ✅ Debug mode with performance monitoring
- ✅ Multi-language response processing
- ✅ Connection testing and validation
- ✅ Data export/import
- ✅ Custom headers support
- ✅ Session management
- ✅ Auto-scroll and notifications
- ✅ Comprehensive settings management

### 🔧 Configuration Options
- Backend selection (n8n/Ollama)
- Webhook URL configuration
- Ollama URL and model selection
- Temperature and creativity settings
- Request timeout and retry settings
- Theme preferences
- Chat history settings
- Debug mode toggle
- Custom HTTP headers
- Session duration settings

### 📦 Installation Requirements
- Chrome browser (Manifest V3 support)
- For n8n: Active n8n instance with webhook endpoint
- For Ollama: Local Ollama installation with CORS configuration

### 🚀 Performance
- Fast response times with optimized API calls
- Efficient memory usage with automatic cleanup
- Responsive UI with smooth animations
- Background processing for better user experience

---

## Development Notes

This version represents a significant milestone in the development of the AI Chatbot Chrome Extension, providing a solid foundation for both n8n and Ollama integrations with comprehensive settings management and user experience enhancements.

### Next Version Goals
- Enhanced AI model management
- Advanced conversation features
- Integration with more AI backends
- Mobile responsiveness improvements
- Advanced analytics and insights