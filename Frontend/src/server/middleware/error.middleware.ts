import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, logger, sendError } from '../utils';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Operational AppError
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.status.toUpperCase(), err.details);
    return;
  }

  // Zod Validation Error
  if (err instanceof ZodError) {
    const formatted = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'Validation failed for incoming payload', 400, 'VALIDATION_ERROR', formatted);
    return;
  }

  // SyntaxError (e.g. malformed JSON body)
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Malformed JSON payload in request body', 400, 'INVALID_JSON');
    return;
  }

  // Unhandled / Internal Server Error
  logger.error('Unhandled Server Exception:', err.stack || err.message);

  const isProduction = process.env.NODE_ENV === 'production';
  const message = isProduction ? 'An unexpected internal error occurred' : err.message;
  const details = isProduction ? undefined : { stack: err.stack };

  sendError(res, message, 500, 'INTERNAL_SERVER_ERROR', details);
};
