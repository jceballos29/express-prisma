// redisClient.ts
import { createClient, type RedisClientType } from 'redis';
import { config } from './index';
import logger, { loggerHelpers } from '../utils/logger';

// Tipado flexible para evitar conflictos RESP2/3
export type RedisClient = RedisClientType<any, any, any>;

let redisClient: RedisClient | null = null;
let connectingPromise: Promise<RedisClient> | null = null;

// Crear cliente Redis
export function createRedisClient(): RedisClient {
  if (!config.redis?.url) {
    throw new Error('❌ Redis URL not configured');
  }

  const client = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('❌ Redis: Too many reconnection attempts');
          return new Error('Too many retries');
        }
        return retries * 100;
      },
    },
  }) as RedisClient;

  client.on('error', (err) => loggerHelpers.logError(err, { service: 'redis' }));
  client.on('connect', () => logger.info('🔄 Redis connecting...'));
  client.on('ready', () => logger.info('✅ Redis connected and ready'));
  client.on('reconnecting', () => logger.warn('⚠️  Redis reconnecting...'));
  client.on('end', () => logger.warn('⚠️  Redis connection closed'));

  return client;
}

// Conectar a Redis (seguro frente a llamadas concurrentes)
export async function connectRedis(): Promise<RedisClient> {
  if (redisClient && redisClient.isOpen) {
    console.log('✅ Redis already connected');
    return redisClient;
  }

  if (connectingPromise) return connectingPromise;

  connectingPromise = (async () => {
    redisClient = createRedisClient();
    await redisClient.connect();
    await redisClient.ping();
    console.log('✅ Redis health check passed');
    connectingPromise = null;
    return redisClient!;
  })();

  return connectingPromise;
}

// Desconectar
export async function disconnectRedis() {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      redisClient = null;
      logger.info('✅ Redis disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting Redis:', error);
  }
}

// Obtener cliente Redis
export function getRedisClient(): RedisClient {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client not connected. Call connectRedis() first.');
  }
  return redisClient;
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!redisClient || !redisClient.isOpen) return false;
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Clase de utilidades de caché
export class RedisCache {
  constructor(private client: RedisClient) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  // Usar SCAN en lugar de KEYS para producción
  async delPattern(pattern: string): Promise<number> {
    try {
      let cursor = 0;
      let totalDeleted = 0;

      do {
        const { cursor: nextCursor, keys } = await this.client.scan(String(cursor), {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = Number(nextCursor);
        if (keys.length) {
          totalDeleted += await this.client.del(keys);
        }
      } while (cursor !== 0);

      return totalDeleted;
    } catch (error) {
      console.error(`Error deleting cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }
}

export function createCacheHelper(client: RedisClient): RedisCache {
  return new RedisCache(client);
}

// Cierre limpio en señales
process.on('SIGINT', async () => {
  await disconnectRedis();
  process.exit(0);
});
