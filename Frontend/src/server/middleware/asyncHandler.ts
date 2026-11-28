import { Request, Response, NextFunction, RequestHandler } from 'express';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
