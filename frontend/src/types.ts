export type PermitStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';

export type PermitType = 'FIRE_ALARM' | 'SPRINKLER' | 'EMERGENCY_LIGHTING';

export interface Permit {
  id: string;
  type: PermitType;
  status: PermitStatus;
  timestamp: string;
  metadata: {
    projectName: string;
    location: string;
    buildingType: string;
    floorArea: number;
    occupancyType: string;
  };
  documents: {
    id: string;
    name: string;
    url: string;
  }[];
  blockchainId?: string;
}

export interface AIReview {
  id: string;
  permitId: string;
  timestamp: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  results: {
    compliant: boolean;
    score: number;
    findings: {
      rule: string;
      description: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      compliant: boolean;
      details: string;
    }[];
    recommendations: string[];
  };
  blockchainVerification?: {
    txId: string;
    timestamp: string;
    hash: string;
  };
}

export interface DashboardStats {
  totalPermits: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  averageProcessingTime: number;
  complianceRate: number;
} 