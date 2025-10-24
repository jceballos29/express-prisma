import type { Request, Response } from 'express';
import { Router } from 'express';

import { config } from '../config';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API is running',
    version: '1.0.0',
    environment: config.env,
    // documentation: '/api/docs', // Si agregas Swagger
  });
});

export default router;
