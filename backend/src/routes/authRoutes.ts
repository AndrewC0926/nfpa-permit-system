import { Router } from 'express';
import { AuthUtils } from '../utils/auth';
import { User, UserRole } from '../models/User';
import { logger } from '../config/logger';
import { authenticate } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, organization } = req.body;

    // Validate email format
    if (!AuthUtils.validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    const passwordValidation = AuthUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await AuthUtils.hashPassword(password);

    // Create new user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      organization,
      isActive: true
    });

    // Generate tokens
    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      organizationId: user.organization.toString()
    };

    const token = AuthUtils.generateToken(tokenPayload);
    const refreshToken = AuthUtils.generateRefreshToken(tokenPayload);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Error in user registration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await AuthUtils.comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      organizationId: user.organization.toString()
    };

    const token = AuthUtils.generateToken(tokenPayload);
    const refreshToken = AuthUtils.generateRefreshToken(tokenPayload);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Error in user login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Enable 2FA
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const secret = AuthUtils.generateTwoFactorSecret();
    const qrCodeUrl = AuthUtils.generateTwoFactorQRCode(user.email, secret);

    user.twoFactorSecret = secret;
    user.twoFactorEnabled = true;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        secret,
        qrCodeUrl
      }
    });
  } catch (error) {
    logger.error('Error enabling 2FA:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify 2FA token
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.twoFactorSecret) {
      return res.status(404).json({
        success: false,
        message: 'User or 2FA secret not found'
      });
    }

    const isValid = AuthUtils.verifyTwoFactorToken(token, user.twoFactorSecret);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid 2FA token'
      });
    }

    res.status(200).json({
      success: true,
      message: '2FA token verified successfully'
    });
  } catch (error) {
    logger.error('Error verifying 2FA token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const payload = AuthUtils.verifyToken(refreshToken);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const token = AuthUtils.generateToken({
      userId: payload.userId,
      role: payload.role,
      organizationId: payload.organizationId
    });

    res.status(200).json({
      success: true,
      data: {
        token
      }
    });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

export default router; 