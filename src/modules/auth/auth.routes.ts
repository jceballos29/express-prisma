import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { apiRateLimiters, authRateLimiter } from '../../middlewares/rateLimit.middleware';
import { validate } from '../../middlewares/validation.middleware';
import { authController } from './auth.controller';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from './auth.schemas';

const router = Router();

// POST /auth/login - Iniciar sesión
router.post(
  '/login',
  authRateLimiter, // Rate limit estricto para auth
  validate(loginSchema),
  authController.login
);

// POST /auth/register - Registrar nuevo usuario
router.post(
  '/register',
  apiRateLimiters.write,
  validate(registerSchema),
  authController.register
);

// POST /auth/refresh - Refrescar token
router.post(
  '/refresh',
  apiRateLimiters.write,
  validate(refreshTokenSchema),
  authController.refreshToken
);

// POST /auth/logout - Cerrar sesión (requiere auth)
router.post(
  '/logout',
  authenticate,
  authController.logout
);

export default router;