# API Reference - Chrome Extension AI Chatbot

## 📋 목차
- [핵심 클래스 API](#핵심-클래스-api)
- [Chrome Storage API 사용법](#chrome-storage-api-사용법)
- [n8n Webhook 연동 API](#n8n-webhook-연동-api)
- [이벤트 시스템](#이벤트-시스템)
- [유틸리티 함수](#유틸리티-함수)
- [에러 처리](#에러-처리)

## 🔧 핵심 클래스 API

### N8nApiClient

n8n webhook과의 통신을 담당하는 메인 API 클라이언트

#### Constructor
```javascript
const client = new N8nApiClient();
```

#### Methods

##### `initialize(settings)`
API 클라이언트를 초기화합니다.

```javascript
await client.initialize({
    webhookUrl: 'https://your-n8n.com/webhook/chatbot',
    timeout: 30 // seconds
});
```

**Parameters:**
- `settings` (Object)
  - `webhookUrl` (string): n8n webhook URL
  - `timeout` (number): 요청 타임아웃 (초)

**Returns:** `Promise<void>`

**Throws:** `Error` - 잘못된 webhook URL인 경우

##### `sendMessage(message, context)`
메시지를 n8n webhook으로 전송합니다.

```javascript
const response = await client.sendMessage('Hello AI!', {
    category: 'general',
    sessionId: 'session_123',
    metadata: { userPreference: 'detailed' }
});
```

**Parameters:**
- `message` (string): 사용자 메시지
- `context` (Object, optional)
  - `category` (string): AI 에이전트 카테고리 ('general', 'hr', 'it', etc.)
  - `sessionId` (string): 세션 ID
  - `userId` (string): 사용자 ID
  - `metadata` (Object): 추가 메타데이터

**Returns:** `Promise<Object>`
```javascript
{
    message: "AI response text",
    success: true,
    timestamp: "2025-01-01T00:00:00.000Z"
}
```

**Throws:** `ApiError` - API 호출 실패 시

##### `testConnection()`
webhook 연결을 테스트합니다.

```javascript
const isConnected = await client.testConnection();
```

**Returns:** `Promise<boolean>`

##### `getConnectionStatus()`
현재 연결 상태를 확인합니다.

```javascript
const status = await client.getConnectionStatus();
console.log(status.connected); // true/false
console.log(status.url);       // webhook URL
console.log(status.error);     // 에러 메시지 (있는 경우)
```

**Returns:** `Promise<Object>`

### ChatbotPopup

팝업 UI를 관리하는 메인 클래스

#### Constructor
```javascript
const popup = new ChatbotPopup();
```

#### Methods

##### `init()`
팝업을 초기화하고 이벤트를 바인딩합니다.

```javascript
await popup.init();
```

**Returns:** `Promise<void>`

##### `sendMessage(message)`
메시지를 전송합니다.

```javascript
await popup.sendMessage('Hello, how can you help me?');
```

**Parameters:**
- `message` (string): 전송할 메시지

**Returns:** `Promise<void>`

##### `switchCategory(category)`
AI 에이전트 카테고리를 변경합니다.

```javascript
popup.switchCategory('hr');
```

**Parameters:**
- `category` (string): 새로운 카테고리

**Returns:** `void`

##### `clearChatHistory()`
채팅 기록을 지웁니다.

```javascript
await popup.clearChatHistory();
```

**Returns:** `Promise<void>`

##### `updateConnectionStatus(isConnected, message)`
연결 상태를 업데이트합니다.

```javascript
popup.updateConnectionStatus(true, 'Connected to n8n');
```

**Parameters:**
- `isConnected` (boolean): 연결 상태
- `message` (string, optional): 상태 메시지

**Returns:** `void`

### StorageManager

Chrome Storage API를 래핑하는 데이터 관리 클래스

#### Methods

##### `getSettings()`
저장된 설정을 조회합니다.

```javascript
const settings = await StorageManager.getSettings();
console.log(settings.webhookUrl);
console.log(settings.timeout);
```

**Returns:** `Promise<Object>`
```javascript
{
    webhookUrl: string,
    timeout: number,
    saveHistory: boolean,
    theme: string
}
```

##### `saveSettings(settings)`
설정을 저장합니다.

```javascript
await StorageManager.saveSettings({
    webhookUrl: 'https://new-url.com/webhook',
    timeout: 45,
    saveHistory: true,
    theme: 'dark'
});
```

**Parameters:**
- `settings` (Object): 저장할 설정 객체

**Returns:** `Promise<void>`

##### `getChatHistory()`
채팅 기록을 조회합니다.

```javascript
const history = await StorageManager.getChatHistory();
console.log(history.length); // 메시지 개수
```

**Returns:** `Promise<Array>`
```javascript
[
    {
        id: string,
        role: 'user' | 'assistant',
        content: string,
        timestamp: string,
        category: string
    }
]
```

##### `saveChatHistory(messages)`
채팅 기록을 저장합니다.

```javascript
await StorageManager.saveChatHistory([
    {
        id: 'msg_1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString(),
        category: 'general'
    }
]);
```

**Parameters:**
- `messages` (Array): 저장할 메시지 배열

**Returns:** `Promise<void>`

##### `clearData()`
모든 저장된 데이터를 삭제합니다.

```javascript
await StorageManager.clearData();
```

**Returns:** `Promise<void>`

## 💾 Chrome Storage API 사용법

### Local Storage 접근

```javascript
// 데이터 저장
await chrome.storage.local.set({
    'chatHistory': messages,
    'userSettings': settings
});

// 데이터 조회
const result = await chrome.storage.local.get(['chatHistory', 'userSettings']);
console.log(result.chatHistory);

// 모든 데이터 조회
const allData = await chrome.storage.local.get(null);

// 데이터 삭제
await chrome.storage.local.remove(['chatHistory']);

// 모든 데이터 삭제
await chrome.storage.local.clear();
```

### Sync Storage 접근 (설정 동기화)

```javascript
// 사용자 설정을 여러 기기에 동기화
await chrome.storage.sync.set({
    'theme': 'dark',
    'defaultCategory': 'general'
});

const syncData = await chrome.storage.sync.get(['theme', 'defaultCategory']);
```

### Storage 변경 감지

```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
    for (let key in changes) {
        const change = changes[key];
        console.log(`${key} changed from ${change.oldValue} to ${change.newValue}`);
    }
});
```

## 🌐 n8n Webhook 연동 API

### 요청 형식

#### 메시지 전송 요청
```javascript
POST /webhook/chatbot
Content-Type: application/json

{
    "data": {
        "text": "사용자가 입력한 메시지",
        "category": "HR"
    },
    "timestamp": "2025-01-01T12:00:00.000Z",
    "sessionId": "session_1704110400123",
    "userId": "chrome-extension-user",
    "metadata": {
        "source": "chrome-extension",
        "version": "1.0.0",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
        "agentType": "hr",
        "isTest": false
    }
}
```

#### 연결 테스트 요청
```javascript
POST /webhook/chatbot
Content-Type: application/json

{
    "data": {
        "text": "Test connection",
        "category": "general"
    },
    "timestamp": "2025-01-01T12:00:00.000Z",
    "sessionId": "test_session",
    "userId": "chrome-extension-user",
    "metadata": {
        "source": "chrome-extension",
        "version": "1.0.0",
        "userAgent": "...",
        "agentType": "general",
        "isTest": true
    }
}
```

### 응답 형식

#### 성공 응답
```javascript
HTTP/1.1 200 OK
Content-Type: application/json

{
    "message": "AI 어시스턴트의 응답 메시지입니다.",
    "success": true,
    "metadata": {
        "model": "gpt-4",
        "tokens_used": 150,
        "response_time": 1.2
    }
}
```

#### n8n 배열 응답 처리
```javascript
// n8n이 배열로 응답하는 경우
[
    {
        "output": "AI 응답 메시지",
        "metadata": {
            "executionTime": 1.5
        }
    }
]
```

#### 에러 응답
```javascript
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
    "error": {
        "message": "Invalid request format",
        "code": "INVALID_REQUEST"
    },
    "success": false
}
```

### n8n 워크플로우 예제 구조

```javascript
// 1. Webhook Node 설정
{
    "httpMethod": "POST",
    "path": "chatbot",
    "responseMode": "responseNode"
}

// 2. Switch Node - 카테고리별 분기
{
    "rules": [
        {
            "type": "expression",
            "value": "={{$json.data.category === 'hr'}}"
        },
        {
            "type": "expression", 
            "value": "={{$json.data.category === 'it'}}"
        }
        // ... 기타 카테고리
    ]
}

// 3. HTTP Request Node - AI API 호출
{
    "url": "https://api.openai.com/v1/chat/completions",
    "method": "POST",
    "headers": {
        "Authorization": "Bearer {{$credentials.openAI.apiKey}}",
        "Content-Type": "application/json"
    },
    "body": {
        "model": "gpt-4",
        "messages": [
            {
                "role": "system",
                "content": "당신은 HR 전문가입니다..."
            },
            {
                "role": "user", 
                "content": "={{$json.data.text}}"
            }
        ]
    }
}

// 4. Response Node
{
    "message": "={{$json.choices[0].message.content}}",
    "success": true,
    "metadata": {
        "model": "={{$json.model}}",
        "tokens": "={{$json.usage.total_tokens}}"
    }
}
```

## 📡 이벤트 시스템

### Background Script 메시지 통신

```javascript
// popup.js에서 background script로 메시지 전송
chrome.runtime.sendMessage({
    action: 'sendMessage',
    data: {
        message: 'Hello AI',
        category: 'general'
    }
}, (response) => {
    if (response.success) {
        console.log('AI Response:', response.data.message);
    } else {
        console.error('Error:', response.error);
    }
});

// background.js에서 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendMessage') {
        handleApiCall(request.data)
            .then(response => sendResponse({success: true, data: response}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true; // 비동기 응답 필요
    }
});
```

### Custom Events (팝업 내부)

```javascript
// 이벤트 발생
const messageEvent = new CustomEvent('messageReceived', {
    detail: {
        message: 'AI response',
        category: 'general',
        timestamp: Date.now()
    }
});
document.dispatchEvent(messageEvent);

// 이벤트 리스너
document.addEventListener('messageReceived', (event) => {
    console.log('New message:', event.detail.message);
    updateUI(event.detail);
});
```

### Storage 변경 이벤트

```javascript
// 설정 변경 감지
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (changes.webhookUrl) {
        // webhook URL이 변경됨
        apiClient.initialize({
            webhookUrl: changes.webhookUrl.newValue
        });
    }
    
    if (changes.theme) {
        // 테마가 변경됨
        applyTheme(changes.theme.newValue);
    }
});
```

## 🛠️ 유틸리티 함수

### 시간 포맷팅

```javascript
// utils.js
class DateUtils {
    static formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 1000 / 60);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return date.toLocaleDateString();
    }
    
    static getCurrentTimestamp() {
        return new Date().toISOString();
    }
}
```

### 세션 관리

```javascript
class SessionManager {
    static generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `session_${timestamp}_${random}`;
    }
    
    static isValidSessionId(sessionId) {
        return sessionId && sessionId.startsWith('session_');
    }
    
    static async getCurrentSession() {
        const result = await chrome.storage.local.get(['currentSession']);
        return result.currentSession || this.generateSessionId();
    }
}
```

### 메시지 검증

```javascript
class MessageValidator {
    static isValidMessage(message) {
        return message && 
               typeof message === 'string' && 
               message.trim().length > 0 && 
               message.length <= 2000;
    }
    
    static sanitizeMessage(message) {
        return message
            .trim()
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]*>/g, '');
    }
    
    static isValidCategory(category) {
        const validCategories = [
            'GENERAL', 'HR', 'IT', 'DATA', 
            'FINANCE', 'MARKETING', 'LEGAL', 'SECURITY'
        ];
        return validCategories.includes(category);
    }
}
```

### URL 검증

```javascript
class UrlValidator {
    static isValidWebhookUrl(url) {
        try {
            const urlObj = new URL(url);
            return (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') &&
                   urlObj.hostname.length > 0;
        } catch {
            return false;
        }
    }
    
    static normalizeUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        return url.replace(/\/$/, ''); // 마지막 슬래시 제거
    }
}
```

## ❌ 에러 처리

### ApiError 클래스

```javascript
class ApiError extends Error {
    constructor(message, code = 0, details = {}) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.details = details;
    }
    
    // HTTP 상태 코드별 분류
    isNetworkError() {
        return this.code === 0;
    }
    
    isClientError() {
        return this.code >= 400 && this.code < 500;
    }
    
    isServerError() {
        return this.code >= 500;
    }
    
    isTimeout() {
        return this.code === 408 || this.message.includes('timeout');
    }
}
```

### 에러 핸들링 패턴

```javascript
// 재시도 로직
class RetryHandler {
    static async withRetry(asyncFn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await asyncFn();
            } catch (error) {
                lastError = error;
                
                if (i === maxRetries || !this.isRetryable(error)) {
                    throw error;
                }
                
                await this.delay(delay * Math.pow(2, i)); // 지수 백오프
            }
        }
        
        throw lastError;
    }
    
    static isRetryable(error) {
        if (error instanceof ApiError) {
            return error.isNetworkError() || 
                   error.isServerError() || 
                   error.isTimeout();
        }
        return false;
    }
    
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

### 글로벌 에러 핸들러

```javascript
// popup.js에서 글로벌 에러 처리
class ErrorHandler {
    static init() {
        window.addEventListener('error', this.handleError);
        window.addEventListener('unhandledrejection', this.handlePromiseRejection);
    }
    
    static handleError(event) {
        console.error('Global Error:', event.error);
        this.showUserFriendlyError('예상치 못한 오류가 발생했습니다.');
    }
    
    static handlePromiseRejection(event) {
        console.error('Unhandled Promise Rejection:', event.reason);
        this.showUserFriendlyError('처리되지 않은 오류가 발생했습니다.');
    }
    
    static showUserFriendlyError(message) {
        // UI에 사용자 친화적인 에러 메시지 표시
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        }
    }
}

// 초기화
ErrorHandler.init();
```

---

이 API 레퍼런스는 Chrome 확장 프로그램 개발 시 빠른 참조용으로 사용하실 수 있습니다. 각 함수와 클래스의 상세한 사용법과 예제를 포함하고 있어 효율적인 개발을 도와드릴 것입니다.