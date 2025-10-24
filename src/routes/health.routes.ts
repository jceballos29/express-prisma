import type { Request, Response } from 'express';
import { Router } from 'express';

import { config } from '../config';
import { checkDatabaseHealth } from '../config/database';
import { checkRedisHealth } from '../config/redis';

const router = Router();

// Health check básico
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// Health check detallado
router.get('/detailed', async (_req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Verificar servicios en paralelo
    const [databaseHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const responseTime = Date.now() - startTime;
    const allHealthy = databaseHealthy && redisHealthy;

    const status = allHealthy ? 200 : 503;

    res.status(status).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: config.env,
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: databaseHealthy ? 'up' : 'down',
          healthy: databaseHealthy,
        },
        redis: {
          status: redisHealthy ? 'up' : 'down',
          healthy: redisHealthy,
        },
      },
      uptime: process.uptime(),
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      error: config.env === 'development' ? (error as Error).message : 'Health check failed',
    });
  }
});

// Readiness probe (para Kubernetes)
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const [databaseHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    if (databaseHealthy && redisHealthy) {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false });
    }
  } catch {
    res.status(503).json({ ready: false });
  }
});

// Liveness probe (para Kubernetes)
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export default router;
