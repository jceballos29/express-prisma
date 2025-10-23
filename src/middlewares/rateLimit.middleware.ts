import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';
import { config } from '../config';
import logger from '../utils/logger';
import { Request, Response } from 'express';

// Rate limiter básico (en memoria)
export const basicRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    }, 'Rate limit exceeded');

    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// Rate limiter con Redis (para producción/múltiples instancias)
export const redisRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  
  // Usar Redis como store
  store: new RedisStore({
    // @ts-expect-error - RedisStore espera un cliente legacy
    client: getRedisClient(),
    prefix: 'rate_limit:',
  }),
  
  handler: (req: Request, res: Response) => {
    logger.warn({
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
    }, 'Rate limit exceeded (Redis)');

    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// Rate limiter estricto para autenticación
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  skipSuccessfulRequests: true, // No contar requests exitosos
  message: {
    error: 'Too many failed login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      email: req.body.email,
    }, 'Auth rate limit exceeded');

    res.status(429).json({
      error: 'Too many failed attempts',
      message: 'Account temporarily locked. Try again in 15 minutes.',
    });
  },
});

// Rate limiter flexible por usuario
export const createUserRateLimiter = (maxRequests: number, windowMinutes: number = 15) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req) => {
      // Usar user ID si está autenticado, si no usar IP
      return (req as any).user?.id?.toString() || req.ip || 'anonymous';
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Rate limiter por endpoint específico
export const apiRateLimiters = {
  // Para operaciones de lectura (más permisivo)
  read: rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // 60 requests por minuto
    message: { error: 'Too many read requests' },
  }),

  // Para operaciones de escritura (más restrictivo)
  write: rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // 10 requests por minuto
    message: { error: 'Too many write requests' },
  }),

  // Para operaciones pesadas (muy restrictivo)
  heavy: rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 3, // 3 requests por minuto
    message: { error: 'Too many heavy operations' },
  }),
};

// Middleware personalizado con Redis manual (más control)
export class RedisRateLimiter {
  private prefix: string;
  private windowMs: number;
  private max: number;

  constructor(options: { prefix: string; windowMs: number; max: number }) {
    this.prefix = options.prefix;
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  async middleware(req: any, res: any, next: any) {
    try {
      const redis = getRedisClient();
      const identifier = req.user?.id?.toString() || req.ip || 'anonymous';
      const key = `${this.prefix}:${identifier}`;

      // Obtener contador actual
      const current = await redis.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= this.max) {
        const ttl = await redis.ttl(key);
        
        logger.warn({
          identifier,
          path: req.path,
          count,
          max: this.max,
        }, 'Custom rate limit exceeded');

        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: ttl,
        });
      }

      // Incrementar contador
      if (count === 0) {
        // Primera request en la ventana
        await redis.setEx(key, Math.floor(this.windowMs / 1000), '1');
      } else {
        await redis.incr(key);
      }

      // Agregar headers de rate limit
      res.setHeader('X-RateLimit-Limit', this.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.max - count - 1));

      next();
    } catch (error) {
      logger.error({ err: error }, 'Rate limiter error');
      // En caso de error, permitir la request (fail open)
      next();
    }
  }
}

// Exportar rate limiter recomendado según entorno
export const rateLimiter = config.env === 'production' ? redisRateLimiter : basicRateLimiter;