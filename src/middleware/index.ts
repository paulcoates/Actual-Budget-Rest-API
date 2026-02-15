import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { isProduction } from '../utils/config';
import { ApiResponse } from '../types';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
  });

  const response: ApiResponse = {
    status: 'error',
    error: 'Internal server error',
    message: isProduction() ? 'Internal server error' : err.message,
  };

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  logger.warn(`Route not found: ${req.method} ${req.url}`);
  
  const response: ApiResponse = {
    status: 'error',
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.url}`,
  };

  res.status(404).json(response);
};

const isHealthCheck = (req: Request): boolean =>
  req.path === '/healthcheck' || req.path === '/api/healthcheck';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    if (isHealthCheck(req)) return;
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};
