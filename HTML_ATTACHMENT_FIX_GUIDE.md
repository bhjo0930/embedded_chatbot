# HTML 첨부 기능 오류 수정 가이드

## 🔍 발견된 문제점들

### 1. **메시지 전송 로직 불일치**
- **문제**: 첨부파일이 포함된 `completeMessage`를 UI에 표시하지만, 실제 API 호출에는 사용자 텍스트(`message`)만 전송
- **결과**: AI가 HTML 내용을 볼 수 없어서 페이지 관련 질문에 답변 불가

### 2. **메시지 길이 제한 불일치**
- **Popup**: 2000자 제한
- **Sidebar**: 4000자 제한  
- **HTML 내용**: 2500자 제한
- **Utils 상수**: 2000자 제한

### 3. **첨부파일 길이 계산 누락**
- HTML 내용 + 첨부파일 태그 + 사용자 메시지 = 총 길이 초과 가능성

## ✅ 적용된 수정사항

### 1. **메시지 전송 로직 수정**
```javascript
// 수정 전: 사용자 텍스트만 전송
const response = await this.sendMessageToBackground(message);

// 수정 후: 첨부파일 포함 완전한 메시지 전송
const response = await this.sendMessageToBackground(message, completeMessage);
```

### 2. **HTML 내용 길이 최적화**
```javascript
// 수정 전: 2500자 제한
const maxLength = 2500;

// 수정 후: 1800자 제한 (첨부파일 태그와 사용자 메시지 공간 확보)
const maxLength = 1800;
```

### 3. **동적 입력 길이 제한**
- 첨부파일이 있을 때 사용자 입력 가능 길이를 동적으로 조정
- 실시간 문자 수 표시에 첨부파일 길이 포함
- 총 길이 초과 시 전송 버튼 비활성화

### 4. **메시지 길이 검증 추가**
```javascript
// 전송 전 총 길이 체크 및 자동 잘라내기
const maxTotalLength = 3800;
if (completeMessage.length > maxTotalLength) {
    completeMessage = completeMessage.substring(0, maxTotalLength) + '\n... (message truncated due to length)';
}
```

## 🧪 테스트 방법

### 1. **기본 HTML 첨부 테스트**
1. `test-html-attachment.html` 파일을 브라우저에서 열기
2. AI 챗봇 사이드바 열기
3. HTML 첨부 버튼(🌐) 클릭
4. 첨부파일이 입력 영역에 표시되는지 확인
5. "이 제품의 가격은 얼마인가요?" 질문 입력
6. AI가 "1,299,000원" 답변을 하는지 확인

### 2. **길이 제한 테스트**
1. HTML 첨부 후 긴 텍스트 입력
2. 문자 수 표시가 올바르게 업데이트되는지 확인
3. 제한 초과 시 전송 버튼이 비활성화되는지 확인
4. 첨부파일 제거 시 입력 길이가 복원되는지 확인

### 3. **다양한 페이지 테스트**
- 뉴스 사이트
- 쇼핑몰 상품 페이지
- 블로그 포스트
- 기술 문서

## 🔧 추가 개선사항

### 1. **에러 처리 강화**
```javascript
try {
    const pageHtml = this.getPageHtml();
    // ... 첨부 로직
} catch (error) {
    console.error('[AI Chatbot] Failed to add page HTML:', error);
    this.addMessage(`Error getting page HTML: ${error.message}`, 'bot', true);
}
```

### 2. **사용자 피드백 개선**
- HTML 첨부 성공 시 콘솔 로그
- 첨부파일 크기 정보 표시
- 길이 제한 경고 메시지

### 3. **성능 최적화**
- HTML 내용 추출 알고리즘 개선
- 불필요한 요소 제거 로직 강화
- 메타데이터 활용 확대

## 🚨 주의사항

### 1. **브라우저 호환성**
- Chrome Extension API 사용
- 일부 사이트에서 CSP(Content Security Policy) 제한 가능

### 2. **개인정보 보호**
- 민감한 정보가 포함된 페이지 첨부 시 주의
- 로그인 정보, 개인 데이터 등 자동 제외 필요

### 3. **API 제한**
- n8n/Ollama API의 메시지 길이 제한 확인 필요
- 토큰 수 제한 고려

## 📋 체크리스트

- [ ] HTML 첨부 버튼 클릭 시 첨부파일 생성 확인
- [ ] 첨부파일 포함 메시지가 AI에게 전달되는지 확인
- [ ] AI가 페이지 내용 기반 답변을 하는지 확인
- [ ] 문자 수 제한이 올바르게 작동하는지 확인
- [ ] 첨부파일 제거 기능이 정상 작동하는지 확인
- [ ] 다양한 웹사이트에서 테스트 완료
- [ ] 에러 상황 처리 확인
- [ ] 성능 이슈 없는지 확인

## 🔄 향후 개선 계획

1. **스마트 내용 추출**: AI를 활용한 더 정확한 내용 추출
2. **다중 첨부**: 여러 페이지 동시 첨부 기능
3. **첨부 미리보기**: 첨부된 내용 미리보기 기능
4. **자동 요약**: 긴 내용 자동 요약 기능
5. **템플릿 질문**: 페이지 유형별 추천 질문 제공