import type { Request, Response, NextFunction } from 'express';

import { loggerHelpers } from '../shared/utils';

// Middleware para loggear todas las requests
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Guardar referencia del método original
  const originalEnd = res.end.bind(res);

  // Redefinir usando la misma firma de Response["end"]
  res.end = function (...args: Parameters<typeof originalEnd>): ReturnType<typeof originalEnd> {
    // Restaurar el método original
    res.end = originalEnd;

    // Calcular duración
    const duration = Date.now() - startTime;

    // Loggear
    loggerHelpers.logRequest(req.method, req.originalUrl || req.url, res.statusCode, duration);

    // Llamar al método original
    return originalEnd(...args);
  } as typeof res.end; // 👈 esto asegura compatibilidad con las sobrecargas

  next();
}

// Middleware para agregar request ID
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id =
    req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = id as string;
  res.setHeader('X-Request-ID', id);
  next();
}
