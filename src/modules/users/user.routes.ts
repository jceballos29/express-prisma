import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate, authorize, authorizeOwner } from '../../middlewares/auth.middleware';
import { validate, validateMultiple } from '../../middlewares/validation.middleware';
import { apiRateLimiters } from '../../middlewares/rateLimit.middleware';
import {
  createUserSchema,
  updateUserSchema,
  paginationSchema,
  userIdParamsSchema,
} from './user.schemas';

const router = Router();

// 🔓 PUBLIC ROUTES
// (ninguna por ahora, el registro está en /auth)

// 🔒 PROTECTED ROUTES

// GET /users - Obtener todos los usuarios (con paginación)
router.get(
  '/',
  authenticate,
  apiRateLimiters.read,
  validate(paginationSchema, 'query'),
  userController.getAllUsers
);

// GET /users/me - Obtener perfil del usuario autenticado
router.get(
  '/me',
  authenticate,
  apiRateLimiters.read,
  userController.getProfile
);

// GET /users/:id - Obtener usuario por ID
router.get(
  '/:id',
  authenticate,
  apiRateLimiters.read,
  validate(userIdParamsSchema, 'params'),
  userController.getUserById
);

// PUT /users/:id - Actualizar usuario (solo el mismo usuario o admin)
router.put(
  '/:id',
  authenticate,
  authorizeOwner((req) => req.params.id),
  apiRateLimiters.write,
  validateMultiple({
    params: userIdParamsSchema,
    body: updateUserSchema,
  }),
  userController.updateUser
);

// DELETE /users/:id - Eliminar usuario (solo admin)
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  apiRateLimiters.write,
  validate(userIdParamsSchema, 'params'),
  userController.deleteUser
);

export default router;