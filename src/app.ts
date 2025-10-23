import cors from 'cors';
import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestId, requestLogger } from './middlewares/logger.middleware';
import { rateLimiter } from './middlewares/rateLimit.middleware';
import { auth } from './modules/auth';
import { users } from './modules/users';
import { health, welcome } from './routes';

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

  app.use('/', welcome);
  app.use('/health', health);
  app.use('/api/auth', auth);
  app.use('/api/users', users);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;   
}