import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthMiddleware } from '../auth';
import { AuthUtils } from '../../utils/auth';
import { UserRole } from '../../models/User';

// Mock the auth utils
jest.mock('../../utils/auth', () => ({
  AuthUtils: {
    verifyToken: jest.fn(),
    hasPermission: jest.fn(),
    verifyTwoFactorToken: jest.fn()
  }
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should return 401 if no token provided', () => {
      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'No token provided'
      });
    });

    it('should return 401 if token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      (AuthUtils.verifyToken as jest.Mock).mockReturnValue(null);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should set user and call next if token is valid', () => {
      const mockPayload = {
        userId: '123',
        role: UserRole.ADMIN,
        organizationId: '456'
      };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (AuthUtils.verifyToken as jest.Mock).mockReturnValue(mockPayload);

      authenticate(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('AuthMiddleware', () => {
    describe('hasPermission', () => {
      it('should return 401 if user is not authenticated', () => {
        const middleware = AuthMiddleware.hasPermission('test-permission');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'User not authenticated'
        });
      });

      it('should return 403 if user lacks required permission', () => {
        mockRequest.user = {
          userId: '123',
          role: UserRole.APPLICANT,
          organizationId: '456'
        };
        (AuthUtils.hasPermission as jest.Mock).mockReturnValue(false);

        const middleware = AuthMiddleware.hasPermission('test-permission');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Insufficient permissions'
        });
      });

      it('should call next if user has required permission', () => {
        mockRequest.user = {
          userId: '123',
          role: UserRole.ADMIN,
          organizationId: '456'
        };
        (AuthUtils.hasPermission as jest.Mock).mockReturnValue(true);

        const middleware = AuthMiddleware.hasPermission('test-permission');
        middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('verify2FA', () => {
      it('should return 400 if token or secret is missing', async () => {
        await AuthMiddleware.verify2FA(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: '2FA token and secret are required'
        });
      });

      it('should return 401 if 2FA token is invalid', async () => {
        mockRequest.body = { token: '123456', secret: 'secret' };
        (AuthUtils.verifyTwoFactorToken as jest.Mock).mockReturnValue(false);

        await AuthMiddleware.verify2FA(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Invalid 2FA token'
        });
      });

      it('should call next if 2FA token is valid', async () => {
        mockRequest.body = { token: '123456', secret: 'secret' };
        (AuthUtils.verifyTwoFactorToken as jest.Mock).mockReturnValue(true);

        await AuthMiddleware.verify2FA(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
      });
    });

    describe('Role-based middleware', () => {
      it('isAdmin should return 403 if user is not admin', () => {
        mockRequest.user = {
          userId: '123',
          role: UserRole.APPLICANT,
          organizationId: '456'
        };

        AuthMiddleware.isAdmin(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Admin access required'
        });
      });

      it('isAdmin should call next if user is admin', () => {
        mockRequest.user = {
          userId: '123',
          role: UserRole.ADMIN,
          organizationId: '456'
        };

        AuthMiddleware.isAdmin(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
      });

      it('isCityOfficial should return 403 if user is not city official', () => {
        mockRequest.user = {
          userId: '123',
          role: UserRole.APPLICANT,
          organizationId: '456'
        };

        AuthMiddleware.isCityOfficial(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'City official access required'
        });
      });

      it('isInspector should return 403 if user is not inspector', () => {
        mockRequest.user = {
          userId: '123',
          role: UserRole.APPLICANT,
          organizationId: '456'
        };

        AuthMiddleware.isInspector(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(403);
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Inspector access required'
        });
      });
    });
  });
}); 