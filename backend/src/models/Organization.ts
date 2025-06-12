import { Document, Schema, model } from 'mongoose';

export enum OrganizationType {
  CITY_DEPARTMENT = 'CITY_DEPARTMENT',
  CONTRACTOR_COMPANY = 'CONTRACTOR_COMPANY',
  INSPECTION_AGENCY = 'INSPECTION_AGENCY'
}

export interface IOrganization extends Document {
  name: string;
  type: OrganizationType;
  licenseNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contactInfo: {
    phone: string;
    email: string;
    website?: string;
  };
  isVerified: boolean;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expirationDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(OrganizationType),
    required: true
  },
  licenseNumber: {
    type: String,
    sparse: true,
    trim: true
  },
  address: {
    street: {
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
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  insuranceInfo: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    expirationDate: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Add indexes for frequently queried fields
organizationSchema.index({ name: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ licenseNumber: 1 });
organizationSchema.index({ isVerified: 1 });
organizationSchema.index({ 'address.state': 1, 'address.city': 1 });

export const Organization = model<IOrganization>('Organization', organizationSchema); 