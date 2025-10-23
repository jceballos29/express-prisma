import express, { Application, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from './config';
import helmet from 'helmet';
import { health, users } from './routes';
import { requestLogger, requestId } from './middlewares/logger.middleware';
import { rateLimiter } from './middlewares/rateLimit.middleware';
import logger from './utils/logger';

// Crear aplicación Express
export function createApp(): Application {
  const app = express();

  // Request ID (debe ser primero)
  app.use(requestId);

  // Logger personalizado
  app.use(requestLogger);

  // Rate limiting global
  app.use(rateLimiter);
  
  app.use(helmet());
  app.use(cors(config.cors));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Morgan logging (solo en desarrollo)
  if (config.env === 'development') {
    app.use(morgan('dev'));
  }

  // Ruta de bienvenida
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'API is running',
      version: '1.0.0',
      environment: config.env,
    });
  });

  app.use('/health', health);
  app.use('/api/users', users);

  // Middleware de manejo de errores
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    
    res.status(500).json({
      error: config.env === 'development' ? err.message : 'Internal server error',
      ...(config.env === 'development' && { stack: err.stack }),
    });
  });

  // Ruta 404
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
      method: req.method,
    });
  });

  return app;
}