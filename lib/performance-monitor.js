/**
 * Performance Monitor
 * 확장 프로그램의 성능을 모니터링하고 분석하는 도구
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            apiCalls: [],
            uiRenderTimes: [],
            memoryUsage: [],
            errorCounts: {},
            userInteractions: []
        };
        this.isEnabled = false;
        this.maxMetricsCount = 1000; // 최대 저장할 메트릭 수
        
        this.init();
    }

    async init() {
        // 디버그 모드에서만 활성화
        const settings = await this.getSettings();
        this.isEnabled = settings.debugMode === true;
        
        if (this.isEnabled) {
            this.startMonitoring();
        }
    }

    async getSettings() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            return result.settings || {};
        } catch (error) {
            return {};
        }
    }

    startMonitoring() {
        // 메모리 사용량 주기적 체크
        setInterval(() => {
            this.recordMemoryUsage();
        }, 30000); // 30초마다

        // 페이지 성능 관찰
        if (window.PerformanceObserver) {
            this.observePerformance();
        }

        console.log('Performance monitoring started');
    }

    /**
     * API 호출 성능 측정
     */
    async measureApiCall(apiFunction, metadata = {}) {
        if (!this.isEnabled) {
            return await apiFunction();
        }

        const startTime = performance.now();
        const startMemory = this.getCurrentMemoryUsage();
        
        try {
            const result = await apiFunction();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.recordApiCall({
                duration,
                success: true,
                timestamp: Date.now(),
                memoryDelta: this.getCurrentMemoryUsage() - startMemory,
                ...metadata
            });
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            this.recordApiCall({
                duration,
                success: false,
                error: error.message,
                timestamp: Date.now(),
                memoryDelta: this.getCurrentMemoryUsage() - startMemory,
                ...metadata
            });
            
            throw error;
        }
    }

    /**
     * UI 렌더링 성능 측정
     */
    measureUIRender(renderFunction, componentName) {
        if (!this.isEnabled) {
            return renderFunction();
        }

        const startTime = performance.now();
        
        try {
            const result = renderFunction();
            const endTime = performance.now();
            
            this.recordUIRender({
                componentName,
                duration: endTime - startTime,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            this.recordError('ui_render', error.message);
            throw error;
        }
    }

    /**
     * 사용자 상호작용 기록
     */
    recordUserInteraction(action, details = {}) {
        if (!this.isEnabled) return;

        this.metrics.userInteractions.push({
            action,
            timestamp: Date.now(),
            ...details
        });

        this.trimMetrics('userInteractions');
    }

    /**
     * API 호출 기록
     */
    recordApiCall(data) {
        this.metrics.apiCalls.push(data);
        this.trimMetrics('apiCalls');
    }

    /**
     * UI 렌더링 기록
     */
    recordUIRender(data) {
        this.metrics.uiRenderTimes.push(data);
        this.trimMetrics('uiRenderTimes');
    }

    /**
     * 메모리 사용량 기록
     */
    recordMemoryUsage() {
        const usage = this.getCurrentMemoryUsage();
        this.metrics.memoryUsage.push({
            usage,
            timestamp: Date.now()
        });
        this.trimMetrics('memoryUsage');
    }

    /**
     * 에러 기록
     */
    recordError(category, message) {
        if (!this.metrics.errorCounts[category]) {
            this.metrics.errorCounts[category] = [];
        }
        
        this.metrics.errorCounts[category].push({
            message,
            timestamp: Date.now()
        });
    }

    /**
     * 현재 메모리 사용량 가져오기
     */
    getCurrentMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * 성능 관찰자 설정
     */
    observePerformance() {
        // Long Task 관찰
        try {
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    console.warn('Long task detected:', entry.duration + 'ms');
                    this.recordError('long_task', `Duration: ${entry.duration}ms`);
                }
            });
            longTaskObserver.observe({ entryTypes: ['longtask'] });
        } catch (error) {
            console.log('Long task observer not supported');
        }

        // Layout Shift 관찰
        try {
            const layoutShiftObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.value > 0.1) { // CLS threshold
                        console.warn('Layout shift detected:', entry.value);
                        this.recordError('layout_shift', `Value: ${entry.value}`);
                    }
                }
            });
            layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
            console.log('Layout shift observer not supported');
        }
    }

    /**
     * 메트릭 배열 크기 제한
     */
    trimMetrics(metricName) {
        if (this.metrics[metricName].length > this.maxMetricsCount) {
            this.metrics[metricName] = this.metrics[metricName].slice(-this.maxMetricsCount);
        }
    }

    /**
     * 성능 리포트 생성
     */
    generateReport() {
        if (!this.isEnabled) {
            return { error: 'Performance monitoring is disabled' };
        }

        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);

        // 최근 1시간 데이터 필터링
        const recentApiCalls = this.metrics.apiCalls.filter(call => call.timestamp > oneHourAgo);
        const recentUIRenders = this.metrics.uiRenderTimes.filter(render => render.timestamp > oneHourAgo);
        const recentMemoryUsage = this.metrics.memoryUsage.filter(usage => usage.timestamp > oneHourAgo);

        return {
            timestamp: now,
            period: '1 hour',
            apiCalls: {
                total: recentApiCalls.length,
                successful: recentApiCalls.filter(call => call.success).length,
                failed: recentApiCalls.filter(call => !call.success).length,
                averageDuration: this.calculateAverage(recentApiCalls.map(call => call.duration)),
                slowestCall: Math.max(...recentApiCalls.map(call => call.duration), 0)
            },
            uiRenders: {
                total: recentUIRenders.length,
                averageDuration: this.calculateAverage(recentUIRenders.map(render => render.duration)),
                slowestRender: Math.max(...recentUIRenders.map(render => render.duration), 0)
            },
            memory: {
                current: this.getCurrentMemoryUsage(),
                average: this.calculateAverage(recentMemoryUsage.map(usage => usage.usage)),
                peak: Math.max(...recentMemoryUsage.map(usage => usage.usage), 0)
            },
            errors: this.getRecentErrors(oneHourAgo),
            userInteractions: this.metrics.userInteractions.filter(interaction => interaction.timestamp > oneHourAgo).length
        };
    }

    /**
     * 평균값 계산
     */
    calculateAverage(numbers) {
        if (numbers.length === 0) return 0;
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    /**
     * 최근 에러 가져오기
     */
    getRecentErrors(since) {
        const recentErrors = {};
        
        for (const [category, errors] of Object.entries(this.metrics.errorCounts)) {
            const recent = errors.filter(error => error.timestamp > since);
            if (recent.length > 0) {
                recentErrors[category] = recent.length;
            }
        }
        
        return recentErrors;
    }

    /**
     * 성능 데이터 내보내기
     */
    exportData() {
        return {
            metrics: this.metrics,
            report: this.generateReport(),
            exportTime: Date.now()
        };
    }

    /**
     * 성능 데이터 지우기
     */
    clearData() {
        this.metrics = {
            apiCalls: [],
            uiRenderTimes: [],
            memoryUsage: [],
            errorCounts: {},
            userInteractions: []
        };
    }

    /**
     * 성능 경고 확인
     */
    checkPerformanceWarnings() {
        const report = this.generateReport();
        const warnings = [];

        // API 호출 성능 경고
        if (report.apiCalls.averageDuration > 5000) {
            warnings.push('API calls are taking longer than 5 seconds on average');
        }

        // 메모리 사용량 경고
        if (report.memory.current > 50 * 1024 * 1024) { // 50MB
            warnings.push('Memory usage is high (>50MB)');
        }

        // 에러율 경고
        const errorRate = report.apiCalls.failed / (report.apiCalls.total || 1);
        if (errorRate > 0.1) {
            warnings.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
        }

        return warnings;
    }
}

// 전역 성능 모니터 인스턴스
const performanceMonitor = new PerformanceMonitor();

// Export for use in extension
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceMonitor, performanceMonitor };
} else {
    window.PerformanceMonitor = PerformanceMonitor;
    window.performanceMonitor = performanceMonitor;
}