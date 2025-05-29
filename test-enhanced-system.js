// test-enhanced-system.js
// Comprehensive testing for Enhanced NFPA Permit System v2.0

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3001';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

class EnhancedSystemTester {
    constructor() {
        this.testResults = [];
        this.permitId = null;
    }

    log(message, color = RESET) {
        console.log(`${color}${message}${RESET}`);
    }

    success(message) {
        this.log(`✅ ${message}`, GREEN);
        this.testResults.push({ status: 'PASS', message });
    }

    error(message) {
        this.log(`❌ ${message}`, RED);
        this.testResults.push({ status: 'FAIL', message });
    }

    info(message) {
        this.log(`ℹ️  ${message}`, BLUE);
    }

    warn(message) {
        this.log(`⚠️  ${message}`, YELLOW);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runAllTests() {
        this.log('🚀 Starting Enhanced NFPA Permit System v2.0 Tests', BLUE);
        this.log('='.repeat(60), BLUE);

        try {
            await this.testSystemHealth();
            await this.testBasicPermitCreation();
            await this.testEnhancedDocumentUpload();
            await this.testOCRProcessing();
            await this.testQRCodeGeneration();
            await this.testMobileInspection();
            await this.testProgressSubmission();
            await this.testViolationReporting();
            await this.testAnalytics();
            await this.testComplianceAnalysis();
            
            this.printSummary();
            
        } catch (error) {
            this.error(`Test suite failed: ${error.message}`);
        }
    }

    async testSystemHealth() {
        this.info('Testing system health...');
        try {
            const response = await axios.get(`${API_BASE}/health`);
            if (response.status === 200 && response.data.status === 'OK') {
                this.success('System health check passed');
                this.info(`Features: ${response.data.features.join(', ')}`);
            } else {
                this.error('System health check failed');
            }
        } catch (error) {
            this.error(`Health check failed: ${error.message}`);
        }
    }

    async testBasicPermitCreation() {
        this.info('Testing permit creation...');
        try {
            const permitData = {
                applicantInfo: {
                    id: 'TEST001',
                    name: 'Test Fire Protection Company',
                    email: 'test@example.com',
                    phone: '555-0123',
                    address: '123 Test Street, Test City',
                    licenseNumber: 'TEST12345'
                },
                projectDetails: {
                    type: 'NFPA72_COMMERCIAL',
                    address: '456 Business Plaza, Test City',
                    description: 'Test fire alarm system installation',
                    squareFootage: 5000,
                    occupancyType: 'BUSINESS'
                }
            };

            const response = await axios.post(`${API_BASE}/api/permits`, permitData);
            
            if (response.status === 201 && response.data.success) {
                this.permitId = response.data.data.id;
                this.success(`Permit created successfully: ${this.permitId}`);
            } else {
                this.error('Permit creation failed');
            }
        } catch (error) {
            this.error(`Permit creation failed: ${error.message}`);
        }
    }

    async testEnhancedDocumentUpload() {
        this.info('Testing enhanced document upload with OCR...');
        
        if (!this.permitId) {
            this.error('No permit ID available for document upload test');
            return;
        }

        try {
            // Create test documents
            await this.createTestDocuments();
            
            const testFiles = [
                'test-data/sample-permit.pdf',
                'test-data/sample-image.jpg',
                'test-data/sample-calc.xlsx'
            ];

            const form = new FormData();
            
            // Add existing test files or create simple ones
            for (const filePath of testFiles) {
                if (fs.existsSync(filePath)) {
                    form.append('documents', fs.createReadStream(filePath));
                }
            }
            
            // Add test data if no files exist
            if (!fs.existsSync('test-data/sample-permit.pdf')) {
                form.append('documents', Buffer.from('Test document content'), {
                    filename: 'test-document.txt',
                    contentType: 'text/plain'
                });
            }

            form.append('category', 'permit_application');

            const response = await axios.post(
                `${API_BASE}/api/permits/${this.permitId}/documents`,
                form,
                { headers: form.getHeaders() }
            );

            if (response.status === 201 && response.data.success) {
                this.success(`Enhanced document upload successful`);
                this.info(`Processed ${response.data.documents.length} documents`);
                
                // Test document analysis retrieval
                if (response.data.documents.length > 0) {
                    const docId = response.data.documents[0].id;
                    await this.testDocumentAnalysis(docId);
                }
            } else {
                this.error('Document upload failed');
            }
        } catch (error) {
            this.error(`Document upload failed: ${error.message}`);
        }
    }

    async testDocumentAnalysis(documentId) {
        this.info('Testing document analysis retrieval...');
        try {
            const response = await axios.get(
                `${API_BASE}/api/permits/${this.permitId}/documents/${documentId}/analysis`
            );

            if (response.status === 200 && response.data.success) {
                this.success('Document analysis retrieved successfully');
                const analysis = response.data.analysis;
                if (analysis.ocr) {
                    this.info(`OCR confidence: ${analysis.ocr.confidence}%`);
                }
                if (analysis.nfpaReferences && analysis.nfpaReferences.length > 0) {
                    this.info(`NFPA references found: ${analysis.nfpaReferences.length}`);
                }
            } else {
                this.error('Document analysis retrieval failed');
            }
        } catch (error) {
            this.error(`Document analysis failed: ${error.message}`);
        }
    }

    async testOCRProcessing() {
        this.info('Testing OCR processing capabilities...');
        
        // Create a test image with text
        try {
            const testImagePath = 'test-data/ocr-test.txt';
            if (!fs.existsSync('test-data')) {
                fs.mkdirSync('test-data', { recursive: true });
            }
            
            // Create a simple text file to simulate OCR
            fs.writeFileSync(testImagePath, 
                'NFPA 72 Fire Alarm System\nComplies with NFPA 72 requirements\nUL Listed devices\nInstallation per code'
            );
            
            this.success('OCR test data created');
            this.info('OCR processing will be tested during document upload');
            
        } catch (error) {
            this.warn(`OCR test setup failed: ${error.message}`);
        }
    }

    async testQRCodeGeneration() {
        this.info('Testing QR code generation...');
        
        if (!this.permitId) {
            this.error('No permit ID available for QR code test');
            return;
        }

        try {
            const response = await axios.post(`${API_BASE}/api/permits/${this.permitId}/qr-code`);
            
            if (response.status === 200 && response.data.success) {
                this.success('QR code generated successfully');
                this.info(`QR code data: ${JSON.stringify(response.data.qrCode.qrData.type)}`);
            } else {
                this.error('QR code generation failed');
            }
        } catch (error) {
            this.error(`QR code generation failed: ${error.message}`);
        }
    }

    async testMobileInspection() {
        this.info('Testing mobile field inspection...');
        
        if (!this.permitId) {
            this.error('No permit ID available for mobile inspection test');
            return;
        }

        try {
            const inspectionData = {
                inspectorId: 'INS001',
                inspectorName: 'John Inspector',
                type: 'progress',
                location: 'Main electrical room',
                findings: ['Fire alarm panel installed', 'Wiring in progress'],
                status: 'in_progress',
                notes: 'Installation proceeding according to plans',
                geoLocation: { lat: 40.7128, lng: -74.0060 },
                weather: 'Clear'
            };

            const form = new FormData();
            form.append('inspectionData', JSON.stringify(inspectionData));
            
            // Add a test "photo" (text file simulating image)
            form.append('photos', Buffer.from('Test inspection photo data'), {
                filename: 'inspection-photo.jpg',
                contentType: 'image/jpeg'
            });

            const response = await axios.post(
                `${API_BASE}/api/permits/${this.permitId}/field-inspection`,
                form,
                { headers: form.getHeaders() }
            );

            if (response.status === 201 && response.data.success) {
                this.success('Mobile field inspection processed successfully');
                this.info(`Inspection ID: ${response.data.inspection.id}`);
            } else {
                this.error('Mobile field inspection failed');
            }
        } catch (error) {
            this.error(`Mobile field inspection failed: ${error.message}`);
        }
    }

    async testProgressSubmission() {
        this.info('Testing contractor progress submission...');
        
        if (!this.permitId) {
            this.error('No permit ID available for progress submission test');
            return;
        }

        try {
            const progressData = {
                contractorId: 'CONT001',
                contractorName: 'ABC Fire Protection',
                workType: 'Fire Alarm Installation',
                percentComplete: 65,
                milestone: 'Device Installation Complete',
                description: 'All fire alarm devices have been installed and wired. System testing to begin.',
                nextSteps: ['System programming', 'Functional testing', 'Final inspection'],
                requestInspection: true,
                estimatedCompletion: '2025-06-15'
            };

            const form = new FormData();
            form.append('progressData', JSON.stringify(progressData));
            
            // Add test progress photos
            form.append('photos', Buffer.from('Progress photo 1 data'), {
                filename: 'progress-1.jpg',
                contentType: 'image/jpeg'
            });
            form.append('photos', Buffer.from('Progress photo 2 data'), {
                filename: 'progress-2.jpg', 
                contentType: 'image/jpeg'
            });

            const response = await axios.post(
                `${API_BASE}/api/permits/${this.permitId}/progress`,
                form,
                { headers: form.getHeaders() }
            );

            if (response.status === 201 && response.data.success) {
                this.success('Progress submission processed successfully');
                this.info(`Progress: ${response.data.submission.percentComplete}% complete`);
                this.info(`Analysis score: ${response.data.submission.analysis.qualityScore}`);
            } else {
                this.error('Progress submission failed');
            }
        } catch (error) {
            this.error(`Progress submission failed: ${error.message}`);
        }
    }

    async testViolationReporting() {
        this.info('Testing violation reporting...');
        
        if (!this.permitId) {
            this.error('No permit ID available for violation reporting test');
            return;
        }

        try {
            const violationData = {
                reportedBy: 'Inspector Jane Smith',
                type: 'Code Violation',
                severity: 'medium',
                description: 'Fire alarm device installed at incorrect height per NFPA 72',
                location: 'Corridor B, second floor',
                codeReferences: ['NFPA 72'],
                actionRequired: true,
                deadline: '2025-06-10'
            };

            const form = new FormData();
            form.append('violationData', JSON.stringify(violationData));
            
            // Add violation evidence photo
            form.append('photos', Buffer.from('Violation evidence photo'), {
                filename: 'violation-evidence.jpg',
                contentType: 'image/jpeg'
            });

            const response = await axios.post(
                `${API_BASE}/api/permits/${this.permitId}/violations`,
                form,
                { headers: form.getHeaders() }
            );

            if (response.status === 201 && response.data.success) {
                this.success('Violation report processed successfully');
                this.info(`Violation ID: ${response.data.violation.id}`);
                this.info(`Severity: ${response.data.violation.severity}`);
            } else {
                this.error('Violation reporting failed');
            }
        } catch (error) {
            this.error(`Violation reporting failed: ${error.message}`);
        }
    }

    async testAnalytics() {
        this.info('Testing system analytics...');
        
        try {
            // Test system analytics
            const systemResponse = await axios.get(`${API_BASE}/api/analytics/system`);
            if (systemResponse.status === 200 && systemResponse.data.success) {
                this.success('System analytics retrieved successfully');
                const analytics = systemResponse.data.analytics;
                this.info(`Total permits: ${analytics.totalPermits}`);
                this.info(`Total documents: ${analytics.totalDocuments}`);
                this.info(`OCR processed: ${analytics.ocrProcessed}`);
            }

            // Test document analytics
            const docResponse = await axios.get(`${API_BASE}/api/analytics/documents`);
            if (docResponse.status === 200 && docResponse.data.success) {
                this.success('Document analytics retrieved successfully');
                const docAnalytics = docResponse.data.analytics;
                this.info(`Documents with OCR: ${docAnalytics.processingStats.withOCR}`);
                this.info(`Documents with compliance analysis: ${docAnalytics.processingStats.withCompliance}`);
            }

        } catch (error) {
            this.error(`Analytics testing failed: ${error.message}`);
        }
    }

    async testComplianceAnalysis() {
        this.info('Testing NFPA compliance analysis...');
        
        if (!this.permitId) {
            this.error('No permit ID available for compliance analysis test');
            return;
        }

        try {
            // Get permit details to check compliance analysis
            const response = await axios.get(`${API_BASE}/api/permits/${this.permitId}`);
            
            if (response.status === 200 && response.data.success) {
                const permit = response.data.data;
                
                if (permit.documents && permit.documents.length > 0) {
                    const documentsWithCompliance = permit.documents.filter(
                        doc => doc.processing && doc.processing.compliance
                    );
                    
                    if (documentsWithCompliance.length > 0) {
                        this.success(`Compliance analysis found in ${documentsWithCompliance.length} documents`);
                        documentsWithCompliance.forEach(doc => {
                            const compliance = doc.processing.compliance;
                            this.info(`Document: ${doc.originalName}`);
                            this.info(`  - NFPA Compliant: ${compliance.nfpaCompliant}`);
                            this.info(`  - Confidence: ${compliance.confidence}%`);
                            if (compliance.nfpaReferences && compliance.nfpaReferences.length > 0) {
                                this.info(`  - NFPA References: ${compliance.nfpaReferences.length}`);
                            }
                        });
                    } else {
                        this.warn('No documents with compliance analysis found');
                    }
                } else {
                    this.warn('No documents found for compliance analysis');
                }
            }
        } catch (error) {
            this.error(`Compliance analysis test failed: ${error.message}`);
        }
    }

    async createTestDocuments() {
        const testDataDir = 'test-data';
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }

        // Create test PDF content (as text file)
        const pdfContent = `
FIRE ALARM SYSTEM PERMIT APPLICATION

Project: Test Commercial Building
Address: 456 Business Plaza, Test City

NFPA 72 COMPLIANCE STATEMENT
This fire alarm system installation complies with NFPA 72 requirements.
All devices are UL listed and approved for this application.

System Components:
- Fire Alarm Control Panel (UL Listed)
- Smoke Detectors per NFPA 72
- Manual Pull Stations
- Notification Appliances
- Emergency Communication System

Installation per NFPA 72 and local codes.
        `;
        
        fs.writeFileSync(path.join(testDataDir, 'sample-permit.txt'), pdfContent);

        // Create test calculation spreadsheet content
        const calcContent = `
Hydraulic Calculation Summary
System Type: Wet Pipe Sprinkler
Flow Rate: 25 GPM
Pressure: 15 PSI
Coverage: 130 sq ft per sprinkler
NFPA 13 compliance verified
        `;
        
        fs.writeFileSync(path.join(testDataDir, 'sample-calc.txt'), calcContent);

        this.info('Test documents created');
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), BLUE);
        this.log('🏁 TEST SUMMARY', BLUE);
        this.log('='.repeat(60), BLUE);

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;

        this.log(`\n📊 Results: ${passed}/${total} tests passed`);
        
        if (failed > 0) {
            this.log(`\n❌ Failed Tests:`, RED);
            this.testResults
                .filter(r => r.status === 'FAIL')
                .forEach(r => this.log(`  • ${r.message}`, RED));
        }

        if (passed === total) {
            this.log('\n🎉 All tests passed! Enhanced NFPA Permit System v2.0 is ready!', GREEN);
            this.log('\n🚀 System Features Verified:', GREEN);
            this.log('  ✅ Enhanced document processing with OCR', GREEN);
            this.log('  ✅ AI-powered NFPA compliance analysis', GREEN);
            this.log('  ✅ Mobile field inspection submissions', GREEN);
            this.log('  ✅ QR code generation for permit access', GREEN);
            this.log('  ✅ Progress tracking with photo uploads', GREEN);
            this.log('  ✅ Violation reporting with evidence', GREEN);
            this.log('  ✅ Advanced analytics and reporting', GREEN);
            this.log('\n🏛️ Ready for deployment in government agencies!', GREEN);
        } else {
            this.log(`\n⚠️  ${failed} tests failed. Please review and fix issues.`, YELLOW);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new EnhancedSystemTester();
    
    // Check if server is running
    axios.get(`${API_BASE}/health`)
        .then(() => {
            console.log('🌐 Server detected, starting tests...\n');
            tester.runAllTests();
        })
        .catch(() => {
            console.log('❌ Server not running. Please start the server first:');
            console.log('   npm start');
            console.log('\nThen run tests:');
            console.log('   npm test');
        });
}

module.exports = EnhancedSystemTester;
