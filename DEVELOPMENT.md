# Chrome Extension AI Chatbot - 개발 가이드

## 📋 목차
- [개발 환경 설정](#개발-환경-설정)
- [시스템 아키텍처](#시스템-아키텍처)  
- [컴포넌트 상세 설명](#컴포넌트-상세-설명)
- [API 연동 가이드](#api-연동-가이드)
- [기능 확장 가이드](#기능-확장-가이드)
- [빌드 및 배포](#빌드-및-배포)
- [트러블슈팅](#트러블슈팅)

## 🛠️ 개발 환경 설정

### 필수 요구사항
- **Chrome Browser**: Version 88+ (Manifest V3 지원)
- **n8n**: Running instance with webhook capability
- **Text Editor**: VS Code 권장 (확장 프로그램 개발 지원)
- **Git**: 버전 관리용

### 로컬 개발 설정

1. **프로젝트 클론**
```bash
git clone <repository-url>
cd chrome_extension_ai_chatbot_by_cladue
```

2. **Chrome 개발자 모드 활성화**
- `chrome://extensions/` 접속
- 우상단 "개발자 모드" 토글 활성화
- "압축해제된 확장 프로그램을 로드합니다" 클릭
- 프로젝트 루트 디렉토리 선택

3. **개발 도구 설정**
```bash
# VS Code 권장 확장 프로그램
- Chrome Extension Developer Tools
- JavaScript (ES6) code snippets
- Prettier - Code formatter
```

4. **디버깅 설정**
- Chrome DevTools에서 확장 프로그램 백그라운드 스크립트 디버깅
- 팝업 창에서 우클릭 → "검사" 선택하여 팝업 디버깅
- `console.log()` 및 `chrome.storage` API를 통한 상태 확인

## 🏗️ 시스템 아키텍처

### 전체 구조 다이어그램
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Interface │    │   Chrome APIs   │    │   n8n Webhook   │
│   (Popup/Options)│◄──►│   (Background)  │◄──►│   (AI Service)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Storage │    │   Content Script│    │   External APIs │
│   (Chat History)│    │   (Web Integration)  │   (Claude/GPT)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 데이터 플로우
```
사용자 입력 → Popup UI → Background Script → n8n Webhook → AI Service
                   ↓
Local Storage ← Message History ← API Response ← AI Response
```

### 주요 컴포넌트 관계
- **Popup**: 사용자 인터페이스 및 상호작용 처리
- **Background**: API 호출 및 데이터 관리 중앙화
- **Content Script**: 웹페이지와의 상호작용 (선택사항)
- **Options**: 고급 설정 및 구성 관리
- **Storage**: 채팅 기록 및 설정 영구 저장

## 📦 컴포넌트 상세 설명

### 1. Manifest Configuration (`manifest.json`)

```json
{
  "manifest_version": 3,
  "permissions": [
    "storage",      // 로컬 데이터 저장
    "activeTab"     // 현재 탭 정보 접근
  ],
  "host_permissions": [
    "*://*/*"       // 모든 도메인으로의 네트워크 요청
  ]
}
```

**주요 설정 포인트:**
- **service_worker**: Background script 진입점
- **action.default_popup**: 확장 프로그램 클릭 시 표시될 팝업
- **content_scripts**: 웹페이지에 주입될 스크립트 (선택사항)

### 2. Popup Interface (`popup/`)

#### 파일 구조
```
popup/
├── popup.html      # UI 구조 정의
├── popup.css       # 스타일링 및 테마
└── popup.js        # 인터랙션 로직
```

#### 주요 클래스: `ChatbotPopup`

```javascript
class ChatbotPopup {
    constructor() {
        this.selectedCategory = 'general';  // 현재 선택된 AI 에이전트
        this.currentSessionId = null;       // 세션 관리
        this.isTyping = false;              // 타이핑 상태
    }
    
    // 핵심 메서드들
    async sendMessage(message)              // 메시지 전송
    async handleApiResponse(response)       // API 응답 처리  
    updateConnectionStatus(isConnected)     // 연결 상태 업데이트
    switchCategory(category)                // AI 에이전트 변경
}
```

#### UI 컴포넌트
- **Category Selector**: 8개 AI 에이전트 선택
- **Chat Messages**: 대화 기록 표시 영역
- **Input Area**: 메시지 입력 및 전송
- **Settings Modal**: 설정 변경 인터페이스

### 3. Background Service (`background/background.js`)

**주요 역할:**
- API 호출 중앙화 및 에러 처리
- 크로스-오리진 요청 처리
- 확장 프로그램 생명주기 관리

```javascript
// 메시지 리스너 예제
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'sendMessage') {
        handleApiCall(request.data)
            .then(response => sendResponse({success: true, data: response}))
            .catch(error => sendResponse({success: false, error: error.message}));
        return true; // 비동기 응답을 위해 필요
    }
});
```

### 4. API Client (`lib/api-client.js`)

#### 클래스: `N8nApiClient`

```javascript
class N8nApiClient {
    constructor() {
        this.baseURL = null;            // n8n webhook URL
        this.timeout = 30000;           // 요청 타임아웃
        this.maxRetries = 3;            // 재시도 횟수
    }
    
    // 핵심 메서드들
    async initialize(settings)          // 클라이언트 초기화
    async sendMessage(message, context) // 메시지 전송
    async testConnection()              // 연결 테스트
    validateResponse(data)              // 응답 검증
}
```

#### 요청/응답 형식

**요청 페이로드:**
```javascript
{
    data: {
        text: "사용자 메시지",
        category: "GENERAL"
    },
    timestamp: "2025-01-01T00:00:00.000Z",
    sessionId: "session_12345",
    userId: "chrome-extension-user",
    metadata: {
        source: "chrome-extension",
        version: "1.0.0",
        userAgent: navigator.userAgent,
        agentType: "GENERAL"
    }
}
```

**응답 형식:**
```javascript
{
    message: "AI 응답 메시지",
    success: true,
    timestamp: "2025-01-01T00:00:00.000Z"
}
```

### 5. Storage Management (`lib/storage.js`)

```javascript
class StorageManager {
    // Chrome Storage API 래퍼
    async getSettings()                 // 설정 조회
    async saveSettings(settings)        // 설정 저장
    async getChatHistory()              // 채팅 기록 조회
    async saveChatHistory(messages)     // 채팅 기록 저장
    async clearData()                   // 데이터 정리
}
```

## 🔌 API 연동 가이드

### n8n Webhook 설정

#### 1. 워크플로우 생성
```javascript
// n8n 워크플로우 예제 구조
[Webhook] → [Switch Node] → [AI Service] → [Response]
     ↓            ↓              ↓            ↓
  POST 수신    카테고리 분기    AI API 호출   응답 반환
```

#### 2. 카테고리별 라우팅
```javascript
// Switch Node 설정 예제
switch($.data.category) {
    case 'hr':
        // HR 전용 프롬프트 및 모델 설정
        break;
    case 'it':
        // IT 지원 전용 설정
        break;
    case 'legal':
        // 법무 자문 전용 설정
        break;
    // ... 기타 카테고리
}
```

#### 3. AI 서비스 연동 예제

**OpenAI 연동:**
```javascript
{
    "model": "gpt-4",
    "messages": [
        {
            "role": "system", 
            "content": "You are an HR specialist..."
        },
        {
            "role": "user", 
            "content": "{{$json.data.text}}"
        }
    ],
    "max_tokens": 1000,
    "temperature": 0.7
}
```

**Claude 연동:**
```javascript
{
    "model": "claude-3-haiku-20240307",
    "max_tokens": 1000,
    "system": "You are an IT support specialist...",
    "messages": [
        {
            "role": "user",
            "content": "{{$json.data.text}}"
        }
    ]
}
```

### 에러 처리 및 재시도 로직

```javascript
// API 클라이언트의 에러 처리 예제
async makeRequest(payload, retryCount = 0) {
    try {
        const response = await fetch(this.baseURL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(this.timeout)
        });
        
        if (!response.ok) {
            throw new ApiError(`HTTP ${response.status}`, response.status);
        }
        
        return await response.json();
        
    } catch (error) {
        if (retryCount < this.maxRetries && this.isRetryableError(error)) {
            await this.delay(this.retryDelay * Math.pow(2, retryCount));
            return this.makeRequest(payload, retryCount + 1);
        }
        throw error;
    }
}
```

## ✨ 기능 확장 가이드

### 1. 새로운 AI 에이전트 추가

#### Step 1: UI 업데이트 (`popup/popup.html`)
```html
<button class="category-btn" data-category="newagent" data-icon="🔬">
    <span class="category-icon">🔬</span>
    <span class="category-name">Research</span>
</button>
```

#### Step 2: 스타일링 추가 (`popup/popup.css`)
```css
.category-btn[data-category="newagent"].active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

#### Step 3: JavaScript 로직 업데이트 (`popup/popup.js`)
```javascript
// CategoryConfig 객체에 추가
const CATEGORY_CONFIG = {
    // ... 기존 카테고리들
    newagent: {
        name: 'Research',
        icon: '🔬',
        description: 'Research and academic assistant'
    }
};
```

#### Step 4: n8n 워크플로우 업데이트
```javascript
// Switch Node에 새 케이스 추가
case 'newagent':
    return {
        systemPrompt: "You are a research assistant specialized in academic work...",
        model: "claude-3-sonnet-20240229",
        temperature: 0.3
    };
```

### 2. 새로운 UI 테마 추가

#### CSS 변수 시스템 활용
```css
/* 다크 테마 */
[data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --text-primary: #ffffff;
    --accent-color: #4a9eff;
}

/* 컬러풀 테마 */
[data-theme="colorful"] {
    --bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --bg-secondary: rgba(255, 255, 255, 0.1);
    --text-primary: #ffffff;
    --accent-color: #ff6b6b;
}
```

#### 테마 전환 로직
```javascript
class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
    }
    
    async switchTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
        this.currentTheme = themeName;
        await this.saveThemePreference(themeName);
    }
}
```

### 3. 고급 메시지 기능 추가

#### 파일 첨부 기능
```javascript
class FileHandler {
    constructor() {
        this.allowedTypes = ['image/*', '.pdf', '.doc', '.docx'];
        this.maxSize = 10 * 1024 * 1024; // 10MB
    }
    
    async handleFileUpload(file) {
        if (!this.validateFile(file)) {
            throw new Error('Invalid file type or size');
        }
        
        const base64 = await this.fileToBase64(file);
        return {
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64
        };
    }
}
```

#### 메시지 포맷팅 (마크다운 지원)
```javascript
// marked.js 라이브러리 사용 예제
class MessageFormatter {
    static formatMessage(rawMessage) {
        // 마크다운 → HTML 변환
        return marked.parse(rawMessage, {
            breaks: true,
            gfm: true,
            sanitize: true
        });
    }
    
    static addCodeHighlighting(html) {
        // Prism.js 또는 highlight.js 적용
        return html.replace(/<code class="language-(\w+)">/g, 
            '<code class="language-$1 hljs">');
    }
}
```

### 4. 음성 인터페이스 추가

#### Web Speech API 활용
```javascript
class VoiceInterface {
    constructor() {
        this.recognition = new webkitSpeechRecognition();
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
    }
    
    startListening() {
        this.recognition.start();
        this.isListening = true;
    }
    
    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
        this.synthesis.speak(utterance);
    }
}
```

### 5. 알림 시스템 추가

#### Chrome Notifications API
```javascript
// manifest.json에 "notifications" 권한 추가 필요
class NotificationManager {
    async showNotification(title, message, type = 'basic') {
        return chrome.notifications.create({
            type: type,
            iconUrl: 'icons/icon48.png',
            title: title,
            message: message,
            contextMessage: 'AI Chatbot Extension'
        });
    }
    
    async scheduleReminder(message, delayMinutes) {
        chrome.alarms.create('chatReminder', {
            delayInMinutes: delayMinutes
        });
    }
}
```

## 🚀 빌드 및 배포

### 개발 빌드 프로세스

#### 1. 코드 검증
```bash
# ESLint 설정 (.eslintrc.js)
module.exports = {
    env: {
        browser: true,
        es6: true,
        webextensions: true
    },
    extends: ['eslint:recommended'],
    rules: {
        'no-unused-vars': 'warn',
        'no-console': 'warn'
    }
};

# 실행
npx eslint popup/ lib/ background/ options/
```

#### 2. 자동화된 테스트
```javascript
// 단위 테스트 예제 (Jest)
describe('N8nApiClient', () => {
    test('should validate webhook URL correctly', () => {
        const client = new N8nApiClient();
        expect(client.isValidWebhookUrl('https://example.com/webhook')).toBe(true);
        expect(client.isValidWebhookUrl('invalid-url')).toBe(false);
    });
});
```

#### 3. 빌드 스크립트 (package.json)
```json
{
    "scripts": {
        "lint": "eslint popup/ lib/ background/ options/",
        "test": "jest",
        "build": "npm run lint && npm run test && npm run package",
        "package": "zip -r extension.zip . -x '*.git*' 'node_modules/*' '*.md'"
    }
}
```

### Chrome 웹 스토어 배포

#### 1. 배포 준비 체크리스트
- [ ] manifest.json의 버전 업데이트
- [ ] 모든 아이콘 파일 확인 (16x16, 48x48, 128x128)
- [ ] 개인정보 처리방침 URL 추가
- [ ] 스크린샷 및 설명 준비
- [ ] 최종 테스트 완료

#### 2. 스토어 등록 정보
```json
// manifest.json 배포용 설정
{
    "name": "AI Chatbot Assistant - n8n Integration",
    "description": "Multi-agent AI chatbot with n8n webhook integration",
    "homepage_url": "https://github.com/your-repo",
    "privacy_policy": "https://your-site.com/privacy"
}
```

## 🔧 트러블슈팅

### 일반적인 문제들

#### 1. 확장 프로그램이 로드되지 않음
**증상:** Chrome에서 확장 프로그램 로드 실패
**해결책:**
```bash
# manifest.json 문법 검증
cat manifest.json | python -m json.tool

# 필수 파일 존재 확인
ls -la popup/popup.html background/background.js
```

#### 2. API 호출 실패
**증상:** n8n webhook 연결 안됨
**디버깅:**
```javascript
// Background script에서 네트워크 오류 로깅
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('API Request:', request);
    // ... API 호출 코드
    console.log('API Response:', response);
});
```

#### 3. 스토리지 데이터 손실
**증상:** 설정이나 채팅 기록이 사라짐
**해결책:**
```javascript
// 데이터 백업 및 복구 로직
class DataBackup {
    async createBackup() {
        const data = await chrome.storage.local.get(null);
        return JSON.stringify(data);
    }
    
    async restoreBackup(backupData) {
        const data = JSON.parse(backupData);
        await chrome.storage.local.set(data);
    }
}
```

#### 4. CSP (Content Security Policy) 오류
**증상:** 인라인 스크립트나 스타일이 차단됨
**해결책:**
```json
// manifest.json에서 CSP 설정
{
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';"
    }
}
```

### 디버깅 도구 및 기법

#### Chrome DevTools 활용
```javascript
// 확장 프로그램 전용 디버깅
// Background script: chrome://extensions → "service worker" 링크 클릭
// Popup: 팝업 우클릭 → "검사"
// Options: chrome://extensions → "확장 프로그램 옵션"

// 로깅 모범 사례
class Logger {
    static debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DEBUG] ${message}`, data);
        }
    }
    
    static error(message, error = null) {
        console.error(`[ERROR] ${message}`, error);
        // 선택적으로 에러 보고 서비스에 전송
    }
}
```

#### 성능 프로파일링
```javascript
// API 응답 시간 측정
class PerformanceMonitor {
    static async measureApiCall(apiFunction) {
        const startTime = performance.now();
        try {
            const result = await apiFunction();
            const endTime = performance.now();
            console.log(`API call took ${endTime - startTime} ms`);
            return result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
}
```

## 📚 참고 자료

### Chrome Extension APIs
- [Chrome Extension API 문서](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 가이드](https://developer.chrome.com/docs/extensions/mv3/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

### n8n 관련
- [n8n 공식 문서](https://docs.n8n.io/)
- [Webhook 노드 가이드](https://docs.n8n.io/integrations/core-nodes/n8n-nodes-base.webhook/)
- [n8n API 문서](https://docs.n8n.io/api/)

### AI 서비스 연동
- [OpenAI API 문서](https://platform.openai.com/docs/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Google Bard API](https://ai.google.dev/)

---

이 개발 가이드는 Chrome 확장 프로그램의 지속적인 개발과 유지보수를 위한 포괄적인 참조 자료입니다. 추가 질문이나 특정 기능 구현에 대한 도움이 필요하시면 언제든 문의해 주세요.