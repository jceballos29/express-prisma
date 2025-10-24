import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

import { logger, loggerHelpers } from '../shared/utils';

import { config } from './index';

// Tipo del cliente Redis
type RedisClient = RedisClientType;

// Cliente Redis (singleton)
let redisClient: RedisClient | null = null;
let connectingPromise: Promise<RedisClient> | null = null;

/**
 * Configuración de reconexión
 */
const reconnectStrategy = (retries: number): number | Error => {
  if (retries > 10) {
    logger.error('❌ Redis: Maximum reconnection attempts reached');
    return new Error('Too many reconnection attempts');
  }

  // Estrategia exponencial: 100ms, 200ms, 400ms, etc.
  const delay = Math.min(retries * 100, 3000);
  logger.warn({ retries, delay }, 'Redis reconnecting...');
  return delay;
};

/**
 * Crear y configurar cliente Redis
 */
export function createRedisClient(): RedisClient {
  if (!config.redis?.url) {
    throw new Error('❌ Redis URL not configured');
  }

  const client = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy,
      connectTimeout: 10000, // 10 segundos
    },
    // Configuración adicional
    pingInterval: 60000, // Ping cada 60 segundos para mantener conexión
  }) as RedisClient;

  // ============================================
  // EVENT LISTENERS
  // ============================================

  client.on('error', (err) => {
    loggerHelpers.logError(err, {
      service: 'redis',
      event: 'error',
    });
  });

  client.on('connect', () => {
    logger.info('🔄 Redis: Connecting...');
  });

  client.on('ready', () => {
    logger.info('✅ Redis: Connected and ready');
  });

  client.on('reconnecting', () => {
    logger.warn('⚠️  Redis: Reconnecting...');
  });

  client.on('end', () => {
    logger.warn('⚠️  Redis: Connection closed');
  });

  // Eventos adicionales útiles
  client.on('disconnected', () => {
    logger.warn({ service: 'redis' }, 'Redis disconnected');
  });

  return client;
}

/**
 * Conectar a Redis
 */
export async function connectRedis(): Promise<RedisClient> {
  try {
    // Si ya existe conexión activa, retornarla
    if (redisClient && redisClient.isOpen) {
      logger.info('✅ Redis: Already connected');
      return redisClient;
    }

    if (connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
      redisClient = createRedisClient();
      await redisClient.connect();
      await redisClient.ping();
      logger.info('✅ Redis health check passed');
      connectingPromise = null;
      return redisClient!;
    })();

    return connectingPromise;
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'redis',
      action: 'connect',
    });
    throw error;
  }
}

/**
 * Desconectar de Redis
 */
export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      redisClient = null;
      logger.info('✅ Redis: Disconnected gracefully');
    }
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'redis',
      action: 'disconnect',
    });
  }
}

/**
 * Obtener cliente Redis (lazy initialization)
 * IMPORTANTE: Asegurarse de llamar connectRedis() primero
 */
export function getRedisClient(): RedisClient {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client not connected. Call connectRedis() first.');
  }
  return redisClient;
}

/**
 * Health check de Redis
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'redis',
      check: 'health',
    });
    return false;
  }
}

/**
 * Obtener información de Redis
 */
export async function getRedisInfo(): Promise<{
  connected: boolean;
  info?: Record<string, string>;
}> {
  try {
    if (!redisClient || !redisClient.isOpen) {
      return { connected: false };
    }

    const info = await redisClient.info();
    const infoObj: Record<string, string> = {};

    // Parsear info string a objeto
    info.split('\r\n').forEach((line) => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          infoObj[key] = value;
        }
      }
    });

    return {
      connected: true,
      info: infoObj,
    };
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'redis',
      action: 'getInfo',
    });
    return { connected: false };
  }
}

/**
 * Limpiar toda la base de datos Redis
 * ⚠️ USAR CON PRECAUCIÓN - Solo en desarrollo/testing
 */
export async function flushRedis(): Promise<boolean> {
  try {
    if (config.env !== 'development') {
      logger.error('flushRedis() is only allowed in development');
      return false;
    }

    if (!redisClient || !redisClient.isOpen) {
      return false;
    }

    await redisClient.flushDb();
    logger.warn('⚠️  Redis: Database flushed');
    return true;
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'redis',
      action: 'flush',
    });
    return false;
  }
}

/**
 * Verificar si Redis está conectado
 */
export function isRedisConnected(): boolean {
  return !!(redisClient && redisClient.isOpen);
}
