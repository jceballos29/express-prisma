// ============================================
// CONFIG PRINCIPAL
// ============================================
export { config } from './environment';

// ============================================
// DATABASE
// ============================================
export {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  getDatabaseInfo,
  handlePrismaError,
} from './database';

// ============================================
// REDIS
// ============================================
export {
  createRedisClient,
  connectRedis,
  disconnectRedis,
  getRedisClient,
  checkRedisHealth,
  getRedisInfo,
  flushRedis,
} from './redis';
