export enum PermitStatus {
    DRAFT = 'DRAFT',
    SUBMITTED = 'SUBMITTED',
    UNDER_REVIEW = 'UNDER_REVIEW',
    NEEDS_REVISION = 'NEEDS_REVISION',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    EXPIRED = 'EXPIRED',
    REVOKED = 'REVOKED',
    FINALIZED = 'FINALIZED'
}

export enum PermitType {
    FIRE_ALARM = 'FIRE_ALARM',
    SPRINKLER = 'SPRINKLER',
    EMERGENCY_LIGHTING = 'EMERGENCY_LIGHTING',
    FIRE_SUPPRESSION = 'FIRE_SUPPRESSION',
    SMOKE_CONTROL = 'SMOKE_CONTROL'
}

export interface Location {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

export interface ProjectDetails {
    name: string;
    description: string;
    location: Location;
    buildingType: string;
    occupancyType: string;
    constructionType: string;
    floorArea: number;
}

export interface Inspection {
    scheduledDate: string;
    inspector: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    notes?: string;
    completedAt?: string;
    followUpRequired?: boolean;
    followUpDate?: string;
}

export interface Document {
    name: string;
    fileUrl: string;
    fileType: string;
    uploadedBy: string;
    uploadedAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    comments?: string;
}

export interface Fee {
    amount: number;
    status: 'PENDING' | 'PAID' | 'REFUNDED';
    transactionId?: string;
    paidAt?: string;
}

export interface AIReviewResult {
    compliant: boolean;
    confidence: number;
    findings: Array<{
        code: string;
        description: string;
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
        location?: string;
    }>;
}

export interface AIReview {
    score: number;
    confidence: number;
    findings: string[];
    recommendations: string[];
    timestamp: string;
    modelVersion: string;
}

export interface StatusChange {
    fromStatus: PermitStatus;
    toStatus: PermitStatus;
    timestamp: string;
    updatedBy: string;
    reason: string;
    comments: string;
    docHash: string;
}

export interface Applicant {
    name: string;
    licenseNumber: string;
    email: string;
    phone: string;
    organization: string;
    licenseType: string;
    licenseExpiry: string;
}

export interface Property {
    address: string;
    parcelNumber: string;
    ownerName: string;
    ownerEmail: string;
    occupancyType: string;
    buildingType: string;
    squareFootage: number;
    numberOfFloors: number;
    constructionType: string;
}

export interface NFPAData {
    fireAlarmType: string;
    numberOfDevices: number;
    powerSupplyInfo: string;
    systemType: string;
    coverageArea: string;
    testResults: string;
    nfpaStandard: string;
    complianceLevel: string;
    lastInspectionDate?: string;
    nextInspectionDue?: string;
    specialHazards?: string[];
}

export interface Documents {
    plans: string;
    specifications: string;
    calculations: string;
    drawings: string[];
    inspectionReports: string[];
    testReports: string[];
    certifications: string[];
    insuranceDocuments: string[];
}

export interface ReviewerStatus {
    status: 'Pending' | 'In Progress' | 'Approved' | 'Rejected' | 'Reviewed' | 'Deferred';
    reviewer: string;
    comments: string;
    timestamp: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    dueDate?: string;
    completedDate?: string;
    attachments?: string[];
}

export interface Reviewers {
    fire: ReviewerStatus;
    building: ReviewerStatus;
    electrical: ReviewerStatus;
    mechanical?: ReviewerStatus;
    plumbing?: ReviewerStatus;
    structural?: ReviewerStatus;
}

export interface Fees {
    baseAmount: number;
    additionalFees: {
        name: string;
        amount: number;
        reason: string;
    }[];
    totalAmount: number;
    paid: boolean;
    paymentMethod?: string;
    transactionId?: string;
    paidDate?: string;
    refundAmount?: number;
    refundReason?: string;
    refundDate?: string;
}

export interface RedlineChange {
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: string;
    updatedBy: string;
    changeType: 'Addition' | 'Modification' | 'Deletion';
    priority: 'Low' | 'Medium' | 'High';
    impact: string;
}

export interface RedlineHistory {
    version: number;
    changes: RedlineChange[];
    timestamp: string;
    updatedBy: string;
    reason: string;
    approvedBy?: string;
    approvalDate?: string;
    relatedDocuments?: string[];
}

export interface Permit {
    permitId: string;
    applicationId: string;
    permitType: PermitType;
    status: PermitStatus;
    applicant: Applicant;
    property: Property;
    nfpaData: NFPAData;
    documents: Documents;
    reviewers: Reviewers;
    fees: Fees;
    submittedDate: string;
    lastModified: string;
    expirationDate: string;
    version: number;
    isRedlined: boolean;
    redlineHistory: RedlineHistory[];
    statusHistory: StatusChange[];
    aiReview?: AIReview;
    docType: string;
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
    method: string;
    transactionId: string;
    amount: number;
    paidBy: string;
    paidDate: string;
    receiptNumber: string;
}

export interface UpdaterInfo {
    name: string;
    role: string;
    department: string;
    reason?: string;
    priority?: string;
} 