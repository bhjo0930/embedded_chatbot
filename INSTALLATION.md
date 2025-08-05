# Installation Guide

Complete setup guide for the AI Chatbot Chrome Extension with n8n integration.

## 📋 Prerequisites

Before installing the extension, ensure you have:

1. **Google Chrome Browser** (latest version recommended)
2. **n8n Instance** (self-hosted or cloud)
3. **AI Service Access** (OpenAI, Anthropic, etc.)
4. **Basic n8n Knowledge** (workflow creation)

---

## 🚀 Quick Start

### Step 1: Install Chrome Extension

#### Option A: Development Installation (Current)

1. **Download the extension files**
   - Clone or download this repository
   - Extract to a folder on your computer

2. **Load into Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the extension folder
   - Pin the extension to your toolbar

#### Option B: Chrome Web Store (Coming Soon)
*The extension will be available on the Chrome Web Store soon*

### Step 2: Set Up n8n Webhook

#### Basic n8n Workflow

Create a new workflow in n8n with these nodes:

```
Webhook → AI Service → Respond to Webhook
```

#### Detailed n8n Configuration

1. **Webhook Node Configuration**
   ```json
   {
     "httpMethod": "POST",
     "path": "chatbot",
     "responseMode": "responseNode"
   }
   ```

2. **AI Service Node** (Example: OpenAI)
   ```json
   {
     "resource": "chat",
     "operation": "create",
     "model": "gpt-3.5-turbo",
     "messages": [
       {
         "role": "user",
         "content": "={{ $json.message }}"
       }
     ]
   }
   ```

3. **Respond to Webhook Node**
   ```json
   {
     "options": {},
     "responseBody": {
       "message": "={{ $json.choices[0].message.content }}",
       "success": true
     }
   }
   ```

### Step 3: Configure Extension

1. **Open Extension**
   - Click the extension icon in your browser toolbar

2. **Access Settings**
   - Click the settings button (⚙️) in the chat header

3. **Enter Webhook URL**
   - Input your n8n webhook URL (e.g., `https://your-n8n.com/webhook/chatbot`)
   - Click "Test Connection" to verify

4. **Adjust Settings** (Optional)
   - Set request timeout (default: 30 seconds)
   - Enable/disable chat history saving
   - Choose theme preference

---

## 🔧 Advanced Setup

### n8n Webhook Security

#### API Key Authentication
```json
{
  "headerAuth": {
    "name": "Authorization",
    "value": "Bearer YOUR_API_KEY"
  }
}
```

Add to extension custom headers:
```json
{
  "Authorization": "Bearer YOUR_API_KEY"
}
```

#### IP Whitelist
Configure your n8n instance to only accept requests from expected sources.

### Advanced n8n Workflow

#### Enhanced Workflow with Context
```
Webhook → Set Context → AI Service → Format Response → Respond to Webhook
```

#### Context Node Example
```javascript
// Store conversation context
const sessionId = $json.sessionId;
const message = $json.message;

// Retrieve previous context (implement your storage logic)
const previousContext = await getContext(sessionId);

// Prepare enhanced prompt
const enhancedPrompt = {
  context: previousContext,
  currentMessage: message,
  timestamp: $json.timestamp
};

return { enhancedPrompt };
```

### Multiple AI Services

#### Load Balancer Workflow
```
Webhook → Switch (Random/Round-Robin) → Multiple AI Services → Merge → Respond
```

#### Fallback Strategy
```
Webhook → Primary AI → Error Trigger → Secondary AI → Respond
```

---

## 🎯 Testing Your Setup

### 1. Basic Connection Test

1. Open the extension
2. Go to Settings
3. Click "Test Connection"
4. Verify "✅ Connection successful" message

### 2. End-to-End Test

1. Send a simple message: "Hello"
2. Verify you receive an AI response
3. Check n8n execution logs for successful workflow runs

### 3. Error Handling Test

1. Temporarily disable your n8n workflow
2. Send a message from the extension
3. Verify graceful error handling
4. Re-enable workflow and test recovery

---

## 🐛 Troubleshooting

### Common Issues

#### ❌ "Connection Failed" Error

**Possible Causes:**
- Incorrect webhook URL
- n8n workflow not active
- Network connectivity issues
- CORS restrictions

**Solutions:**
1. Verify webhook URL is correct and accessible
2. Check n8n workflow is active (green play button)
3. Test webhook with curl:
   ```bash
   curl -X POST https://your-n8n.com/webhook/chatbot \
     -H "Content-Type: application/json" \
     -d '{"message": "test", "sessionId": "test_session"}'
   ```
4. Check browser console for CORS errors

#### ❌ "Request Timeout" Error

**Possible Causes:**
- AI service taking too long to respond
- n8n workflow has performance issues
- Network latency

**Solutions:**
1. Increase timeout in extension settings (max 600 seconds)
2. Optimize n8n workflow performance
3. Check AI service response times
4. Consider using faster AI models

#### ❌ "Invalid Response" Error

**Possible Causes:**
- n8n returning incorrect response format
- AI service returning unexpected data
- Workflow configuration issues

**Solutions:**
1. Verify n8n response format matches expected structure
2. Check n8n execution logs for errors
3. Test workflow manually in n8n
4. Validate JSON response structure

### Debug Mode

Enable detailed logging:

1. **Extension Options**
   - Right-click extension icon → Options
   - Enable "Debug Mode" in Advanced Settings

2. **Browser Console**
   - Press F12 → Console tab
   - Look for `[ChatBot]` log entries

3. **n8n Execution Logs**
   - Check workflow executions in n8n
   - Review error messages and data flow

---

## 🔒 Security Best Practices

### 1. HTTPS Only
- Always use HTTPS for webhook URLs
- Never use HTTP in production

### 2. Authentication
- Implement API key authentication
- Use strong, unique API keys
- Rotate keys regularly

### 3. Rate Limiting
- Configure rate limits in n8n
- Implement request throttling
- Monitor for abuse

### 4. Data Privacy
- Don't log sensitive information
- Implement data retention policies
- Consider encryption for stored data

---

## 📊 Monitoring & Analytics

### n8n Monitoring

1. **Workflow Execution Tracking**
   - Monitor successful/failed executions
   - Track response times
   - Set up alerts for failures

2. **Performance Metrics**
   - Average response time
   - Request volume
   - Error rates

### Extension Monitoring

1. **Usage Statistics**
   - Message count
   - Session duration
   - Feature usage

2. **Error Tracking**
   - Connection failures
   - Timeout events
   - Invalid responses

---

## 🔄 Updates & Maintenance

### Extension Updates

1. **Automatic Updates** (Chrome Web Store version)
   - Chrome will automatically update the extension
   - Users will be notified of updates

2. **Manual Updates** (Developer version)
   - Download new version
   - Replace extension files
   - Reload extension in Chrome

### n8n Workflow Updates

1. **Version Control**
   - Export workflows as JSON
   - Use git for version control
   - Document changes

2. **Testing Updates**
   - Test in staging environment
   - Verify backward compatibility
   - Update extension if needed

---

## 📞 Support

### Getting Help

1. **Check Documentation**
   - README.md for overview
   - This installation guide
   - n8n documentation

2. **Common Issues**
   - Review troubleshooting section
   - Check GitHub issues
   - Search n8n community forum

3. **Report Issues**
   - GitHub Issues for bugs
   - Include detailed error messages
   - Provide steps to reproduce

### Community Resources

- **n8n Community**: [community.n8n.io](https://community.n8n.io)
- **Chrome Extensions**: [developer.chrome.com](https://developer.chrome.com/docs/extensions/)
- **Project Repository**: GitHub Issues and Discussions

---

**Installation complete! 🎉 Your AI chatbot is ready to use.**