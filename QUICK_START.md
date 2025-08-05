# Quick Start Guide - Chrome Extension AI Chatbot

## 🚀 5분만에 시작하기

### 1단계: Chrome 확장 프로그램 설치

1. **Chrome 브라우저 열기**
2. **주소창에 입력**: `chrome://extensions/`
3. **개발자 모드 활성화**: 우상단 토글 스위치 클릭
4. **"압축해제된 확장 프로그램을 로드합니다"** 클릭
5. **이 프로젝트 폴더 선택** 후 확인

✅ **확인**: 툴바에 AI 챗봇 아이콘이 표시됩니다.

### 2단계: n8n 설정 (기본 예제)

#### n8n 워크플로우 만들기

1. **Webhook 노드 추가**
   - HTTP Method: `POST`
   - Path: `chatbot`

2. **OpenAI 노드 추가** (또는 다른 AI 서비스)
   ```json
   {
     "model": "gpt-3.5-turbo",
     "messages": [
       {
         "role": "user",
         "content": "={{$json.data.text}}"
       }
     ]
   }
   ```

3. **응답 형식 설정**
   ```json
   {
     "message": "={{$json.choices[0].message.content}}",
     "success": true
   }
   ```

4. **워크플로우 활성화** 후 webhook URL 복사

### 3단계: 확장 프로그램 설정

1. **확장 프로그램 아이콘 클릭**
2. **설정 버튼 (⚙️) 클릭**
3. **n8n Webhook URL 입력**:
   ```
   https://your-n8n-instance.com/webhook/chatbot
   ```
4. **"Save Settings" 클릭**

### 4단계: 테스트

1. **메시지 입력창에 "안녕하세요" 입력**
2. **Enter 키 또는 전송 버튼 클릭**
3. **AI 응답 확인**

🎉 **완료!** 이제 8개의 전문 AI 에이전트와 채팅할 수 있습니다.

## 🎯 주요 기능 사용법

### AI 에이전트 선택
- **General 🤖**: 일반적인 질문과 대화
- **HR 👥**: 인사 관련 문의
- **IT 💻**: 기술 지원 및 문제 해결
- **Data 📊**: 데이터 분석 및 인사이트
- **Finance 💰**: 재무 관련 조언
- **Marketing 📢**: 마케팅 전략 및 아이디어
- **Legal ⚖️**: 법무 자문 (일반적인 정보만)
- **Security 🔒**: 보안 및 사이버보안 전문가

### 빠른 팁
- **Enter**: 메시지 전송
- **Shift + Enter**: 줄바꿈
- **🗑️ 아이콘**: 채팅 기록 삭제
- **카테고리 드롭다운**: AI 에이전트 변경

## 🔧 고급 n8n 설정 예제

### 카테고리별 AI 모델 설정

```javascript
// Switch 노드에서 카테고리별 분기
const category = $json.data.category;

switch(category) {
  case 'LEGAL':
    return {
      model: 'gpt-4',
      temperature: 0.1,
      systemPrompt: '당신은 법무 전문가입니다. 정확하고 신중한 법률 정보를 제공하되, 항상 전문 변호사 상담을 권하세요.'
    };
    
  case 'HR':
    return {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      systemPrompt: '당신은 친근한 HR 전문가입니다. 직장 내 문제 해결과 인사 정책에 대해 도움을 줍니다.'
    };
    
  case 'IT':
    return {
      model: 'gpt-4',
      temperature: 0.3,
      systemPrompt: '당신은 IT 지원 전문가입니다. 기술적 문제에 대해 단계별로 명확한 해결책을 제시합니다.'
    };
    
  default:
    return {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      systemPrompt: '당신은 도움이 되는 AI 어시스턴트입니다.'
    };
}
```

### 세션 관리가 있는 고급 워크플로우

```javascript
// 1. Webhook 수신
// 2. 세션 확인 (Redis/Database)
// 3. 이전 대화 컨텍스트 로드
// 4. AI 모델에 컨텍스트 포함하여 전송
// 5. 응답 저장
// 6. 클라이언트에 응답
```

## ⚠️ 자주 발생하는 문제 해결

### "연결 실패" 표시될 때
1. **n8n webhook URL이 정확한지 확인**
2. **n8n 워크플로우가 활성화되어 있는지 확인**
3. **네트워크 연결 상태 확인**
4. **CORS 설정 확인** (n8n에서 필요시)

### 응답이 오지 않을 때
1. **n8n 워크플로우 실행 로그 확인**
2. **AI API 키가 설정되어 있는지 확인**
3. **타임아웃 설정 늘리기** (설정에서 60초로 증가)

### 채팅 기록이 사라질 때
1. **설정에서 "Save chat history" 활성화**
2. **브라우저 데이터 정리 설정 확인**

## 🚀 다음 단계

### 커스터마이징
- **새로운 AI 에이전트 추가**: [DEVELOPMENT.md](DEVELOPMENT.md#새로운-ai-에이전트-추가) 참조
- **UI 테마 변경**: CSS 변수 시스템 활용
- **음성 인터페이스 추가**: Web Speech API 통합

### 고급 기능
- **파일 업로드 지원**: 이미지, 문서 분석
- **대화 내보내기**: JSON, PDF 형태로 저장
- **다국어 지원**: i18n 시스템 구현

### 성능 최적화
- **응답 캐싱**: 자주 묻는 질문 캐시
- **스트리밍 응답**: 실시간 타이핑 효과
- **배치 처리**: 여러 질문 동시 처리

## 📚 추가 자료

- **개발 가이드**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **API 레퍼런스**: [API_REFERENCE.md](API_REFERENCE.md)
- **사용자 매뉴얼**: [README.md](README.md)

---

문제가 있거나 추가 도움이 필요하시면 GitHub Issues를 통해 문의해 주세요!