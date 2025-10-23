import { Router } from 'express';
import {
  authRateLimiter,
  apiRateLimiters,
  createUserRateLimiter,
  RedisRateLimiter,
} from '../middlewares/rateLimit.middleware';

const router = Router();

// Ejemplo 1: Rate limit estricto en login
router.post('/auth/login', authRateLimiter, async (req, res) => {
  // Lógica de login
  res.json({ message: 'Login endpoint' });
});

// Ejemplo 2: Rate limit por tipo de operación
router.get('/posts', apiRateLimiters.read, async (req, res) => {
  // Leer posts (60 req/min)
  res.json({ message: 'Read posts' });
});

router.post('/posts', apiRateLimiters.write, async (req, res) => {
  // Crear post (10 req/min)
  res.json({ message: 'Create post' });
});

router.post('/posts/import', apiRateLimiters.heavy, async (req, res) => {
  // Operación pesada (3 req/min)
  res.json({ message: 'Heavy operation' });
});

// Ejemplo 3: Rate limit personalizado por usuario
const premiumUserLimiter = createUserRateLimiter(1000, 60); // 1000 req/hora
const basicUserLimiter = createUserRateLimiter(100, 60); // 100 req/hora

router.get('/api/premium', premiumUserLimiter, async (req, res) => {
  res.json({ message: 'Premium endpoint' });
});

// Ejemplo 4: Rate limit con Redis personalizado
const customLimiter = new RedisRateLimiter({
  prefix: 'custom_limit',
  windowMs: 60000,
  max: 50,
});

router.get(
  '/api/custom',
  (req, res, next) => customLimiter.middleware(req, res, next),
  async (req, res) => {
    res.json({ message: 'Custom rate limited endpoint' });
  }
);

// Ejemplo 5: Múltiples rate limiters en cascada
router.post(
  '/api/sensitive',
  createUserRateLimiter(10, 1), // 10 por minuto
  authRateLimiter, // 5 fallos en 15 minutos
  async (req, res) => {
    res.json({ message: 'Highly protected endpoint' });
  }
);

export default router;