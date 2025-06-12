import { Requirement, IRequirement } from '../models/requirements';
import { ERRCSPermit, IDocument } from '../models/ERRCSPermit';
import { logger } from '../config/logger';

interface ValidationResult {
    requirement: IRequirement;
    passed: boolean;
    details: string;
    severity: 'Pass' | 'Warning' | 'Fail';
}

export class ValidationService {
    async validatePermit(permit: ERRCSPermit): Promise<ValidationResult[]> {
        const results: ValidationResult[] = [];
        const requirements = await Requirement.find({});

        for (const requirement of requirements) {
            try {
                const result = await this.validateRequirement(requirement, permit);
                results.push(result);
            } catch (error) {
                logger.error(`Error validating requirement ${requirement.code}:`, error);
                results.push({
                    requirement,
                    passed: false,
                    details: 'Error during validation',
                    severity: 'Fail'
                });
            }
        }

        return results;
    }

    private async validateRequirement(requirement: IRequirement, permit: ERRCSPermit): Promise<ValidationResult> {
        switch (requirement.code) {
            case 'NFPA72-24.3.1':
                return this.validateBDAComponents(requirement, permit);
            case 'NFPA72-24.3.2':
                return this.validatePowerRequirements(requirement, permit);
            case 'NFPA72-24.3.3':
                return this.validateSignalStrength(requirement, permit);
            default:
                return {
                    requirement,
                    passed: false,
                    details: 'Unknown requirement code',
                    severity: 'Fail'
                };
        }
    }

    private validateBDAComponents(requirement: IRequirement, permit: ERRCSPermit): ValidationResult {
        const { nfpaData } = permit;
        const requiredComponents = requirement.validationRules[0].parameters.required;
        const missingComponents = requiredComponents.filter(component => {
            switch (component) {
                case 'Donor Antenna':
                    return !nfpaData.specifications.donorAntennaSpecs;
                case 'BDA':
                    return !nfpaData.specifications.bdaModel;
                case 'Battery Backup':
                    return !nfpaData.specifications.batteryBackupTime;
                case 'Surge Protection':
                    return !nfpaData.specifications.surgeProtection;
                default:
                    return true;
            }
        });

        return {
            requirement,
            passed: missingComponents.length === 0,
            details: missingComponents.length > 0 
                ? `Missing components: ${missingComponents.join(', ')}`
                : 'All required components present',
            severity: missingComponents.length === 0 ? 'Pass' : 'Fail'
        };
    }

    private validatePowerRequirements(requirement: IRequirement, permit: ERRCSPermit): ValidationResult {
        const { nfpaData } = permit;
        const { minBatteryBackup, requiredVoltage } = requirement.validationRules[0].parameters;
        
        const batteryBackupHours = parseInt(nfpaData.specifications.batteryBackupTime);
        const hasAdequateBackup = batteryBackupHours >= minBatteryBackup;

        return {
            requirement,
            passed: hasAdequateBackup,
            details: hasAdequateBackup 
                ? `Battery backup of ${batteryBackupHours} hours meets minimum requirement of ${minBatteryBackup} hours`
                : `Battery backup of ${batteryBackupHours} hours is below minimum requirement of ${minBatteryBackup} hours`,
            severity: hasAdequateBackup ? 'Pass' : 'Fail'
        };
    }

    private validateSignalStrength(requirement: IRequirement, permit: ERRCSPermit): ValidationResult {
        const { nfpaData } = permit;
        const { minGain } = requirement.validationRules[0].parameters;
        
        const antennaGain = nfpaData.specifications.donorAntennaSpecs.gain;
        const hasAdequateGain = antennaGain >= minGain;

        return {
            requirement,
            passed: hasAdequateGain,
            details: hasAdequateGain
                ? `Antenna gain of ${antennaGain} dBd meets minimum requirement of ${minGain} dBd`
                : `Antenna gain of ${antennaGain} dBd is below minimum requirement of ${minGain} dBd`,
            severity: hasAdequateGain ? 'Pass' : 'Fail'
        };
    }
} 