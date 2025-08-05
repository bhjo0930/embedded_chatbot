# Ollama CORS 설정 해결 방법

## 문제
Chrome 확장 프로그램에서 Ollama에 접근할 때 HTTP 403 Forbidden 오류가 발생합니다.

## 해결 방법

### 1. Ollama 서버 CORS 설정으로 재시작

#### macOS/Linux:
```bash
# Ollama 서버 중지
pkill ollama

# CORS 허용하여 재시작
OLLAMA_ORIGINS="chrome-extension://*" ollama serve
```

#### Windows (PowerShell):
```powershell
# Ollama 서버 중지
taskkill /f /im ollama.exe

# CORS 허용하여 재시작
$env:OLLAMA_ORIGINS="chrome-extension://*"
ollama serve
```

### 2. 영구적 설정 (권장)

#### macOS/Linux (.bashrc 또는 .zshrc에 추가):
```bash
export OLLAMA_ORIGINS="chrome-extension://*,http://localhost:*"
```

#### Windows (시스템 환경 변수):
1. 시스템 속성 → 고급 → 환경 변수
2. 새로 만들기: `OLLAMA_ORIGINS` = `chrome-extension://*,http://localhost:*`

### 3. 확인 방법

1. Ollama 서버 재시작 후 확장 프로그램에서 연결 테스트
2. 브라우저 개발자 도구에서 CORS 오류 확인
3. 설정 페이지에서 모델 목록이 정상적으로 로드되는지 확인

### 4. 추가 옵션

더 넓은 CORS 허용이 필요한 경우:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

**보안 주의사항**: `OLLAMA_ORIGINS="*"`는 모든 도메인에서 접근을 허용하므로 로컬 개발 환경에서만 사용하세요.