#!/usr/bin/env node

/**
 * n8n Webhook Automated Testing Script
 * Tests webhook connectivity, response format, and all categories
 */

const fs = require('fs');
const path = require('path');

// Load configuration
let config;
try {
    const configPath = path.join(__dirname, 'webhook-config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
    console.error('❌ Failed to load webhook-config.json:', error.message);
    console.log('📝 Please create webhook-config.json with your webhook URL');
    process.exit(1);
}

class WebhookTester {
    constructor() {
        this.config = config;
        this.results = {
            startTime: new Date().toISOString(),
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            testResults: [],
            summary: {}
        };
    }

    /**
     * Run all webhook tests
     */
    async runAllTests() {
        console.log('🚀 Starting n8n Webhook Tests');
        console.log('=' .repeat(50));
        console.log(`📡 Webhook URL: ${this.config.webhookUrl}`);
        console.log(`⏱️  Timeout: ${this.config.testSettings.timeout}ms`);
        console.log('=' .repeat(50));

        // Test 1: Basic connectivity
        await this.testConnectivity();

        // Test 2: Response format validation
        await this.testResponseFormat();

        // Test 3: All categories
        await this.testAllCategories();

        // Test 4: Error handling
        await this.testErrorHandling();

        // Generate report
        this.generateReport();
    }

    /**
     * Test basic connectivity
     */
    async testConnectivity() {
        console.log('\n🔍 Testing Basic Connectivity...');
        
        const testCase = {
            name: 'Basic Connectivity',
            category: 'connectivity',
            startTime: Date.now()
        };

        try {
            const response = await this.makeRequest('GENERAL', 'Connection test');
            
            testCase.passed = response.ok;
            testCase.status = response.status;
            testCase.statusText = response.statusText;
            testCase.responseTime = Date.now() - testCase.startTime;

            if (response.ok) {
                console.log('✅ Connectivity: PASSED');
                console.log(`   Status: ${response.status} ${response.statusText}`);
                console.log(`   Response Time: ${testCase.responseTime}ms`);
                this.results.passedTests++;
            } else {
                console.log('❌ Connectivity: FAILED');
                console.log(`   Status: ${response.status} ${response.statusText}`);
                testCase.error = `HTTP ${response.status}`;
                this.results.failedTests++;
            }

        } catch (error) {
            testCase.passed = false;
            testCase.error = error.message;
            testCase.responseTime = Date.now() - testCase.startTime;
            
            console.log('❌ Connectivity: FAILED');
            console.log(`   Error: ${error.message}`);
            this.results.failedTests++;
        }

        this.results.testResults.push(testCase);
        this.results.totalTests++;
    }

    /**
     * Test response format validation
     */
    async testResponseFormat() {
        console.log('\n🔍 Testing Response Format...');
        
        const testCase = {
            name: 'Response Format Validation',
            category: 'format',
            startTime: Date.now()
        };

        try {
            const response = await this.makeRequest('GENERAL', 'Format test');
            const responseText = await response.text();
            
            testCase.responseTime = Date.now() - testCase.startTime;
            testCase.status = response.status;
            testCase.rawResponse = responseText.substring(0, 200);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (!responseText.trim()) {
                throw new Error('Empty response from webhook');
            }

            // Try to parse JSON
            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseText);
                testCase.parsedResponse = parsedResponse;
            } catch (parseError) {
                throw new Error(`Invalid JSON: ${parseError.message}`);
            }

            // Skip field validation for n8n array format
            if (!Array.isArray(parsedResponse)) {
                const requiredFields = this.config.expectedResponseFormat.requiredFields;
                const missingFields = requiredFields.filter(field => !(field in parsedResponse));
                
                if (missingFields.length > 0) {
                    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                }
            }

            // Extract message - handle n8n array format
            let message;
            if (Array.isArray(parsedResponse) && parsedResponse.length > 0 && parsedResponse[0].output) {
                message = parsedResponse[0].output;
            } else {
                message = parsedResponse.message || parsedResponse.response || parsedResponse.text || parsedResponse.content || parsedResponse.output;
            }
            if (!message) {
                throw new Error('No message content found in response');
            }

            testCase.passed = true;
            testCase.extractedMessage = message;
            
            console.log('✅ Response Format: PASSED');
            console.log(`   Response Time: ${testCase.responseTime}ms`);
            console.log(`   Message: "${message.substring(0, 50)}..."`);
            this.results.passedTests++;

        } catch (error) {
            testCase.passed = false;
            testCase.error = error.message;
            
            console.log('❌ Response Format: FAILED');
            console.log(`   Error: ${error.message}`);
            if (testCase.rawResponse) {
                console.log(`   Raw Response: ${testCase.rawResponse}...`);
            }
            this.results.failedTests++;
        }

        this.results.testResults.push(testCase);
        this.results.totalTests++;
    }

    /**
     * Test all categories
     */
    async testAllCategories() {
        console.log('\n🔍 Testing All Categories...');
        
        for (const category of this.config.testSettings.categories) {
            const testCase = {
                name: `Category: ${category}`,
                category: 'categories',
                categoryType: category,
                startTime: Date.now()
            };

            try {
                const testMessage = `Test message for ${category} category`;
                const response = await this.makeRequest(category, testMessage);
                const responseText = await response.text();
                
                testCase.responseTime = Date.now() - testCase.startTime;
                testCase.status = response.status;

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const parsedResponse = JSON.parse(responseText);
                let message;
                if (Array.isArray(parsedResponse) && parsedResponse.length > 0 && parsedResponse[0].output) {
                    message = parsedResponse[0].output;
                } else {
                    message = parsedResponse.message || parsedResponse.response || parsedResponse.text || parsedResponse.content || parsedResponse.output;
                }
                
                testCase.passed = true;
                testCase.extractedMessage = message;
                
                console.log(`✅ Category ${category}: PASSED (${testCase.responseTime}ms)`);
                this.results.passedTests++;

            } catch (error) {
                testCase.passed = false;
                testCase.error = error.message;
                
                console.log(`❌ Category ${category}: FAILED - ${error.message}`);
                this.results.failedTests++;
            }

            this.results.testResults.push(testCase);
            this.results.totalTests++;
        }
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('\n🔍 Testing Error Handling...');
        
        // Test with very long message
        const longMessage = 'A'.repeat(5000);
        const testCase = {
            name: 'Long Message Handling',
            category: 'error-handling',
            startTime: Date.now()
        };

        try {
            const response = await this.makeRequest('GENERAL', longMessage);
            testCase.responseTime = Date.now() - testCase.startTime;
            testCase.status = response.status;
            
            // Should either accept or gracefully reject
            testCase.passed = true;
            console.log(`✅ Long Message: PASSED (Status: ${response.status})`);
            this.results.passedTests++;

        } catch (error) {
            testCase.passed = false;
            testCase.error = error.message;
            
            console.log(`❌ Long Message: FAILED - ${error.message}`);
            this.results.failedTests++;
        }

        this.results.testResults.push(testCase);
        this.results.totalTests++;
    }

    /**
     * Make request to webhook
     */
    async makeRequest(category, message) {
        const payload = {
            data: {
                text: message,
                category: category
            },
            timestamp: new Date().toISOString(),
            sessionId: `test_${Date.now()}`,
            userId: 'webhook-tester',
            metadata: {
                source: 'webhook-tester',
                version: '1.0.0',
                agentType: category,
                isTest: true
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.testSettings.timeout);

        try {
            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response;

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * Generate test report
     */
    generateReport() {
        this.results.endTime = new Date().toISOString();
        this.results.duration = Date.now() - new Date(this.results.startTime).getTime();
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST REPORT');
        console.log('='.repeat(50));
        
        console.log(`🕐 Start Time: ${this.results.startTime}`);
        console.log(`🕐 End Time: ${this.results.endTime}`);
        console.log(`⏱️  Duration: ${this.results.duration}ms`);
        console.log(`📈 Total Tests: ${this.results.totalTests}`);
        console.log(`✅ Passed: ${this.results.passedTests}`);
        console.log(`❌ Failed: ${this.results.failedTests}`);
        console.log(`📊 Success Rate: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)}%`);

        // Category breakdown
        const categoryResults = this.results.testResults
            .filter(r => r.category === 'categories')
            .reduce((acc, r) => {
                acc[r.categoryType] = r.passed ? 'PASSED' : 'FAILED';
                return acc;
            }, {});

        if (Object.keys(categoryResults).length > 0) {
            console.log('\n📋 Category Results:');
            Object.entries(categoryResults).forEach(([cat, result]) => {
                const icon = result === 'PASSED' ? '✅' : '❌';
                console.log(`   ${icon} ${cat}: ${result}`);
            });
        }

        // Failed tests details
        const failedTests = this.results.testResults.filter(r => !r.passed);
        if (failedTests.length > 0) {
            console.log('\n❌ Failed Tests Details:');
            failedTests.forEach(test => {
                console.log(`   • ${test.name}: ${test.error}`);
            });
        }

        // Recommendations
        console.log('\n💡 Recommendations:');
        if (this.results.failedTests === 0) {
            console.log('   🎉 All tests passed! Your webhook is working correctly.');
        } else {
            console.log('   🔧 Check your n8n workflow configuration');
            console.log('   📝 Ensure "Respond to Webhook" node returns valid JSON');
            console.log('   🔗 Verify webhook URL is correct and accessible');
        }

        // Save report to file
        const reportPath = path.join(__dirname, 'webhook-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        console.log('='.repeat(50));

        // Exit with appropriate code
        process.exit(this.results.failedTests > 0 ? 1 : 0);
    }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ This script requires Node.js 18+ with fetch support');
    console.log('💡 Or install node-fetch: npm install node-fetch');
    process.exit(1);
}

// Run tests
const tester = new WebhookTester();
tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});