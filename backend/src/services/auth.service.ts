import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import { User, IUser, UserRole } from '../models/User';
import { Session } from '../models/Session';
import { TokenBlacklist } from '../models/TokenBlacklist';
import { AUTH_CONFIG } from '../config/auth';
import { logger } from '../config/logger';
import { AuthError } from '../utils/errors';

interface TokenPayload {
  userId: string;
  role: UserRole;
  organizationId: string;
  exp?: number;
}

interface LoginResult {
  user: Partial<IUser>;
  token?: string;
  refreshToken?: string;
  requires2FA?: boolean;
  tempToken?: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organization: string;
    phoneNumber?: string;
  }): Promise<LoginResult> {
    // Check if user exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AuthError('User already exists', 400);
    }

    // Create new user
    const user = new User(userData);
    await user.save();

    // Generate tokens
    const { token, refreshToken } = await this.generateTokens(user);

    // Create session
    await this.createSession(user._id, refreshToken);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token,
      refreshToken
    };
  }

  /**
   * Login user
   */
  static async login(email: string, password: string, userAgent: string, ipAddress: string): Promise<LoginResult> {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthError('Invalid credentials', 401);
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      throw new AuthError('Account is locked. Please try again later.', 401);
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      await user.incrementFailedLoginAttempts();
      throw new AuthError('Invalid credentials', 401);
    }

    // Reset failed login attempts
    await user.resetFailedLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { token, refreshToken } = await this.generateTokens(user);

    // Create session
    await this.createSession(user._id, refreshToken, userAgent, ipAddress);

    // If 2FA is enabled, return different response
    if (user.twoFactorEnabled) {
      return {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        requires2FA: true,
        tempToken: token
      };
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token,
      refreshToken
    };
  }

  /**
   * Verify 2FA token
   */
  static async verify2FA(userId: string, token: string): Promise<LoginResult> {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new AuthError('2FA not set up', 400);
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret
    });

    if (!isValid) {
      throw new AuthError('Invalid 2FA token', 401);
    }

    // Generate new tokens after 2FA verification
    const { token: newToken, refreshToken } = await this.generateTokens(user);

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token: newToken,
      refreshToken
    };
  }

  /**
   * Enable 2FA for user
   */
  static async enable2FA(userId: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AuthError('User not found', 404);
    }

    // Generate secret
    const secret = authenticator.generateSecret();
    user.twoFactorSecret = secret;

    // Generate backup codes
    const backupCodes = user.generateBackupCodes();

    // Save changes
    await user.save();

    // Generate QR code URL
    const qrCodeUrl = authenticator.keyuri(
      user.email,
      AUTH_CONFIG.twoFactor.issuer,
      secret
    );

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  /**
   * Disable 2FA for user
   */
  static async disable2FA(userId: string, token: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
      throw new AuthError('2FA not set up', 400);
    }

    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorSecret
    });

    if (!isValid) {
      throw new AuthError('Invalid 2FA token', 401);
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = undefined;
    await user.save();
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{ token: string }> {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, AUTH_CONFIG.jwt.secret) as TokenPayload;

    // Check if token is blacklisted
    const blacklistedToken = await TokenBlacklist.findOne({ token: refreshToken });
    if (blacklistedToken) {
      throw new AuthError('Invalid refresh token', 401);
    }

    // Find session
    const session = await Session.findOne({ refreshToken });
    if (!session || !session.isValid) {
      throw new AuthError('Invalid refresh token', 401);
    }

    // Generate new access token
    const token = jwt.sign(
      {
        userId: decoded.userId,
        role: decoded.role,
        organizationId: decoded.organizationId
      },
      AUTH_CONFIG.jwt.secret,
      { expiresIn: AUTH_CONFIG.jwt.expiresIn }
    );

    return { token };
  }

  /**
   * Logout user
   */
  static async logout(token: string, refreshToken: string): Promise<void> {
    // Add tokens to blacklist
    const decoded = jwt.verify(token, AUTH_CONFIG.jwt.secret) as TokenPayload;
    const refreshDecoded = jwt.verify(refreshToken, AUTH_CONFIG.jwt.secret) as TokenPayload;

    await Promise.all([
      TokenBlacklist.create({
        token,
        expiresAt: new Date((decoded.exp || 0) * 1000),
        reason: 'logout'
      }),
      TokenBlacklist.create({
        token: refreshToken,
        expiresAt: new Date((refreshDecoded.exp || 0) * 1000),
        reason: 'logout'
      })
    ]);

    // Invalidate session
    await Session.updateOne(
      { refreshToken },
      { $set: { isValid: false } }
    );
  }

  /**
   * Generate tokens for user
   */
  private static async generateTokens(user: IUser): Promise<{ token: string; refreshToken: string }> {
    const payload: TokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      organizationId: user.organization
    };

    const token = jwt.sign(payload, AUTH_CONFIG.jwt.secret, {
      expiresIn: AUTH_CONFIG.jwt.expiresIn
    });

    const refreshToken = jwt.sign(payload, AUTH_CONFIG.jwt.secret, {
      expiresIn: AUTH_CONFIG.jwt.refreshExpiresIn
    });

    return { token, refreshToken };
  }

  /**
   * Create new session
   */
  private static async createSession(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    const decoded = jwt.verify(refreshToken, AUTH_CONFIG.jwt.secret) as TokenPayload;

    await Session.create({
      userId,
      refreshToken,
      userAgent: userAgent || 'Unknown',
      ipAddress: ipAddress || 'Unknown',
      expiresAt: new Date((decoded.exp || 0) * 1000)
    });
  }
} 