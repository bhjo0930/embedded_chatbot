# Curl로 n8n Webhook 테스트하는 방법 (업데이트됨)

## 🚀 기본 테스트 (n8n 데이터 구조에 맞춤)

### 1. JSON 파일 사용 (가장 안전한 방법) ✅ 이미 업데이트됨
```bash
# 1단계: 테스트 JSON 파일은 이미 올바른 구조로 생성됨
# test-payload.json 내용:
# {
#   "body": {
#     "data": {
#       "text": "Hello! This is a test message from curl.",
#       "category": "GENERAL"
#     }
#   },
#   "timestamp": "2025-08-01T06:00:00.000Z",
#   "sessionId": "test_session_123",
#   "userId": "curl-test-user"
# }

# 2단계: 테스트 실행 (이미 업데이트됨)
curl -X POST "https://n8n.just4u.life/webhook/70b9ce8c-b88c-4ef9-8351-15929e540bf5" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d @test-payload.json \
  -w "\n\n=== Response Info ===\nHTTP Code: %{http_code}\nResponse Time: %{time_total}s\nResponse Size: %{size_download} bytes\n" \
  -v
```

### 2. 인라인 JSON (n8n 구조에 맞춤)
```bash
curl -X POST "https://n8n.just4u.life/webhook/70b9ce8c-b88c-4ef9-8351-15929e540bf5" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"body":{"data":{"text":"Test message","category":"GENERAL"}}}' \
  -w "\nHTTP: %{http_code} | Time: %{time_total}s | Size: %{size_download} bytes\n"
```

### 3. 상세한 응답 보기
```bash
curl -X POST "https://n8n.just4u.life/webhook/70b9ce8c-b88c-4ef9-8351-15929e540bf5" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"message": "Hello", "category": "GENERAL"}' \
  -i \
  -w "\n\n=== CURL INFO ===\nHTTP Code: %{http_code}\nTotal Time: %{time_total}s\nResponse Size: %{size_download} bytes\n"
```

## 🧪 카테고리별 테스트

### HR 카테고리
```bash
curl -X POST "https://n8n.just4u.life/webhook/70b9ce8c-b88c-4ef9-8351-15929e540bf5" \
  -H "Content-Type: application/json" \
  -d '{"message": "I need help with HR policies", "category": "HR"}' \
  -w "\nHTTP: %{http_code}\n"
```

### IT 카테고리  
```bash
curl -X POST "https://n8n.just4u.life/webhook/70b9ce8c-b88c-4ef9-8351-15929e540bf5" \
  -H "Content-Type: application/json" \
  -d '{"message": "My computer is not working", "category": "IT"}' \
  -w "\nHTTP: %{http_code}\n"
```

## 🔍 문제 진단

### 현재 상태 확인
- ✅ **HTTP 200**: 연결 성공
- ❌ **Response Size: 0 bytes**: 응답 본문 없음

### 가능한 원인
1. **AI Agent 노드의 text 필드가 여전히 잘못됨**
   - 현재: `={{ $json.body.data.text }}`
   - 수정: `={{ $json.body.message }}` 또는 `={{ $json.message }}`

2. **Respond to Webhook 노드 설정 문제**
   - "Respond With" 설정 확인
   - Response Data 필드 확인

3. **워크플로우 실행 오류**
   - n8n 실행 로그 확인 필요

### 다음 확인사항
1. n8n에서 워크플로우 실행 로그 확인
2. AI Agent 노드의 text 필드가 `={{ $json.message }}`로 되어 있는지 확인  
3. Respond to Webhook 노드가 "All Incoming Items"로 설정되어 있는지 확인

## 🎯 성공시 예상 응답
```json
{
  "request_type": "...",
  "status": "success",
  "data": {...},
  "clarifying_questions": [...]
}
```

HTTP Code가 200이고 Response Size가 0보다 크면 성공입니다.