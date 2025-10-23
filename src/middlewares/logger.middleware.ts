import { Request, Response, NextFunction } from 'express';
import { loggerHelpers } from '../utils/logger';

// Middleware para loggear todas las requests
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Capturar el método original de res.end
  const originalEnd = res.end;
  
  // Override res.end para loggear cuando la respuesta termine
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    // Restaurar el método original
    res.end = originalEnd;
    
    // Calcular duración
    const duration = Date.now() - startTime;
    
    // Loggear request
    loggerHelpers.logRequest(
      req.method,
      req.originalUrl || req.url,
      res.statusCode,
      duration
    );
    
    // Llamar al método original
    return res.end(chunk, encoding, cb);
  };
  
  next();
}

// Middleware para agregar request ID
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = id as string;
  res.setHeader('X-Request-ID', id);
  next();
}