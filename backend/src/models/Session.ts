import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';

export interface ISession extends Document {
  userId: IUser['_id'];
  refreshToken: string;
  userAgent: string;
  ipAddress: string;
  isValid: boolean;
  expiresAt: Date;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  isValid: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for cleaning up expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if session is expired
SessionSchema.methods.isExpired = function(): boolean {
  return Date.now() >= this.expiresAt.getTime();
};

// Static method to clean up expired sessions
SessionSchema.statics.cleanupExpiredSessions = async function(): Promise<void> {
  await this.deleteMany({ expiresAt: { $lt: new Date() } });
};

export const Session = mongoose.model<ISession>('Session', SessionSchema); 