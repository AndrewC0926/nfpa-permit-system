import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/auth';
import { logger } from '../config/logger';
import { UserRole } from '../models/User';
import jwt from 'jsonwebtoken';
import { AuthError } from '../utils/errors';
import { TokenBlacklist } from '../models/TokenBlacklist';

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
        organizationId: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    const payload = AuthUtils.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = payload;
    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

export class AuthMiddleware {
  /**
   * Middleware to check if user has required permission
   */
  static hasPermission(requiredPermission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'User not authenticated'
          });
        }

        const hasPermission = AuthUtils.hasPermission(req.user.role, requiredPermission);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }

        next();
      } catch (error) {
        logger.error('Permission check failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    };
  }

  /**
   * Middleware to verify 2FA token
   */
  static async verify2FA(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, secret } = req.body;

      if (!token || !secret) {
        return res.status(400).json({
          success: false,
          message: '2FA token and secret are required'
        });
      }

      const isValid = AuthUtils.verifyTwoFactorToken(token, secret);

      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA token'
        });
      }

      next();
    } catch (error) {
      logger.error('2FA verification failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Middleware to check if user is an admin
   */
  static isAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  }

  /**
   * Middleware to check if user is a city official
   */
  static isCityOfficial(req: Request, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== UserRole.CITY_OFFICIAL) {
      return res.status(403).json({
        success: false,
        message: 'City official access required'
      });
    }
    next();
  }

  /**
   * Middleware to check if user is an inspector
   */
  static isInspector(req: Request, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== UserRole.INSPECTOR) {
      return res.status(403).json({
        success: false,
        message: 'Inspector access required'
      });
    }
    next();
  }

  static async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AuthError('No token provided', 401);
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        throw new AuthError('No token provided', 401);
      }

      // Check if token is blacklisted
      const isBlacklisted = await TokenBlacklist.findOne({ token });
      if (isBlacklisted) {
        throw new AuthError('Token has been invalidated', 401);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        organizationId: decoded.organizationId
      };

      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      if (error instanceof jwt.JsonWebTokenError) {
        next(new AuthError('Invalid token', 401));
      } else if (error instanceof AuthError) {
        next(error);
      } else {
        next(new AuthError('Authentication failed', 500));
      }
    }
  }

  static requireRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw new AuthError('Unauthorized', 401);
        }

        if (!roles.includes(req.user.role)) {
          throw new AuthError('Forbidden', 403);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }
} 