/**
 * Internationalization (i18n) Support
 * 다국어 지원을 위한 기본 구조
 */
class I18n {
    constructor() {
        this.currentLanguage = 'ko';
        this.translations = {};
        this.fallbackLanguage = 'en';
        
        this.loadTranslations();
    }

    async loadTranslations() {
        // 기본 번역 데이터
        this.translations = {
            ko: {
                // UI 텍스트
                'ui.send': '전송',
                'ui.settings': '설정',
                'ui.clear_chat': '채팅 지우기',
                'ui.typing': 'AI가 입력 중...',
                'ui.connected': '연결됨',
                'ui.disconnected': '연결 끊김',
                'ui.retry': '다시 시도',
                
                // 카테고리
                'category.GENERAL': '일반',
                'category.HR': '인사',
                'category.IT': 'IT',
                'category.DATA': '데이터',
                'category.FINANCE': '재무',
                'category.MARKETING': '마케팅',
                'category.LEGAL': '법무',
                'category.SECURITY': '보안',
                
                // 메시지
                'message.welcome': '👋 안녕하세요! AI 어시스턴트입니다. 어떻게 도와드릴까요?',
                'message.error.network': '네트워크 연결을 확인하고 다시 시도해주세요.',
                'message.error.timeout': '응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
                'message.error.empty_response': 'n8n 워크플로우에서 응답을 받지 못했습니다. 워크플로우 설정을 확인해주세요.',
                'message.error.general': '메시지 전송 중 오류가 발생했습니다. 다시 시도해주세요.',
                
                // 설정
                'settings.title': '설정',
                'settings.webhook_url': 'n8n Webhook URL',
                'settings.timeout': '요청 타임아웃 (초)',
                'settings.save_history': '채팅 기록 저장',
                'settings.save': '설정 저장',
                'settings.cancel': '취소',
                'settings.test_connection': '연결 테스트',
                
                // 키보드 단축키 도움말
                'help.shortcuts': '키보드 단축키',
                'help.enter': 'Enter: 메시지 전송',
                'help.ctrl_k': 'Ctrl+K: 채팅 지우기',
                'help.ctrl_comma': 'Ctrl+,: 설정 열기',
                'help.ctrl_numbers': 'Ctrl+1-8: 카테고리 선택',
                'help.escape': 'ESC: 모달 닫기'
            },
            en: {
                // UI Text
                'ui.send': 'Send',
                'ui.settings': 'Settings',
                'ui.clear_chat': 'Clear Chat',
                'ui.typing': 'AI is typing...',
                'ui.connected': 'Connected',
                'ui.disconnected': 'Disconnected',
                'ui.retry': 'Retry',
                
                // Categories
                'category.GENERAL': 'General',
                'category.HR': 'HR',
                'category.IT': 'IT',
                'category.DATA': 'Data',
                'category.FINANCE': 'Finance',
                'category.MARKETING': 'Marketing',
                'category.LEGAL': 'Legal',
                'category.SECURITY': 'Security',
                
                // Messages
                'message.welcome': '👋 Hello! I\'m your AI assistant. How can I help you today?',
                'message.error.network': 'Please check your network connection and try again.',
                'message.error.timeout': 'Request timeout. Please try again later.',
                'message.error.empty_response': 'No response received from n8n workflow. Please check your workflow configuration.',
                'message.error.general': 'An error occurred while sending the message. Please try again.',
                
                // Settings
                'settings.title': 'Settings',
                'settings.webhook_url': 'n8n Webhook URL',
                'settings.timeout': 'Request Timeout (seconds)',
                'settings.save_history': 'Save Chat History',
                'settings.save': 'Save Settings',
                'settings.cancel': 'Cancel',
                'settings.test_connection': 'Test Connection',
                
                // Keyboard shortcuts help
                'help.shortcuts': 'Keyboard Shortcuts',
                'help.enter': 'Enter: Send message',
                'help.ctrl_k': 'Ctrl+K: Clear chat',
                'help.ctrl_comma': 'Ctrl+,: Open settings',
                'help.ctrl_numbers': 'Ctrl+1-8: Select category',
                'help.escape': 'ESC: Close modal'
            }
        };
    }

    /**
     * Get translated text
     */
    t(key, params = {}) {
        const translation = this.getTranslation(key);
        return this.interpolate(translation, params);
    }

    /**
     * Get translation for current language with fallback
     */
    getTranslation(key) {
        const currentLangTranslations = this.translations[this.currentLanguage];
        const fallbackTranslations = this.translations[this.fallbackLanguage];
        
        return currentLangTranslations?.[key] || 
               fallbackTranslations?.[key] || 
               key;
    }

    /**
     * Interpolate parameters into translation string
     */
    interpolate(text, params) {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return params[key] || match;
        });
    }

    /**
     * Set current language
     */
    async setLanguage(language) {
        if (this.translations[language]) {
            this.currentLanguage = language;
            await this.saveLanguagePreference(language);
            this.updateUI();
        }
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get available languages
     */
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }

    /**
     * Save language preference
     */
    async saveLanguagePreference(language) {
        try {
            await chrome.storage.local.set({ language });
        } catch (error) {
            console.error('Failed to save language preference:', error);
        }
    }

    /**
     * Load language preference
     */
    async loadLanguagePreference() {
        try {
            const result = await chrome.storage.local.get(['language']);
            if (result.language && this.translations[result.language]) {
                this.currentLanguage = result.language;
            } else {
                // 브라우저 언어 감지
                const browserLang = navigator.language.split('-')[0];
                if (this.translations[browserLang]) {
                    this.currentLanguage = browserLang;
                }
            }
        } catch (error) {
            console.error('Failed to load language preference:', error);
        }
    }

    /**
     * Update UI with current language
     */
    updateUI() {
        // data-i18n 속성을 가진 모든 요소 업데이트
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });

        // data-i18n-title 속성을 가진 요소들의 title 업데이트
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }

    /**
     * Initialize i18n system
     */
    async init() {
        await this.loadLanguagePreference();
        this.updateUI();
    }
}

// 전역 i18n 인스턴스 생성
const i18n = new I18n();

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, i18n };
} else {
    window.I18n = I18n;
    window.i18n = i18n;
}