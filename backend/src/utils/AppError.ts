export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details?: unknown): AppError {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Forbidden: Access Denied'): AppError {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource Not Found'): AppError {
    return new AppError(message, 404);
  }

  static conflict(message = 'Resource Conflict'): AppError {
    return new AppError(message, 409);
  }

  static internal(message = 'Internal Server Error'): AppError {
    return new AppError(message, 500);
  }
}
