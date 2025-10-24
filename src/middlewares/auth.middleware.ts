import { randomUUID } from 'crypto';

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { config } from '../config';
import { cacheService } from '../infrastructure/';
import { logger, loggerHelpers } from '../shared/utils';
/**
 * Middleware para verificar JWT
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      loggerHelpers.logAuth('missing_token', undefined, false);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      return;
    }

    // Extraer token
    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret) as jwt.JwtPayload;

    if (decoded.jti) {
      const exists = await cacheService.exists(`token:${decoded.jti}`);
      if (!exists) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Token invalidated or expired',
        });
        return;
      }
    }

    // Agregar usuario al request
    if (typeof decoded === 'object' && decoded !== null) {
      res.locals.user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } else {
      loggerHelpers.logAuth('invalid_token_payload', undefined, false);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
      return;
    }

    loggerHelpers.logAuth('token_verified', res.locals.user.id, true);

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      loggerHelpers.logAuth('token_expired', undefined, false);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      loggerHelpers.logAuth('token_invalid', undefined, false);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
      return;
    }

    logger.error({ err: error }, 'Authentication error');

    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, pero agrega user si existe
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret);

    if (typeof decoded === 'object' && decoded !== null) {
      res.locals.user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } else {
      loggerHelpers.logAuth('invalid_token_payload', undefined, false);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
      return;
    }

    next();
  } catch {
    // Simplemente continuar sin usuario si hay error
    next();
  }
}

/**
 * Middleware para verificar roles
 */
export function authorize(...allowedRoles: string[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const userRole = res.locals.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      loggerHelpers.logAuth('unauthorized_role', res.locals.user.id, false);

      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Middleware para verificar que el usuario accede solo a sus recursos
 */
export function authorizeOwner(getUserIdFromRequest: (req: Request) => string | number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const resourceUserId = getUserIdFromRequest(req);
    const requestingUserId = res.locals.user.id;

    // Admin puede acceder a todo
    if (res.locals.user.role === 'admin') {
      return next();
    }

    // Verificar ownership
    if (resourceUserId.toString() !== requestingUserId.toString()) {
      loggerHelpers.logAuth('unauthorized_resource', res.locals.user.id, false);

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources',
      });
    }

    next();
  };
}

/**
 * Utilidad para generar JWT
 */
export function generateToken(payload: {
  id: number | string;
  email: string;
  role?: string;
}): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    jwtid: randomUUID(),
  });
}

/**
 * Utilidad para generar refresh token (válido por más tiempo)
 */
export function generateRefreshToken(payload: {
  id: number | string;
  email: string;
  role?: string;
}): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    jwtid: randomUUID(),
  });
}

/**
 * Middleware para rate limiting basado en usuario autenticado
 */
export function userRateLimit(_req: Request, _res: Response, next: NextFunction) {
  // Si hay usuario, usar su ID para rate limiting
  // Si no hay usuario, usar IP
  //const identifier = res.locals.user?.id || req.ip;

  // Puedes agregar la lógica de rate limiting aquí
  // o usar esto en conjunto con express-rate-limit

  next();
}
