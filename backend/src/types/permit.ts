import { UploadedFile } from 'express-fileupload';

export enum PermitType {
    ERRCS = 'ERRCS',
    FIRE_ALARM = 'FIRE_ALARM',
    SPRINKLER = 'SPRINKLER'
}

export enum PermitStatus {
    DRAFT = 'DRAFT',
    UNDER_REVIEW = 'UNDER_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    REVISIONS_NEEDED = 'REVISIONS_NEEDED'
}

export interface Property {
    address: string;
    type: 'Commercial' | 'Residential' | 'Industrial' | 'Mixed-Use';
    constructionType: string;
    floorsAboveGrade: number;
    floorsBelowGrade: number;
    squareFootage: number;
}

export interface Contact {
    email: string;
    phone: string;
    address: string;
}

export interface Certification {
    type: string;
    number: string;
    expiryDate: string;
}

export interface Applicant {
    name: string;
    company: string;
    license: string;
    contact: Contact;
    certifications?: Certification[];
}

export interface NFPASpecifications {
    bdaModel: string;
    bdaManufacturer: string;
    bdaFccId: string;
    frequencyRanges: string;
    donorSiteLocation: string;
    donorAntennaSpecs: {
        type: string;
        gain: number;
        height: number;
    };
    powerCalculations: string;
    batteryBackupTime: string;
    groundingDetails: string;
    surgeProtection: string;
    autoDialerConfig: string;
}

export interface NFPAData {
    code: string;
    version: string;
    requirements: string[];
    specifications: NFPASpecifications;
}

export interface Document {
    id: string;
    name: string;
    type: string;
    hash: string;
    blockchainHash?: string;
    status: string;
    url: string;
    uploadedAt: string;
    file?: UploadedFile;
}

export interface Finding {
    type: string;
    description: string;
    severity: 'Pass' | 'Warning' | 'Fail';
}

export interface AIReview {
    status: 'COMPLIANT' | 'NON_COMPLIANT';
    score: number;
    findings: Finding[];
    blockchainHash?: string;
}

export interface Permit {
    id: string;
    type?: PermitType;
    status: PermitStatus;
    createdAt: string;
    updatedAt: string;
    blockchainHash?: string;
    property: Property;
    applicant: Applicant;
    documents: Document[];
    aiReview?: AIReview;
} 