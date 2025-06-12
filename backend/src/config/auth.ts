import { UserRole } from '../types/roles';
import { SignOptions } from 'jsonwebtoken';

interface JWTConfig {
  secret: string;
  expiresIn: SignOptions['expiresIn'];
  refreshExpiresIn: SignOptions['expiresIn'];
  blacklistEnabled: boolean;
}

interface PasswordConfig {
  saltRounds: number;
  minLength: number;
  requireCapital: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  maxAttempts: number;
  lockoutDuration: number; // in minutes
}

interface TwoFactorConfig {
  issuer: string;
  window: number;
  tokenLength: number;
  backupCodesCount: number;
  backupCodeLength: number;
}

interface SessionConfig {
  maxAge: number;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
  maxConcurrentSessions: number;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}

interface RoleAccess {
  [key: string]: string[];
}

interface AuthConfig {
  jwt: JWTConfig;
  password: PasswordConfig;
  twoFactor: TwoFactorConfig;
  session: SessionConfig;
  rateLimit: RateLimitConfig;
  roleAccess: RoleAccess;
  cors: {
    origin: string[];
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
}

export const AUTH_CONFIG: AuthConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    blacklistEnabled: true
  },
  password: {
    saltRounds: 12,
    minLength: 8,
    requireCapital: true,
    requireNumber: true,
    requireSpecialChar: true,
    maxAttempts: 5,
    lockoutDuration: 15
  },
  twoFactor: {
    issuer: 'ERRCS Permit System',
    window: 1,
    tokenLength: 6,
    backupCodesCount: 10,
    backupCodeLength: 8
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: true,
    maxConcurrentSessions: 3
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  },
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  roleAccess: {
    [UserRole.ADMIN]: ['*'],
    [UserRole.CITY_OFFICIAL]: [
      'permits:read',
      'permits:approve',
      'permits:reject',
      'inspections:read',
      'inspections:schedule',
      'reports:read',
      'users:read'
    ],
    [UserRole.INSPECTOR]: [
      'permits:read',
      'inspections:read',
      'inspections:update',
      'reports:create'
    ],
    [UserRole.CONTRACTOR]: [
      'permits:create',
      'permits:read',
      'permits:update',
      'documents:upload',
      'inspections:read'
    ],
    [UserRole.APPLICANT]: [
      'permits:create',
      'permits:read',
      'documents:upload',
      'inspections:read'
    ]
  }
}; 