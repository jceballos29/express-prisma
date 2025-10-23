import { getRedisClient } from '../../config/redis';
import { ICacheService } from '../../shared/interfaces';
import { logger, loggerHelpers } from '../../shared/utils';

export class CacheService implements ICacheService {
  private getClient() {
    return getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = this.getClient();
      const data = await client.get(key);

      if (data) {
        loggerHelpers.logCache('hit', key);
        return JSON.parse(data) as T;
      }

      loggerHelpers.logCache('miss', key);
      return null;
    } catch (error) {
      loggerHelpers.logError(error as Error, { operation: 'cache.get', key });
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = this.getClient();
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }

      loggerHelpers.logCache('set', key);
      return true;
    } catch (error) {
      loggerHelpers.logError(error as Error, { operation: 'cache.set', key });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      await client.del(key);
      loggerHelpers.logCache('del', key);
      return true;
    } catch (error) {
      loggerHelpers.logError(error as Error, { operation: 'cache.del', key });
      return false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      const client = this.getClient();
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        const deleted = await client.del(keys);
        logger.debug({ pattern, deleted }, 'Cache pattern deleted');
        return deleted;
      }

      return 0;
    } catch (error) {
      loggerHelpers.logError(error as Error, { operation: 'cache.delPattern', pattern });
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      loggerHelpers.logError(error as Error, { operation: 'cache.exists', key });
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const client = this.getClient();
      return await client.ttl(key);
    } catch (error) {
      loggerHelpers.logError(error as Error, { operation: 'cache.ttl', key });
      return -1;
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();