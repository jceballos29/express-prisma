import http from 'http';

import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase, prisma } from './config/database';
import { connectRedis, disconnectRedis, getRedisClient } from './config/redis';
import { logger } from './shared/utils';

// Función para iniciar el servidor
async function startServer() {
  try {
    logger.info('🚀 Starting server...');

    // 1. Conectar a la base de datos
    logger.info('📊 Connecting to database...');
    await connectDatabase();

    // 2. Conectar a Redis
    logger.info('💾 Connecting to Redis...');
    await connectRedis();

    logger.info('🔄 Initializing application...');
    const app = createApp();
    const server: http.Server = http.createServer(app);

    // 3. Iniciar servidor HTTP
    server.listen(config.server.port, () => {
      logger.info('✅ Server started successfully!');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(`Environment:  ${config.env}`);
      logger.info(`URL:          http://${config.server.host}:${config.server.port}`);
      logger.info(`Health:       http://${config.server.host}:${config.server.port}/health`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    // Manejo de errores del servidor
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${config.server.port} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await cleanup();
    process.exit(1);
  }
}

// Función de limpieza
async function cleanup() {
  logger.info('⚠️  Shutting down gracefully...');

  try {
    await Promise.all([disconnectRedis(), disconnectDatabase()]);
    logger.info('✅ All connections closed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Manejo de señales de cierre
process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  cleanup()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

// Iniciar servidor
void startServer().catch((error) => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});

// Exportar para testing
export { prisma, getRedisClient };
