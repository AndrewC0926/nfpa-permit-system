import { Document, Schema, model, Types } from 'mongoose';

export enum PermitType {
  FIRE_ALARM = 'FIRE_ALARM',
  SPRINKLER = 'SPRINKLER',
  EMERGENCY_LIGHTING = 'EMERGENCY_LIGHTING'
}

export enum PermitStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  NEEDS_REVISION = 'NEEDS_REVISION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED'
}

export interface IDocument {
  name: string;
  fileUrl: string;
  fileType: string;
  hash: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments?: string;
}

export interface IInspection {
  scheduledDate: Date;
  inspector: Types.ObjectId;
  status: 'SCHEDULED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  notes?: string;
  completedAt?: Date;
  followUpRequired?: boolean;
  followUpDate?: Date;
}

export interface IERRCSPermit extends Document {
  permitNumber: string;
  type: PermitType;
  status: PermitStatus;
  applicant: Types.ObjectId;
  organization: Types.ObjectId;
  projectDetails: {
    name: string;
    description: string;
    location: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
    buildingType: string;
    occupancyType: string;
    floorArea: number;
    constructionType: string;
  };
  documents: IDocument[];
  inspections: IInspection[];
  fees: {
    amount: number;
    status: 'PENDING' | 'PAID' | 'REFUNDED';
    transactionId?: string;
    paidAt?: Date;
  };
  reviewNotes?: string[];
  aiReviewScore?: number;
  aiReviewNotes?: string[];
  expirationDate: Date;
  issuedDate?: Date;
  lastModified: Date;
  createdAt: Date;
  updatedAt: Date;
  nfpaExtractedData?: Array<{
    documentId: string;
    data: any;
  }>;
}

const ERRCSPermitSchema = new Schema<IERRCSPermit>({
  permitNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: Object.values(PermitType),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(PermitStatus),
    default: PermitStatus.DRAFT
  },
  applicant: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  projectDetails: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      address: {
        type: String,
        required: true,
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      state: {
        type: String,
        required: true,
        trim: true
      },
      zipCode: {
        type: String,
        required: true,
        trim: true
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    buildingType: {
      type: String,
      required: true,
      trim: true
    },
    occupancyType: {
      type: String,
      required: true,
      trim: true
    },
    floorArea: {
      type: Number,
      required: true
    },
    constructionType: {
      type: String,
      required: true,
      trim: true
    }
  },
  documents: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    hash: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    comments: String
  }],
  inspections: [{
    scheduledDate: {
      type: Date,
      required: true
    },
    inspector: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED'],
      required: true
    },
    notes: String,
    completedAt: Date,
    followUpRequired: Boolean,
    followUpDate: Date
  }],
  fees: {
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'REFUNDED'],
      default: 'PENDING'
    },
    transactionId: String,
    paidAt: Date
  },
  reviewNotes: [String],
  aiReviewScore: Number,
  aiReviewNotes: [String],
  expirationDate: {
    type: Date,
    required: true
  },
  issuedDate: Date,
  lastModified: {
    type: Date,
    default: Date.now
  },
  nfpaExtractedData: [
    {
      documentId: { type: String, required: true },
      data: { type: Schema.Types.Mixed, required: true }
    }
  ]
}, {
  timestamps: true
});

// Add indexes for frequently queried fields
ERRCSPermitSchema.index({ permitNumber: 1 });
ERRCSPermitSchema.index({ type: 1 });
ERRCSPermitSchema.index({ status: 1 });
ERRCSPermitSchema.index({ applicant: 1 });
ERRCSPermitSchema.index({ organization: 1 });
ERRCSPermitSchema.index({ 'projectDetails.location.city': 1 });
ERRCSPermitSchema.index({ 'projectDetails.location.state': 1 });
ERRCSPermitSchema.index({ expirationDate: 1 });
ERRCSPermitSchema.index({ createdAt: 1 });

export const ERRCSPermit = model<IERRCSPermit>('ERRCSPermit', ERRCSPermitSchema);
