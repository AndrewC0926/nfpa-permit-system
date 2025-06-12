import mongoose, { Document, Schema } from 'mongoose';
import { AUTH_CONFIG } from '../config/auth';
import bcrypt from 'bcryptjs';
import { UserRole } from '../types/roles';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organization: string;
  phoneNumber?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  backupCodes?: string[];
  failedLoginAttempts: number;
  lastFailedLogin?: Date;
  accountLockedUntil?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateBackupCodes(): string[];
  verifyBackupCode(code: string): boolean;
  incrementFailedLoginAttempts(): Promise<void>;
  resetFailedLoginAttempts(): Promise<void>;
  lockAccount(): Promise<void>;
  unlockAccount(): Promise<void>;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    required: true
  },
  organization: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  backupCodes: [String],
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lastFailedLogin: Date,
  accountLockedUntil: Date,
  lastLogin: Date
}, {
  timestamps: true
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ organization: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });

// Password comparison method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password || !candidatePassword) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    console.error('comparePassword error:', err);
    return false;
  }
};

// Generate backup codes for 2FA
UserSchema.methods.generateBackupCodes = function(): string[] {
  const crypto = require('crypto');
  const codes: string[] = [];
  for (let i = 0; i < AUTH_CONFIG.twoFactor.backupCodesCount; i++) {
    const code = crypto.randomBytes(AUTH_CONFIG.twoFactor.backupCodeLength)
      .toString('hex')
      .slice(0, AUTH_CONFIG.twoFactor.backupCodeLength);
    codes.push(code);
  }
  this.backupCodes = codes;
  return codes;
};

// Verify backup code
UserSchema.methods.verifyBackupCode = function(code: string): boolean {
  if (!this.backupCodes) return false;
  const index = this.backupCodes.indexOf(code);
  if (index === -1) return false;
  this.backupCodes.splice(index, 1);
  return true;
};

// Increment failed login attempts
UserSchema.methods.incrementFailedLoginAttempts = async function(): Promise<void> {
  this.failedLoginAttempts += 1;
  this.lastFailedLogin = new Date();
  
  if (this.failedLoginAttempts >= AUTH_CONFIG.password.maxAttempts) {
    await this.lockAccount();
  }
  
  await this.save();
};

// Reset failed login attempts
UserSchema.methods.resetFailedLoginAttempts = async function(): Promise<void> {
  this.failedLoginAttempts = 0;
  this.lastFailedLogin = undefined;
  await this.save();
};

// Lock account
UserSchema.methods.lockAccount = async function(): Promise<void> {
  const lockoutDuration = AUTH_CONFIG.password.lockoutDuration * 60 * 1000; // Convert to milliseconds
  this.accountLockedUntil = new Date(Date.now() + lockoutDuration);
  await this.save();
};

// Unlock account
UserSchema.methods.unlockAccount = async function(): Promise<void> {
  this.accountLockedUntil = undefined;
  this.failedLoginAttempts = 0;
  this.lastFailedLogin = undefined;
  await this.save();
};

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(AUTH_CONFIG.password.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const User = mongoose.model<IUser>('User', UserSchema); 