const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const fs = require('fs');

class NFPACodeAnalyzer {
    constructor() {
        this.model = null;
        this.nfpaCodes = this.loadNFPACodes();
        this.tokenizer = new natural.WordTokenizer();
    }

    loadNFPACodes() {
        return {
            'NFPA 72': {
                sections: {
                    '10.4.1': 'Smoke detectors shall be installed in accordance with their listing',
                    '17.7.1': 'Mass notification systems shall be designed for intelligibility',
                    '23.8.1': 'Fire alarm systems shall be tested annually'
                },
                keywords: ['smoke detector', 'fire alarm', 'notification', 'detection', 'annunciation']
            },
            'NFPA 13': {
                sections: {
                    '8.3.1': 'Sprinkler spacing shall not exceed maximum listed spacing',
                    '11.2.1': 'Water supply shall be adequate for sprinkler demand',
                    '16.1.1': 'System testing shall be conducted per manufacturer requirements'
                },
                keywords: ['sprinkler', 'water supply', 'hydraulic', 'pressure', 'flow']
            },
            'NFPA 25': {
                sections: {
                    '4.1.1': 'Inspection, testing and maintenance shall be conducted regularly',
                    '5.2.1': 'Water-based systems require quarterly inspections',
                    '13.2.1': 'Records shall be maintained for all ITM activities'
                },
                keywords: ['inspection', 'testing', 'maintenance', 'ITM', 'records']
            }
        };
    }

    async analyzeProject(projectDescription, systemType, occupancyType) {
        print_info(`Analyzing project: ${systemType} for ${occupancyType} occupancy`);
        
        const tokens = this.tokenizer.tokenize(projectDescription.toLowerCase());
        const relevantCode = this.nfpaCodes[systemType] || this.nfpaCodes['NFPA 72'];
        
        const compliance = this.checkCompliance(tokens, relevantCode, occupancyType);
        const recommendations = this.generateRecommendations(compliance, systemType);
        const riskScore = this.calculateRiskScore(compliance, occupancyType);
        
        return {
            systemType,
            occupancyType,
            complianceScore: compliance.score,
            riskScore,
            violations: compliance.violations,
            recommendations,
            requiredInspections: this.getRequiredInspections(systemType),
            estimatedReviewTime: this.estimateReviewTime(riskScore, systemType),
            aiConfidence: compliance.confidence
        };
    }

    checkCompliance(tokens, relevantCode, occupancyType) {
        let score = 85; // Base compliance score
        let violations = [];
        let confidence = 0.8;

        // Check for key compliance indicators
        const hasSmokDetection = tokens.some(token => 
            ['smoke', 'detector', 'detection'].includes(token));
        const hasSprinklerSystem = tokens.some(token => 
            ['sprinkler', 'suppression', 'water'].includes(token));
        const hasEmergencyLighting = tokens.some(token => 
            ['emergency', 'lighting', 'illumination'].includes(token));

        // Occupancy-specific checks
        if (occupancyType === 'ASSEMBLY' && !hasEmergencyLighting) {
            violations.push({
                code: 'NFPA 101 7.9.1',
                description: 'Emergency lighting required for assembly occupancies',
                severity: 'HIGH',
                recommendation: 'Install emergency lighting systems per NFPA 101'
            });
            score -= 15;
        }

        if (occupancyType === 'BUSINESS' && !hasSmokDetection) {
            violations.push({
                code: 'NFPA 72 17.7.1',
                description: 'Smoke detection required for business occupancies',
                severity: 'MEDIUM',
                recommendation: 'Install smoke detection system per NFPA 72'
            });
            score -= 10;
        }

        // High-risk occupancy additional requirements
        if (['HEALTHCARE', 'EDUCATIONAL'].includes(occupancyType)) {
            if (!hasSprinklerSystem) {
                violations.push({
                    code: 'NFPA 13 8.3.1',
                    description: 'Automatic sprinkler protection required',
                    severity: 'CRITICAL',
                    recommendation: 'Install complete sprinkler system per NFPA 13'
                });
                score -= 25;
                confidence = 0.95;
            }
        }

        return { score: Math.max(score, 0), violations, confidence };
    }

    generateRecommendations(compliance, systemType) {
        const recommendations = [];

        if (compliance.violations.length === 0) {
            recommendations.push({
                type: 'APPROVAL',
                priority: 'LOW',
                action: 'Project appears compliant - recommend approval with standard inspections'
            });
        } else {
            compliance.violations.forEach(violation => {
                recommendations.push({
                    type: 'CORRECTION',
                    priority: violation.severity,
                    action: violation.recommendation,
                    code: violation.code
                });
            });
        }

        // System-specific recommendations
        if (systemType === 'NFPA 72') {
            recommendations.push({
                type: 'INSPECTION',
                priority: 'MEDIUM',
                action: 'Schedule commissioning and acceptance testing per NFPA 72 Chapter 14'
            });
        }

        return recommendations;
    }

    calculateRiskScore(compliance, occupancyType) {
        let riskScore = 100 - compliance.score;

        // Occupancy risk multipliers
        const riskMultipliers = {
            'HEALTHCARE': 1.5,
            'EDUCATIONAL': 1.3,
            'ASSEMBLY': 1.4,
            'BUSINESS': 1.0,
            'INDUSTRIAL': 1.2,
            'RESIDENTIAL': 0.8
        };

        riskScore *= (riskMultipliers[occupancyType] || 1.0);
        return Math.min(Math.round(riskScore), 100);
    }

    getRequiredInspections(systemType) {
        const inspections = {
            'NFPA 72': [
                'Pre-installation meeting',
                'Rough-in inspection',
                'Final acceptance testing',
                'System commissioning'
            ],
            'NFPA 13': [
                'Underground piping inspection',
                'Rough-in inspection', 
                'Final hydrostatic test',
                'System acceptance test'
            ],
            'NFPA 25': [
                'Initial system inspection',
                'Quarterly maintenance check',
                'Annual system test'
            ]
        };

        return inspections[systemType] || inspections['NFPA 72'];
    }

    estimateReviewTime(riskScore, systemType) {
        let baseDays = {
            'NFPA 72': 3,
            'NFPA 13': 5,
            'NFPA 25': 2
        }[systemType] || 3;

        // Adjust based on risk
        if (riskScore > 50) baseDays += 2;
        if (riskScore > 75) baseDays += 3;

        return {
            businessDays: baseDays,
            message: `Estimated ${baseDays} business days for review and approval`
        };
    }

    async generateComplianceReport(analysis) {
        return {
            projectId: `NFPA-${Date.now()}`,
            timestamp: new Date().toISOString(),
            analysis,
            summary: {
                overallCompliance: analysis.complianceScore > 80 ? 'COMPLIANT' : 'NEEDS_REVIEW',
                criticalIssues: analysis.violations.filter(v => v.severity === 'CRITICAL').length,
                recommendedAction: analysis.complianceScore > 90 ? 'APPROVE' : 
                                 analysis.complianceScore > 70 ? 'CONDITIONAL_APPROVAL' : 'REQUIRE_REVISIONS'
            },
            nextSteps: analysis.recommendations.slice(0, 3),
            inspector: this.assignInspector(analysis.systemType, analysis.riskScore)
        };
    }

    assignInspector(systemType, riskScore) {
        // AI-based inspector assignment
        const inspectors = {
            'NFPA 72': ['Inspector Johnson (Fire Alarm Specialist)', 'Inspector Chen (Electronics Expert)'],
            'NFPA 13': ['Inspector Rodriguez (Hydraulics Expert)', 'Inspector Kim (Sprinkler Systems)'],
            'NFPA 25': ['Inspector Taylor (Maintenance Specialist)', 'Inspector Brown (ITM Expert)']
        };

        const systemInspectors = inspectors[systemType] || inspectors['NFPA 72'];
        
        // High-risk projects get senior inspectors
        const selectedInspector = riskScore > 60 ? systemInspectors[0] : systemInspectors[1];
        
        return {
            name: selectedInspector,
            specialization: systemType,
            experience: riskScore > 60 ? 'Senior' : 'Standard',
            estimatedAvailability: '2-3 business days'
        };
    }
}

// Helper function for print_info
function print_info(message) {
    console.log(`ℹ️  ${message}`);
}

module.exports = NFPACodeAnalyzer;
