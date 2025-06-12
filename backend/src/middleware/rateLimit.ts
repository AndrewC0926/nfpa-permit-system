import rateLimit from 'express-rate-limit';
import { AUTH_CONFIG } from '../config/auth';
import { logger } from '../config/logger';

// Create a store for rate limiting
const store = new Map();

// Clean up expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt < now) {
      store.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Custom store implementation
const customStore = {
  increment: (key: string) => {
    const now = Date.now();
    const windowMs = AUTH_CONFIG.rateLimit.windowMs;
    const current = store.get(key) || { count: 0, expiresAt: now + windowMs };
    
    if (current.expiresAt < now) {
      current.count = 1;
      current.expiresAt = now + windowMs;
    } else {
      current.count += 1;
    }
    
    store.set(key, current);
    return current.count;
  },
  
  decrement: (key: string) => {
    const current = store.get(key);
    if (current) {
      current.count = Math.max(0, current.count - 1);
      store.set(key, current);
    }
  },
  
  resetKey: (key: string) => {
    store.delete(key);
  }
};

// General rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  }
});

// Stricter rate limiter for sensitive operations
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: {
    success: false,
    message: 'Too many sensitive operations, please try again later'
  },
  handler: (req, res) => {
    logger.warn(`Sensitive rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many sensitive operations, please try again later'
    });
  }
});

// Export a function to create custom limiters
export const createCustomLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || AUTH_CONFIG.rateLimit.message,
    store: customStore,
    keyGenerator: (req) => {
      return `${req.ip}-${req.headers['user-agent']}`;
    }
  });
}; 