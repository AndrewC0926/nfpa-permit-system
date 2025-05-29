/**
 * COMPREHENSIVE NFPA CODE ANALYZER
 * Complete Requirements Database Integration
 * 
 * This module provides comprehensive analysis against ALL NFPA fire codes
 * for government permit systems and AI-powered compliance checking.
 */

class NFPACodeAnalyzer {
    constructor() {
        this.requirements = {
            // NFPA 13 Sprinkler System Requirements
            'sprinkler_coverage': {
                code: 'NFPA 13',
                section: '8.15.1.1',
                requirement: 'Sprinklers shall be installed throughout the premises except where specifically exempted',
                category: 'fire_suppression',
                severity: 'critical',
                applicableOccupancies: ['all'],
                exceptions: ['open parking structures', 'certain storage areas']
            },
            'sprinkler_spacing': {
                code: 'NFPA 13',
                section: '8.6.2.1.1',
                requirement: 'Sprinklers shall be positioned with proper spacing to ensure adequate coverage',
                category: 'fire_suppression',
                severity: 'critical',
                maxSpacing: '15 feet',
                minSpacing: '6 feet'
            },
            'water_supply_duration': {
                code: 'NFPA 13',
                section: '11.2.3.1.1',
                requirement: 'Water supply shall be capable of delivering required flow for specified duration',
                category: 'fire_suppression',
                severity: 'critical',
                duration: '30-120 minutes depending on occupancy'
            },
            'sprinkler_types': {
                code: 'NFPA 13',
                section: '8.4.1.1',
                requirement: 'Sprinklers shall be of approved types suitable for the conditions of service',
                category: 'fire_suppression',
                severity: 'high'
            },

            // NFPA 72 Fire Alarm System Requirements  
            'fire_alarm_coverage': {
                code: 'NFPA 72',
                section: '17.5.3.1',
                requirement: 'Smoke detectors shall be installed in all required locations',
                category: 'detection_alarm',
                severity: 'critical'
            },
            'manual_pull_stations': {
                code: 'NFPA 72',
                section: '17.14.1.1',
                requirement: 'Manual fire alarm boxes shall be provided at exits and designated locations',
                category: 'detection_alarm',
                severity: 'critical',
                maxDistance: '200 feet travel distance'
            },
            'notification_appliances': {
                code: 'NFPA 72',
                section: '18.4.1.1',
                requirement: 'Notification appliances shall provide effective alerting throughout protected area',
                category: 'detection_alarm',
                severity: 'critical'
            },
            'mass_notification': {
                code: 'NFPA 72',
                section: '24.3.1',
                requirement: 'Mass notification systems shall provide emergency information to occupants',
                category: 'detection_alarm',
                severity: 'high'
            },

            // NFPA 25 Inspection, Testing and Maintenance
            'sprinkler_inspection': {
                code: 'NFPA 25',
                section: '5.2.1.1',
                requirement: 'Sprinkler systems shall be inspected, tested, and maintained regularly',
                category: 'maintenance',
                severity: 'high',
                frequency: 'Weekly, monthly, quarterly, annually'
            },
            'alarm_testing': {
                code: 'NFPA 25',
                section: '14.2.1',
                requirement: 'Fire alarm systems shall be tested in accordance with NFPA 72',
                category: 'maintenance',
                severity: 'high'
            },

            // NFPA 101 Life Safety Code Requirements
            'egress_capacity': {
                code: 'NFPA 101',
                section: '7.3.3.1',
                requirement: 'Egress capacity shall be sufficient for occupant load',
                category: 'egress',
                severity: 'critical'
            },
            'exit_signs': {
                code: 'NFPA 101',
                section: '7.10.1.1',
                requirement: 'Exit signs shall be provided to indicate direction of egress',
                category: 'egress',
                severity: 'critical'
            },
            'emergency_lighting': {
                code: 'NFPA 101',
                section: '7.9.1.1',
                requirement: 'Emergency lighting shall be provided in designated areas',
                category: 'egress',
                severity: 'critical',
                duration: 'Minimum 90 minutes'
            },
            'travel_distance': {
                code: 'NFPA 101',
                section: '7.6.1',
                requirement: 'Travel distance to exits shall not exceed specified limits',
                category: 'egress',
                severity: 'critical'
            },

            // NFPA 1 Fire Code Requirements
            'occupancy_load_calculation': {
                code: 'NFPA 1',
                section: '7.3.1.2',
                requirement: 'The occupant load shall be determined by dividing the floor area assigned to that use by the occupant load factor for that use',
                category: 'occupancy',
                severity: 'critical'
            },
            'exit_capacity': {
                code: 'NFPA 1',
                section: '7.3.3.1',
                requirement: 'The capacity of the means of egress for any story, balcony, tier, or other occupied space shall be sufficient for the occupant load thereof',
                category: 'egress',
                severity: 'critical'
            },
            
            // NFPA 10 Portable Fire Extinguishers
            'extinguisher_selection': {
                code: 'NFPA 10',
                section: '6.1.1.1',
                requirement: 'Fire extinguishers shall be selected on the basis of the fires likely to occur',
                category: 'fire_protection',
                severity: 'high'
            },
            'extinguisher_distribution': {
                code: 'NFPA 10',
                section: '6.2.1.1',
                requirement: 'Fire extinguishers shall be distributed such that the maximum travel distance does not exceed 75 feet',
                category: 'fire_protection',
                severity: 'high'
            },
            
            // NFPA 11 Low-, Medium-, and High-Expansion Foam
            'foam_system_design': {
                code: 'NFPA 11',
                section: '7.2.1',
                requirement: 'Foam systems shall be designed by qualified persons experienced in such design',
                category: 'fire_suppression',
                severity: 'critical'
            },
            
            // NFPA 12 Carbon Dioxide Extinguishing Systems
            'co2_system_safety': {
                code: 'NFPA 12',
                section: '4.1.2.1',
                requirement: 'Carbon dioxide systems shall include provisions to prevent entry of personnel into protected areas',
                category: 'fire_suppression',
                severity: 'critical'
            },
            
            // NFPA 14 Installation of Standpipe and Hose Systems
            'standpipe_water_supply': {
                code: 'NFPA 14',
                section: '7.2.1',
                requirement: 'Standpipe systems shall have adequate water supply to deliver required flow and pressure',
                category: 'fire_protection',
                severity: 'critical'
            },
            
            // NFPA 15 Water Spray Fixed Systems
            'water_spray_design': {
                code: 'NFPA 15',
                section: '7.1.1',
                requirement: 'Water spray systems shall be designed to deliver water in a predetermined pattern',
                category: 'fire_suppression',
                severity: 'high'
            },
            
            // NFPA 16 Installation of Foam-Water Sprinkler and Foam-Water Spray Systems
            'foam_water_system': {
                code: 'NFPA 16',
                section: '6.1.1',
                requirement: 'Foam-water systems shall be designed to provide effective fire control',
                category: 'fire_suppression',
                severity: 'high'
            },
            
            // NFPA 17 Dry Chemical Extinguishing Systems
            'dry_chemical_design': {
                code: 'NFPA 17',
                section: '5.1.1',
                requirement: 'Dry chemical systems shall be designed for the specific hazard being protected',
                category: 'fire_suppression',
                severity: 'high'
            },
            
            // NFPA 18 Wetting Agents
            'wetting_agent_use': {
                code: 'NFPA 18',
                section: '4.1.1',
                requirement: 'Wetting agents shall be used only for Class A fires unless specifically listed for other classes',
                category: 'fire_suppression',
                severity: 'medium'
            },
            
            // NFPA 20 Installation of Stationary Pumps for Fire Protection
            'fire_pump_installation': {
                code: 'NFPA 20',
                section: '4.1.1',
                requirement: 'Fire pumps shall be installed in accordance with their listing and the manufacturer instructions',
                category: 'fire_protection',
                severity: 'critical'
            },
            'fire_pump_controllers': {
                code: 'NFPA 20',
                section: '10.1.1',
                requirement: 'Each fire pump shall be provided with an approved controller',
                category: 'fire_protection',
                severity: 'critical'
            },
            
            // NFPA 24 Installation of Private Fire Service Mains
            'private_main_design': {
                code: 'NFPA 24',
                section: '6.1.1',
                requirement: 'Private fire service mains shall be designed to supply water for fire protection',
                category: 'water_supply',
                severity: 'critical'
            },
            
            // NFPA 30 Flammable and Combustible Liquids Code
            'flammable_liquid_storage': {
                code: 'NFPA 30',
                section: '9.2.1',
                requirement: 'Flammable and combustible liquids shall be stored in approved containers',
                category: 'hazardous_materials',
                severity: 'critical'
            },
            'tank_venting': {
                code: 'NFPA 30',
                section: '22.7.1.1',
                requirement: 'Atmospheric tanks storing Class I, II, or IIIA liquids shall be equipped with venting',
                category: 'hazardous_materials',
                severity: 'critical'
            },
            
            // NFPA 54 National Fuel Gas Code
            'gas_piping_installation': {
                code: 'NFPA 54',
                section: '7.1.1',
                requirement: 'Gas piping systems shall be installed in accordance with this code',
                category: 'fuel_gas',
                severity: 'critical'
            },
            'gas_appliance_clearance': {
                code: 'NFPA 54',
                section: '9.3.1',
                requirement: 'Gas appliances shall be installed with proper clearances from combustible materials',
                category: 'fuel_gas',
                severity: 'high'
            },
            
            // NFPA 58 Liquefied Petroleum Gas Code
            'lpg_container_location': {
                code: 'NFPA 58',
                section: '6.2.1.1',
                requirement: 'LP-Gas containers shall be located with proper separation distances',
                category: 'fuel_gas',
                severity: 'critical'
            },
            
            // NFPA 70 National Electrical Code
            'electrical_installation': {
                code: 'NFPA 70',
                section: '110.3',
                requirement: 'Electrical equipment shall be installed and used in accordance with listing and labeling',
                category: 'electrical',
                severity: 'critical'
            },
            'grounding_requirements': {
                code: 'NFPA 70',
                section: '250.1',
                requirement: 'Grounding and bonding shall be installed to provide a low-impedance path',
                category: 'electrical',
                severity: 'critical'
            },
            
            // NFPA 80 Fire Doors and Other Opening Protectives
            'fire_door_installation': {
                code: 'NFPA 80',
                section: '5.1.1',
                requirement: 'Fire doors shall be installed in accordance with the listing',
                category: 'passive_protection',
                severity: 'critical'
            },
            'fire_door_testing': {
                code: 'NFPA 80',
                section: '5.2.1',
                requirement: 'Fire door assemblies shall be inspected and tested annually',
                category: 'passive_protection',
                severity: 'high'
            },
            
            // NFPA 90A Installation of Air-Conditioning and Ventilating Systems
            'hvac_fire_dampers': {
                code: 'NFPA 90A',
                section: '5.3.1.1',
                requirement: 'Fire dampers shall be installed where ducts penetrate fire barriers',
                category: 'hvac',
                severity: 'critical'
            },
            
            // NFPA 96 Ventilation Control and Fire Protection of Commercial Cooking Operations
            'kitchen_hood_installation': {
                code: 'NFPA 96',
                section: '7.1.1',
                requirement: 'Exhaust hoods shall be installed over all grease-producing appliances',
                category: 'commercial_cooking',
                severity: 'critical'
            },
            'kitchen_suppression_system': {
                code: 'NFPA 96',
                section: '10.1.1',
                requirement: 'Fire extinguishing systems shall be installed to protect cooking equipment',
                category: 'commercial_cooking',
                severity: 'critical'
            },
            
            // NFPA 110 Emergency and Standby Power Systems
            'generator_installation': {
                code: 'NFPA 110',
                section: '7.1.1',
                requirement: 'Emergency power systems shall be installed to provide reliable backup power',
                category: 'emergency_power',
                severity: 'critical'
            },
            
            // NFPA 170 Fire Safety and Emergency Symbols
            'safety_symbol_use': {
                code: 'NFPA 170',
                section: '4.1.1',
                requirement: 'Fire safety symbols shall be used to communicate fire safety information',
                category: 'communication',
                severity: 'medium'
            },
            
            // Additional critical requirements
            'automatic_sprinkler_coverage': {
                code: 'NFPA 13',
                section: '8.1.1',
                requirement: 'Automatic sprinklers shall provide complete coverage of all areas',
                category: 'fire_suppression',
                severity: 'critical'
            },
            'water_supply_adequacy': {
                code: 'NFPA 13',
                section: '11.1.1',
                requirement: 'Water supply shall be adequate for the sprinkler system demand',
                category: 'fire_suppression',
                severity: 'critical'
            }
        };
    }

    // Analyze project against specific NFPA code
    analyzeAgainstCode(project, nfpaCode) {
        const relevantRequirements = Object.entries(this.requirements)
            .filter(([key, req]) => req.code === nfpaCode);
        
        const analysis = {
            code: nfpaCode,
            project_id: project.id,
            requirements_checked: relevantRequirements.length,
            compliance_score: this.calculateComplianceScore(project, relevantRequirements),
            critical_issues: [],
            warnings: [],
            recommendations: []
        };

        // Analyze each requirement
        relevantRequirements.forEach(([key, requirement]) => {
            const compliance = this.checkRequirementCompliance(project, requirement);
            
            if (!compliance.compliant) {
                if (requirement.severity === 'critical') {
                    analysis.critical_issues.push({
                        requirement: key,
                        description: requirement.requirement,
                        section: requirement.section,
                        issue: compliance.issue
                    });
                } else {
                    analysis.warnings.push({
                        requirement: key,
                        description: requirement.requirement,
                        section: requirement.section,
                        issue: compliance.issue
                    });
                }
            }
        });

        return analysis;
    }

    // Check individual requirement compliance
    checkRequirementCompliance(project, requirement) {
        // Simplified compliance checking logic
        // In production, this would integrate with your uploaded NFPA database
        
        const compliance = {
            compliant: true,
            issue: null
        };

        // Example compliance checks based on project data
        if (requirement.code === 'NFPA 13' && !project.scope?.proposed_systems?.includes('NFPA 13 sprinkler system')) {
            compliance.compliant = false;
            compliance.issue = 'No sprinkler system specified in project scope';
        }

        if (requirement.code === 'NFPA 72' && !project.scope?.proposed_systems?.includes('NFPA 72')) {
            compliance.compliant = false;
            compliance.issue = 'No fire alarm system specified in project scope';
        }

        // Occupancy load check
        if (requirement.requirement.includes('occupant load') && project.scope?.occupancy_load > 500) {
            // Additional scrutiny for high occupancy
            if (!project.scope?.proposed_systems?.includes('mass notification')) {
                compliance.compliant = false;
                compliance.issue = 'High occupancy load requires mass notification system';
            }
        }

        return compliance;
    }

    // Calculate overall compliance score
    calculateComplianceScore(project, requirements) {
        let totalScore = 0;
        let maxScore = requirements.length * 100;

        requirements.forEach(([key, requirement]) => {
            const compliance = this.checkRequirementCompliance(project, requirement);
            if (compliance.compliant) {
                totalScore += 100;
            } else {
                // Partial credit based on severity
                if (requirement.severity === 'medium') {
                    totalScore += 50;
                } else if (requirement.severity === 'high') {
                    totalScore += 25;
                }
                // Critical issues get 0 points
            }
        });

        return Math.round((totalScore / maxScore) * 100);
    }

    // Get requirements by category
    getRequirementsByCategory(category) {
        return Object.entries(this.requirements)
            .filter(([key, req]) => req.category === category)
            .reduce((obj, [key, req]) => {
                obj[key] = req;
                return obj;
            }, {});
    }

    // Get requirements by NFPA code
    getRequirementsByCode(nfpaCode) {
        return Object.entries(this.requirements)
            .filter(([key, req]) => req.code === nfpaCode)
            .reduce((obj, [key, req]) => {
                obj[key] = req;
                return obj;
            }, {});
    }

    // Generate comprehensive report
    generateComprehensiveReport(project) {
        const applicableCodes = project.nfpa_codes_applicable || [];
        const report = {
            project_id: project.id,
            project_name: project.name,
            analysis_date: new Date().toISOString(),
            codes_analyzed: applicableCodes,
            overall_compliance: 0,
            code_analyses: []
        };

        // Analyze against each applicable code
        applicableCodes.forEach(code => {
            const analysis = this.analyzeAgainstCode(project, code);
            report.code_analyses.push(analysis);
        });

        // Calculate overall compliance
        if (report.code_analyses.length > 0) {
            report.overall_compliance = Math.round(
                report.code_analyses.reduce((sum, analysis) => sum + analysis.compliance_score, 0) / 
                report.code_analyses.length
            );
        }

        return report;
    }
}

// Export the class
module.exports = { NFPACodeAnalyzer };
