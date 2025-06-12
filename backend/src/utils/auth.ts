import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import { AUTH_CONFIG } from '../config/auth';
import { User } from '../models/User';
import { UserRole } from '../types/roles';
import { logger } from '../config/logger';

interface TokenPayload {
  userId: string;
  role: UserRole;
  organizationId: string;
}

export class AuthUtils {
  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, AUTH_CONFIG.password.saltRounds);
  }

  /**
   * Compare a password with a hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < AUTH_CONFIG.password.minLength) {
      return {
        isValid: false,
        message: `Password must be at least ${AUTH_CONFIG.password.minLength} characters long`
      };
    }

    if (AUTH_CONFIG.password.requireCapital && !/[A-Z]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one capital letter'
      };
    }

    if (AUTH_CONFIG.password.requireNumber && !/\d/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one number'
      };
    }

    if (AUTH_CONFIG.password.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return {
        isValid: false,
        message: 'Password must contain at least one special character'
      };
    }

    return { isValid: true, message: 'Password is valid' };
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, AUTH_CONFIG.jwt.secret, {
      expiresIn: AUTH_CONFIG.jwt.expiresIn
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, AUTH_CONFIG.jwt.secret, {
      expiresIn: AUTH_CONFIG.jwt.refreshExpiresIn
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, AUTH_CONFIG.jwt.secret) as TokenPayload;
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate 2FA secret
   */
  static generateTwoFactorSecret(): string {
    return authenticator.generateSecret();
  }

  /**
   * Generate 2FA QR code URL
   */
  static generateTwoFactorQRCode(email: string, secret: string): string {
    return authenticator.keyuri(
      email,
      AUTH_CONFIG.twoFactor.issuer,
      secret
    );
  }

  /**
   * Verify 2FA token
   */
  static verifyTwoFactorToken(token: string, secret: string): boolean {
    return authenticator.verify({
      token,
      secret
    });
  }

  /**
   * Check if user has required permission
   */
  static hasPermission(userRole: UserRole, requiredPermission: string): boolean {
    const userPermissions = AUTH_CONFIG.roleAccess[userRole];
    
    // Admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }

    return userPermissions.includes(requiredPermission);
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
} 