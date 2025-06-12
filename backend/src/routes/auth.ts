import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { UserRole } from '../types/roles';
import { AuthService } from '../services/auth.service';
import { AuthMiddleware } from '../middleware/auth';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimit';
import { logger } from '../config/logger';
import { AuthError, ValidationError } from '../utils/errors';

// Fail fast if run as root or with sudo
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend as root or with sudo. Exiting.');
  process.exit(1);
}
if (process.env.SUDO_USER) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend with sudo. Exiting.');
  process.exit(1);
}

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', [
  authLimiter,
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  body('role')
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
  body('organization')
    .trim()
    .notEmpty()
    .withMessage('Organization is required')
    .isLength({ max: 100 })
    .withMessage('Organization name must be less than 100 characters'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format')
], async (req: Request, res: Response) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const result = await AuthService.register(req.body);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Registration failed:', error);
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        errors: error.errors
      });
    } else if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Registration failed'
      });
    }
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', [
  authLimiter,
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { email, password } = req.body;
    const userAgent = (req.headers['user-agent'] as string) || '';
    const result = await AuthService.login(
      email,
      password,
      userAgent,
      req.ip
    );

    if (!result || !result.token) {
      logger.error('Login failed: Invalid credentials');
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Login error:', error);
    logger.error('Login failed:', error);
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        errors: error.errors
      });
    } else if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: error?.message || 'Login failed'
      });
    }
  }
});

/**
 * @route POST /api/auth/2fa/verify
 * @desc Verify 2FA token
 * @access Public
 */
router.post('/2fa/verify', [
  sensitiveLimiter,
  body('token')
    .notEmpty()
    .withMessage('2FA token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA token must be 6 digits')
    .isNumeric()
    .withMessage('2FA token must be numeric')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { token } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new AuthError('Unauthorized', 401);
    }

    const result = await AuthService.verify2FA(userId, token);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('2FA verification failed:', error);
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        errors: error.errors
      });
    } else if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: '2FA verification failed'
      });
    }
  }
});

/**
 * @route POST /api/auth/2fa/enable
 * @desc Enable 2FA for user
 * @access Private
 */
router.post('/2fa/enable', [
  AuthMiddleware.verifyToken,
  sensitiveLimiter
], async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AuthError('Unauthorized', 401);
    }

    const result = await AuthService.enable2FA(userId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('2FA enable failed:', error);
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: '2FA enable failed'
      });
    }
  }
});

/**
 * @route POST /api/auth/2fa/disable
 * @desc Disable 2FA for user
 * @access Private
 */
router.post('/2fa/disable', [
  AuthMiddleware.verifyToken,
  sensitiveLimiter,
  body('token')
    .notEmpty()
    .withMessage('2FA token is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('2FA token must be 6 digits')
    .isNumeric()
    .withMessage('2FA token must be numeric')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new AuthError('Unauthorized', 401);
    }

    await AuthService.disable2FA(userId, req.body.token);
    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    logger.error('2FA disable failed:', error);
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        errors: error.errors
      });
    } else if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: '2FA disable failed'
      });
    }
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', [
  authLimiter,
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { refreshToken } = req.body;
    const result = await AuthService.refreshToken(refreshToken);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        errors: error.errors
      });
    } else if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', [
  AuthMiddleware.verifyToken,
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new AuthError('No token provided', 401);
    }

    await AuthService.logout(token, req.body.refreshToken);
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed:', error);
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        success: false,
        errors: error.errors
      });
    } else if (error instanceof AuthError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }
});

export default router; 