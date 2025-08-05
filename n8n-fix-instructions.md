# n8n 워크플로우 수정 방법

## 🔧 문제점
AI Agent 노드의 `text` 파라미터가 잘못된 경로를 참조하고 있습니다.

**현재 설정**: `={{ $json.body.data.text }}`  
**문제**: Chrome extension에서 보내는 데이터에 `body.data.text` 경로가 존재하지 않음

## 📝 수정 방법

### 1. AI Agent 노드 수정
1. **AI Agent** 노드를 더블클릭해서 열기
2. **Text** 필드를 다음 중 하나로 변경:
   ```
   ={{ $json.body.message }}
   ```
   또는
   ```  
   ={{ $json.message }}
   ```

### 2. 데이터 구조 확인
Chrome extension에서 보내는 실제 데이터:
```json
{
  "message": "사용자가 입력한 메시지",
  "category": "GENERAL|HR|IT|DATA|FINANCE|MARKETING|LEGAL|SECURITY", 
  "timestamp": "2025-08-01T05:50:00.000Z",
  "sessionId": "session_123456789",
  "userId": "chrome-extension-user",
  "metadata": {
    "source": "chrome-extension",
    "version": "1.0.0",
    "userAgent": "Mozilla/5.0...",
    "agentType": "GENERAL"
  }
}
```

### 3. 카테고리 활용 (선택사항)
카테고리 정보도 AI에게 전달하려면:
```
사용자 메시지: {{ $json.body.message }}
카테고리: {{ $json.body.category }}
```

### 4. 시스템 메시지에 카테고리 추가 (권장)
시스템 메시지에 카테고리 컨텍스트를 추가:
```
You are a {{ $json.body.category || 'general' }} AI assistant.
사용자의 카테고리: {{ $json.body.category }}

[기존 시스템 메시지 내용...]
```

## ✅ 수정 후 테스트
1. 워크플로우 저장
2. 브라우저에서 `debug-webhook.html` 열어서 테스트
3. 또는 터미널에서 `node test-webhook.js` 실행

## 🎯 예상 결과
수정 후에는 AI Agent가 사용자의 메시지를 올바르게 받아서 JSON 응답을 생성하고, Chrome extension에서 정상적으로 챗봇이 작동할 것입니다.