import { Request, Response, NextFunction } from 'express';
import { Permit, PermitType, PermitStatus } from '../types/permit';

export function validatePermit(req: Request, res: Response, next: NextFunction) {
    const permit = req.body as Permit;

    // Check required fields
    if (!permit.type || !Object.values(PermitType).includes(permit.type)) {
        return res.status(400).json({ error: 'Invalid permit type' });
    }

    if (!permit.property) {
        return res.status(400).json({ error: 'Property details are required' });
    }

    // Validate property details
    const { property } = permit;
    if (!property.address || !property.type || !property.constructionType) {
        return res.status(400).json({ error: 'Invalid property details' });
    }

    if (typeof property.floorsAboveGrade !== 'number' || typeof property.floorsBelowGrade !== 'number') {
        return res.status(400).json({ error: 'Invalid floor numbers' });
    }

    // Validate applicant details
    if (!permit.applicant) {
        return res.status(400).json({ error: 'Applicant details are required' });
    }

    const { applicant } = permit;
    if (!applicant.name || !applicant.company || !applicant.license) {
        return res.status(400).json({ error: 'Invalid applicant details' });
    }

    if (!applicant.contact || !applicant.contact.email || !applicant.contact.phone) {
        return res.status(400).json({ error: 'Invalid contact details' });
    }

    // Validate NFPA data
    if (!permit.nfpaData) {
        return res.status(400).json({ error: 'NFPA data is required' });
    }

    const { nfpaData } = permit;
    if (!nfpaData.code || !nfpaData.version) {
        return res.status(400).json({ error: 'Invalid NFPA code details' });
    }

    const { specifications } = nfpaData;
    if (!specifications) {
        return res.status(400).json({ error: 'NFPA specifications are required' });
    }

    // Validate BDA specifications
    if (!specifications.bdaModel || !specifications.bdaManufacturer || !specifications.bdaFccId) {
        return res.status(400).json({ error: 'Invalid BDA specifications' });
    }

    // Validate donor antenna specifications
    if (!specifications.donorAntennaSpecs || 
        typeof specifications.donorAntennaSpecs.gain !== 'number' ||
        typeof specifications.donorAntennaSpecs.height !== 'number') {
        return res.status(400).json({ error: 'Invalid donor antenna specifications' });
    }

    // Validate battery backup
    if (!specifications.batteryBackupTime) {
        return res.status(400).json({ error: 'Battery backup time is required' });
    }

    next();
} 