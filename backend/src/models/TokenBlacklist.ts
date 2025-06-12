import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenBlacklist extends Document {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

const TokenBlacklistSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 0 // This will automatically delete documents after the expiresAt time
  }
});

// Create indexes
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to check if a token is blacklisted
TokenBlacklistSchema.statics.isBlacklisted = async function(token: string): Promise<boolean> {
  const blacklistedToken = await this.findOne({ token });
  return !!blacklistedToken;
};

// Static method to add a token to blacklist
TokenBlacklistSchema.statics.addToBlacklist = async function(
  token: string,
  expiresAt: Date,
  reason: string
): Promise<void> {
  await this.create({ token, expiresAt, reason });
};

// Static method to clean up expired blacklisted tokens
TokenBlacklistSchema.statics.cleanupExpiredTokens = async function(): Promise<void> {
  await this.deleteMany({ expiresAt: { $lt: new Date() } });
};

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', TokenBlacklistSchema); 