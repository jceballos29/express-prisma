import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger, { loggerHelpers } from '../utils/logger';

// Extender tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        email: string;
        role?: string;
      };
    }
  }
}

/**
 * Middleware para verificar JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      loggerHelpers.logAuth('missing_token', undefined, false);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    // Extraer token
    const token = authHeader.substring(7); // Remover "Bearer "

    // Verificar token
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret) as any;

    // Agregar usuario al request
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    loggerHelpers.logAuth('token_verified', req.user.id, true);

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      loggerHelpers.logAuth('token_expired', undefined, false);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      loggerHelpers.logAuth('token_invalid', undefined, false);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    }

    logger.error({ err: error }, 'Authentication error');
    
    return res.status(500).json({
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
    const decoded = jwt.verify(token, config.jwt.secret as jwt.Secret) as any;

    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    // Simplemente continuar sin usuario si hay error
    next();
  }
}

/**
 * Middleware para verificar roles
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      loggerHelpers.logAuth('unauthorized_role', req.user.id, false);
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
}

/**
 * Middleware para verificar que el usuario accede solo a sus recursos
 */
export function authorizeOwner(getUserIdFromRequest: (req: Request) => string | number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const resourceUserId = getUserIdFromRequest(req);
    const requestingUserId = req.user.id;

    // Admin puede acceder a todo
    if (req.user.role === 'admin') {
      return next();
    }

    // Verificar ownership
    if (resourceUserId.toString() !== requestingUserId.toString()) {
      loggerHelpers.logAuth('unauthorized_resource', req.user.id, false);
      
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
  return jwt.sign(
    payload,
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );
}

/**
 * Utilidad para generar refresh token (válido por más tiempo)
 */
export function generateRefreshToken(payload: {
  id: number | string;
  email: string;
}): string {
  return jwt.sign(
    payload,
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn, // 30 días
    }
  );
}

/**
 * Middleware para rate limiting basado en usuario autenticado
 */
export function userRateLimit(req: Request, res: Response, next: NextFunction) {
  // Si hay usuario, usar su ID para rate limiting
  // Si no hay usuario, usar IP
  const identifier = req.user?.id || req.ip;
  
  // Puedes agregar la lógica de rate limiting aquí
  // o usar esto en conjunto con express-rate-limit
  
  next();
}