import { NextFunction, Request, Response } from 'express';
import { config } from '../config';
import { AppError } from '../shared/errors/app.error';
import { logger } from '../shared/utils';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from './../generated/prisma/internal/prismaNamespace';

/**
 * Middleware global para manejo de errores
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log del error
  logger.error({
    err,
    path: req.path,
    method: req.method,
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
  }, 'Request error');

  // Si ya se envió la respuesta, pasar al siguiente handler
  if (res.headersSent) {
    return next(err);
  }

  // Errores de aplicación personalizados
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(config.env === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Errores de Prisma
  if (err instanceof PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err);
    res.status(prismaError.status).json({
      success: false,
      error: prismaError.message,
      ...(config.env === 'development' && { code: err.code, meta: err.meta }),
    });
    return;
  }

  if (err instanceof PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Invalid data provided',
      ...(config.env === 'development' && { details: err.message }),
    });
    return;
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: config.env === 'development' ? err.message : 'Internal server error',
    ...(config.env === 'development' && { stack: err.stack }),
  });
}

/**
 * Manejar errores específicos de Prisma
 */
function handlePrismaError(error: PrismaClientKnownRequestError): {
  status: number;
  message: string;
} {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = error.meta?.target as string[] | undefined;
      const field = target?.[0] || 'field';
      return {
        status: 409,
        message: `A record with this ${field} already exists`,
      };

    case 'P2025':
      // Record not found
      return {
        status: 404,
        message: 'Record not found',
      };

    case 'P2003':
      // Foreign key constraint violation
      return {
        status: 400,
        message: 'Invalid reference to related record',
      };

    case 'P2014':
      // Invalid ID
      return {
        status: 400,
        message: 'Invalid ID provided',
      };

    default:
      return {
        status: 500,
        message: 'Database error',
      };
  }
}

/**
 * Middleware para rutas no encontradas (404)
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn({
    path: req.path,
    method: req.method,
    ip: req.ip,
  }, 'Route not found');

  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
}