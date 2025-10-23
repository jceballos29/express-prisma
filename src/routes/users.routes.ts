import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { getRedisClient, createCacheHelper } from '../config/redis';
import { authenticate, authorize, authorizeOwner, generateToken } from '../middlewares/auth.middleware';
import { validate, validateMultiple } from '../middlewares/validation.middleware';
import { authRateLimiter, apiRateLimiters } from '../middlewares/rateLimit.middleware';
import {
  createUserSchema,
  updateUserSchema,
  loginSchema,
  paginationSchema,
  userIdParamsSchema,
} from '../schemas/user.schemas';
import logger from '../utils/logger';
import bcrypt from 'bcrypt';

const router = Router();

// 🔓 PUBLIC ROUTES

// Login (con rate limiting estricto)
router.post(
  '/auth/login',
  authRateLimiter,
  validate(loginSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      // Aquí validarías el password con bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }
      
      // Por ahora, simulamos que es válido
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      logger.error({ err: error }, 'Login error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Registrar usuario
router.post(
  '/auth/register',
  apiRateLimiters.write,
  validate(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name, age } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
        });
      }

      // Aquí hashearías el password con bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          // age,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Generar token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      res.status(201).json({
        message: 'User created successfully',
        token,
        user,
      });
    } catch (error) {
      logger.error({ err: error }, 'Register error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// 🔒 PROTECTED ROUTES (requieren autenticación)

// Obtener todos los usuarios (con paginación y cache)
router.get(
  '/',
  authenticate,
  apiRateLimiters.read,
  validate(paginationSchema, 'query'),
  async (req: Request, res: Response) => {
    try {
      const { page, limit, sortBy, order } = req.query as any;
      const cache = createCacheHelper(getRedisClient());
      const cacheKey = `users:list:${page}:${limit}:${sortBy}:${order}`;

      // Intentar obtener del cache
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          source: 'cache',
          data: cached,
        });
      }

      // Calcular skip
      const skip = (page - 1) * limit;

      // Consultar DB
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: order } : { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        }),
        prisma.user.count(),
      ]);

      const result = {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Guardar en cache por 5 minutos
      await cache.set(cacheKey, result, 300);

      res.json({
        source: 'database',
        data: result,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching users');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Obtener usuario por ID
router.get(
  '/:id',
  authenticate,
  apiRateLimiters.read,
  validate(userIdParamsSchema, 'params'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const cache = createCacheHelper(getRedisClient());
      const cacheKey = `user:${id}`;

      // Intentar obtener del cache
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({
          source: 'cache',
          data: cached,
        });
      }

      // Consultar DB
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Guardar en cache por 10 minutos
      await cache.set(cacheKey, user, 600);

      res.json({
        source: 'database',
        data: user,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching user');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Actualizar usuario (solo el mismo usuario o admin)
router.put(
  '/:id',
  authenticate,
  authorizeOwner((req) => req.params.id),
  apiRateLimiters.write,
  validateMultiple({
    params: userIdParamsSchema,
    body: updateUserSchema,
  }),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Invalidar caches
      const cache = createCacheHelper(getRedisClient());
      await Promise.all([
        cache.del(`user:${id}`),
        cache.delPattern('users:list:*'),
      ]);

      res.json({
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error updating user');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Eliminar usuario (solo admin)
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  apiRateLimiters.write,
  validate(userIdParamsSchema, 'params'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await prisma.user.delete({
        where: { id: parseInt(id) },
      });

      // Invalidar caches
      const cache = createCacheHelper(getRedisClient());
      await Promise.all([
        cache.del(`user:${id}`),
        cache.delPattern('users:list:*'),
      ]);

      res.json({
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error({ err: error }, 'Error deleting user');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Obtener perfil del usuario autenticado
router.get(
  '/me/profile',
  authenticate,
  apiRateLimiters.read,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId.toString()) },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        data: user,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching profile');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;