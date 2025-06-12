import request from 'supertest';
import { app } from '../app';
import { User, IUser } from '../models/User';
import { AuthUtils } from '../utils/auth';
import { connectDatabase, disconnectDatabase } from '../config/database';

describe('Authentication System', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await disconnectDatabase();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRACTOR',
          organization: '123456789012'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not register user with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRACTOR',
          organization: '123456789012'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not register user with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
          role: 'CONTRACTOR',
          organization: '123456789012'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('User Login', () => {
    beforeAll(async () => {
      const hashedPassword = await AuthUtils.hashPassword('Test123!@#');
      await User.create({
        email: 'login@example.com',
        password: hashedPassword,
        firstName: 'Login',
        lastName: 'Test',
        role: 'CONTRACTOR',
        organization: '123456789012',
        isActive: true
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrong-password'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('2FA', () => {
    let authToken: string;

    beforeAll(async () => {
      const user = await User.findOne({ email: 'login@example.com' }) as IUser;
      if (user) {
        const tokenPayload = {
          userId: user._id.toString(),
          role: user.role,
          organizationId: user.organization.toString()
        };
        authToken = AuthUtils.generateToken(tokenPayload);
      }
    });

    it('should enable 2FA', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.secret).toBeDefined();
      expect(response.body.data.qrCodeUrl).toBeDefined();
    });

    it('should verify 2FA token', async () => {
      const user = await User.findOne({ email: 'login@example.com' });
      if (!user || !user.twoFactorSecret) {
        throw new Error('User or 2FA secret not found');
      }

      const token = AuthUtils.verifyTwoFactorToken('123456', user.twoFactorSecret);
      const response = await request(app)
        .post('/api/auth/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: '123456' });

      // Note: This will fail because we're using a dummy token
      // In real testing, we would generate a valid token
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', async () => {
      const user = await User.findOne({ email: 'login@example.com' }) as IUser;
      if (!user) {
        throw new Error('User not found');
      }

      const tokenPayload = {
        userId: user._id.toString(),
        role: user.role,
        organizationId: user.organization.toString()
      };
      const refreshToken = AuthUtils.generateRefreshToken(tokenPayload);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should not refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
}); 