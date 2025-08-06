# Ollama Setup Guide

## 🦙 Ollama 설치 및 설정 가이드

이 가이드는 Chrome Extension AI Chatbot에서 Ollama를 사용하기 위한 설정 방법을 설명합니다.

## 📋 목차
- [Ollama 설치](#ollama-설치)
- [모델 다운로드](#모델-다운로드)
- [확장 프로그램 설정](#확장-프로그램-설정)
- [권장 모델](#권장-모델)
- [문제 해결](#문제-해결)

## 🛠️ Ollama 설치

### macOS
```bash
# Homebrew를 사용한 설치
brew install ollama

# 또는 공식 설치 프로그램 다운로드
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows
1. [Ollama 공식 웹사이트](https://ollama.ai/download)에서 Windows 설치 프로그램 다운로드
2. 다운로드한 파일을 실행하여 설치
3. 설치 완료 후 터미널에서 `ollama` 명령어 확인

### Linux
```bash
# 설치 스크립트 실행
curl -fsSL https://ollama.ai/install.sh | sh

# 또는 수동 설치
sudo curl -L https://ollama.ai/download/ollama-linux-amd64 -o /usr/local/bin/ollama
sudo chmod +x /usr/local/bin/ollama
```

## 🚀 Ollama 서비스 시작

### 백그라운드 서비스로 시작
```bash
# macOS/Linux
ollama serve

# Windows (PowerShell 관리자 권한)
ollama serve
```

### 서비스 상태 확인
```bash
# API 엔드포인트 테스트
curl http://localhost:11434/api/tags
```

## 📦 모델 다운로드

### 최신 및 권장 모델 (2025년 8월 기준)

Ollama 라이브러리는 계속해서 업데이트됩니다. 다음은 현재 인기 있고 성능이 검증된 모델들입니다.

#### 1. Qwen3 (최신, 다용도)
Alibaba의 최신 대규모 언어 모델 시리즈로, 다양한 크기의 모델을 제공하여 대부분의 작업에 적합합니다.
```bash
# Qwen3 8B 모델 (범용 추천)
ollama pull qwen3:8b

# Qwen3 32B 모델 (고성능)
ollama pull qwen3:32b

# Qwen3 1.7B 모델 (경량)
ollama pull qwen3:1.7b
```

#### 2. Mistral-Nemo (고급, 긴 컨텍스트)
Mistral AI와 NVIDIA가 협력하여 만든 12B 모델로, 128k의 긴 컨텍스트 길이를 지원하여 복잡한 문서 분석이나 긴 대화에 유리합니다.
```bash
# Mistral-Nemo 12B 모델
ollama pull mistral-nemo
```

#### 3. GPT-OSS (강력한 추론 및 에이전트)
OpenAI의 오픈 웨이트 모델로, 복잡한 문제 해결, 코드 생성, 자동화된 에이전트 작업에 뛰어난 성능을 보입니다.
```bash
# GPT-OSS 20B 모델
ollama pull gpt-oss:20b
```

#### 4. Llama 3 (검증된 고품질)
Meta의 검증된 고품질 응답 모델로, 여전히 많은 사용자들이 선호하는 강력한 모델입니다.
```bash
# Llama 3 8B 모델 (약 4.7GB)
ollama pull llama3

# Llama 3 70B 모델 (약 40GB) - 고성능 시스템용
ollama pull llama3:70b
```

#### 5. Qwen3-Coder (코딩 특화)
Alibaba의 코딩 및 에이전트 작업에 최적화된 모델로, 개발자에게 강력한 지원을 제공합니다.
```bash
# Qwen3-Coder 30B 모델
ollama pull qwen3-coder
```

### 모델 목록 확인
```bash
# 설치된 모델 목록 보기
ollama list

# 모델 정보 확인 (예: qwen3)
ollama show qwen3
```

### 모델 테스트
```bash
# 모델과 직접 대화 테스트
ollama run qwen3:8b
```

## ⚙️ 확장 프로그램 설정

### 1. 백엔드 선택
1. 확장 프로그램 팝업에서 **설정 버튼(⚙️)** 클릭
2. **AI Backend**에서 **"Ollama (Local)"** 선택
3. **Ollama URL** 설정:
   - 기본값: `http://localhost:11434`
   - 다른 서버: `http://192.168.1.100:11434` (원격 서버)
   - HTTPS: `https://your-ollama-server.com:11434` (SSL 사용)

### 2. 모델 선택
1. 설정에서 **Model** 드롭다운 확인
2. 원하는 모델 선택 (또는 "Auto-select"로 두기)
3. **Temperature** 조정 (0.1 = 일관성, 2.0 = 창의성)

### 3. 연결 테스트
1. **"Test Connection"** 버튼 클릭
2. 연결 상태 확인
3. 사용 가능한 모델 수 확인

## 🎯 카테고리별 최적 설정

### HR Assistant
- **모델**: `qwen3:8b` 또는 `llama3`
- **Temperature**: 0.3-0.5 (일관된 정책 답변)

### IT Support
- **모델**: `qwen3-coder` 또는 `gpt-oss:20b`
- **Temperature**: 0.2-0.4 (정확한 기술 정보)

### Data Analyst
- **모델**: `mistral-nemo` 또는 `llama3`
- **Temperature**: 0.3-0.6 (분석적 사고)

### Marketing Specialist
- **모델**: `qwen3:8b` 또는 `mistral-nemo`
- **Temperature**: 0.7-1.0 (창의적 아이디어)

### Legal Advisor
- **모델**: `llama3:70b` (가능한 경우) 또는 `gpt-oss:20b`
- **Temperature**: 0.1-0.3 (정확한 법적 정보)

## 🔧 고급 설정

### 커스텀 모델 파라미터
확장 프로그램에서 다음 설정을 조정할 수 있습니다:

- **Temperature**: 응답의 창의성 조절 (0.1-2.0)
- **Top P**: 토큰 선택 범위 조절 (0.1-1.0)
- **Top K**: 고려할 토큰 수 (1-100)

### 메모리 및 성능 최적화
```bash
# GPU 사용 설정 (NVIDIA GPU가 있는 경우)
export OLLAMA_GPU=1

# 메모리 제한 설정 (예: 8GB)
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_MAX_QUEUE=512
```

## 🚨 문제 해결

### 연결 실패
```bash
# Ollama 서비스 상태 확인
ps aux | grep ollama

# 포트 사용 확인
lsof -i :11434

# 서비스 재시작
pkill ollama
ollama serve
```

### 모델 로딩 실패
```bash
# 모델 재다운로드
ollama pull qwen3:8b

# 손상된 모델 제거 후 재설치
ollama rm qwen3:8b
ollama pull qwen3:8b
```

### 메모리 부족
```bash
# 더 작은 모델 사용
ollama pull qwen3:1.7b

# 또는 quantized 모델 사용
ollama pull llama3:8b-instruct-q4_0
```

### CORS 오류
Ollama는 기본적으로 localhost에서만 접근 가능합니다. 다른 도메인에서 접근하려면:

```bash
# 환경 변수 설정
export OLLAMA_ORIGINS="chrome-extension://*"
ollama serve
```

### 원격 서버 접근
다른 컴퓨터의 Ollama에 접근하려면:

```bash
# 모든 IP에서 접근 허용
export OLLAMA_HOST=0.0.0.0:11434
ollama serve

# 특정 IP에서만 접근 허용
export OLLAMA_HOST=192.168.1.100:11434
ollama serve
```

**보안 주의사항:**
- 원격 접근 시 방화벽 설정 확인
- 신뢰할 수 있는 네트워크에서만 사용
- 필요시 VPN 또는 SSH 터널 사용 권장

## 📊 성능 비교 (추정치)

| 모델 | 크기 (추정) | RAM 요구사항 (추정) | 속도 | 품질 | 주요 용도 |
|---|---|---|---|---|---|
| qwen3:1.7b | ~1.7GB | 4GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 빠른 응답, 경량 작업 |
| llama3:8b | 4.7GB | 8GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 고품질 범용 응답 |
| qwen3:8b | ~4.5GB | 8GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 최신 기술, 다용도 |
| mistral-nemo | ~7GB | 16GB | ⭐⭐⭐ | ⭐⭐⭐⭐ | 긴 컨텍스트, 분석 |
| gpt-oss:20b | ~11GB | 24GB | ⭐⭐ | ⭐⭐⭐⭐⭐ | 강력한 추론, 에이전트 |
| qwen3-coder:30b| ~17GB | 32GB | ⭐⭐ | ⭐⭐⭐⭐ | 코딩, 개발 지원 |
| llama3:70b | 40GB | 64GB | ⭐ | ⭐⭐⭐⭐⭐ | 최고 품질, 전문가용 |

## 🔄 업데이트 및 유지보수

### 모델 업데이트
```bash
# 최신 버전으로 업데이트
ollama pull llama3

# 구버전 제거
ollama rm llama3:old-version
```

### Ollama 업데이트
```bash
# macOS (Homebrew)
brew upgrade ollama

# Linux/Windows
curl -fsSL https://ollama.ai/install.sh | sh
```

## 💡 팁과 권장사항

### 1. 시스템 요구사항
- **최소**: 8GB RAM, 10GB 저장공간
- **권장**: 16GB RAM, 50GB 저장공간
- **최적**: 32GB RAM, SSD, GPU 지원

### 2. 모델 선택 가이드
- **일반 사용**: `llama3` 또는 `mistral`
- **빠른 응답**: `gemma:2b` 또는 `mistral:7b`
- **코딩 도움**: `codellama`
- **최고 품질**: `llama3:70b` (고사양 시스템)

### 3. 성능 최적화
- SSD 사용 권장
- 충분한 RAM 확보
- GPU 가속 활용 (가능한 경우)
- 불필요한 모델 정리

### 4. 네트워크 설정
- **로컬 사용**: `http://localhost:11434` (기본값)
- **같은 네트워크**: `http://192.168.1.100:11434`
- **원격 접근**: VPN 또는 SSH 터널 사용 권장
- **포트 변경**: `OLLAMA_HOST=0.0.0.0:8080` 환경변수 설정

### 5. 보안 고려사항
- 기본적으로 로컬에서만 접근 가능
- 원격 접근 시 방화벽 설정 필수
- 민감한 데이터 처리 시 주의
- HTTPS 사용 권장 (원격 접근 시)

## 🆘 지원 및 커뮤니티

- **Ollama 공식 문서**: https://ollama.ai/docs
- **GitHub 저장소**: https://github.com/ollama/ollama
- **Discord 커뮤니티**: https://discord.gg/ollama
- **Reddit**: r/ollama

---

**이 가이드를 따라하시면 Chrome Extension AI Chatbot에서 Ollama를 성공적으로 사용하실 수 있습니다. 추가 질문이 있으시면 언제든 문의해 주세요!**