export enum PermitStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    UNDER_REVIEW = 'UNDER_REVIEW',
    AI_REVIEW = 'AI_REVIEW',
    NEEDS_REVISION = 'NEEDS_REVISION',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED'
}

export enum PermitType {
    ERRCS = 'ERRCS',
    NEW_CONSTRUCTION = 'NEW_CONSTRUCTION',
    MODIFICATION = 'MODIFICATION',
    RENEWAL = 'RENEWAL'
}

export interface Applicant {
    name: string;
    company: string;
    license: string;
    contact: {
        email: string;
        phone: string;
        address: string;
    };
    certifications: {
        type: string;
        number: string;
        expiryDate: string;
    }[];
}

export interface Property {
    address: string;
    type: 'Commercial' | 'Residential' | 'Mixed-Use';
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
    url: string;
    hash: string;
    uploadedAt: string;
    status: string;
}

export interface ReviewerInfo {
    department: string;
    name: string;
    status: string;
    comments: string;
    priority: string;
    dueDate?: string;
    reason?: string;
    role?: string;
}

export interface PaymentInfo {
    amount: number;
    status: string;
    transactionId: string;
    timestamp: string;
    method: string;
    receipt?: string;
}

export interface DonorAntennaSpecs {
    type: string;
    gain: number;
    height: number;
}

export interface NFPASpecifications {
    bdaModel: string;
    bdaManufacturer: string;
    bdaFccId: string;
    frequencyRanges: string;
    donorSiteLocation: string;
    donorAntennaSpecs: DonorAntennaSpecs;
    powerCalculations: string;
    batteryBackupTime: string;
    groundingDetails: string;
    surgeProtection: string;
    autoDialerConfig: string;
}

export interface AIFinding {
    type: string;
    description: string;
    severity: 'Critical' | 'Warning' | 'Pass';
    recommendation?: string;
}

export interface AIReview {
    status: 'COMPLIANT' | 'NON_COMPLIANT';
    score: number;
    findings: AIFinding[];
}

export interface Permit {
    id: string;
    type: PermitType;
    status: PermitStatus;
    property: Property;
    applicant: Applicant;
    nfpaData: NFPAData;
    documents: Document[];
    aiReview?: AIReview;
    createdAt: string;
    updatedAt: string;
}

export interface DashboardStats {
    totalPermits: number;
    pendingReview: number;
    approvedPermits: number;
    rejectedPermits: number;
    averageProcessingTime: number;
    complianceRate: number;
    recentPermits: Permit[];
} 