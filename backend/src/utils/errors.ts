export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends Error {
  statusCode: number;
  errors: any[];

  constructor(message: string, errors: any[] = [], statusCode: number = 400) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ForbiddenError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
} 