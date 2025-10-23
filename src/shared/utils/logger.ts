import pino from 'pino';
import { config } from '../../config';
import { Request, Response } from 'express';

// Configuración de Pino
export const logger = pino({
  level: config.logging.level,

  // Pretty print en desarrollo
  transport:
    config.env === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{levelLabel} - {msg}',
          },
        }
      : undefined,

  // Serializers personalizados
  serializers: {
    req: (req: Request) => ({
      id: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }),
    res: (res: Response) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },

  // Campos base
  base: config.env === 'production' ? { env: config.env } : undefined,

  timestamp: pino.stdTimeFunctions.isoTime,
});

// Stream para Morgan (si decides usarlo)
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// Helper methods para logging específico
export const loggerHelpers = {
  // HTTP Request logging
  logRequest: (
    method: string,
    url: string,
    statusCode: number,
    duration: number
  ) => {
    const logData = {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
    };

    if (statusCode >= 500) {
      logger.error(logData, 'HTTP Request - Server Error');
    } else if (statusCode >= 400) {
      logger.warn(logData, 'HTTP Request - Client Error');
    } else {
      logger.info(logData, 'HTTP Request');
    }
  },

  // Database operations
  logDatabase: (query: string, duration: number) => {
    logger.debug(
      {
        query: config.env === 'development' ? query : '[REDACTED]',
        duration: `${duration}ms`,
      },
      'Database Query'
    );
  },

  // Cache operations
  logCache: (action: 'hit' | 'miss' | 'set' | 'del', key: string) => {
    logger.debug({ action, key }, `Cache ${action.toUpperCase()}`);
  },

  // Error logging con contexto
  logError: (error: Error, context?: Record<string, any>) => {
    logger.error(
      {
        err: error,
        ...context,
      },
      error.message
    );
  },

  // Authentication events
  logAuth: (
    action: string,
    userId?: string | number,
    success: boolean = true
  ) => {
    const logData = { action, userId, success };

    if (success) {
      logger.info(logData, 'Authentication Success');
    } else {
      logger.warn(logData, 'Authentication Failed');
    }
  },

  // WebSocket events
  logWebSocket: (event: string, socketId?: string, data?: any) => {
    logger.info(
      {
        event,
        socketId,
        ...data,
      },
      `WebSocket: ${event}`
    );
  },

  // Performance logging
  logPerformance: (
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ) => {
    const logData = {
      operation,
      duration: `${duration}ms`,
      ...metadata,
    };

    if (duration > 1000) {
      logger.warn(logData, 'Slow Operation Detected');
    } else {
      logger.debug(logData, 'Performance Metric');
    }
  },
};

// Child logger para módulos específicos
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

// export default logger;
