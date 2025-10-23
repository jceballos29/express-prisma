import http from 'http';
import { config } from './config';
import { connectDatabase, disconnectDatabase, prisma } from './config/database';
import { connectRedis, disconnectRedis, getRedisClient, createCacheHelper } from './config/redis';
import { createApp } from './app';

// Crear aplicación
const app = createApp();
const server: http.Server = http.createServer(app);

// Función para iniciar el servidor
async function startServer() {
  try {
    console.log('🚀 Starting server...\n');

    // 1. Conectar a la base de datos
    console.log('📊 Connecting to database...');
    await connectDatabase();

    // 2. Conectar a Redis
    console.log('\n💾 Connecting to Redis...');
    await connectRedis();

    // 3. Iniciar servidor HTTP
    server.listen(config.server.port, () => {
      console.log('\n✅ Server started successfully!\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Environment:  ${config.env}`);
      console.log(`URL:          http://${config.server.host}:${config.server.port}`);
      console.log(`Health:       http://${config.server.host}:${config.server.port}/health`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
  console.log('\n⚠️  Shutting down gracefully...\n');

  try {
    await Promise.all([
      disconnectRedis(),
      disconnectDatabase(),
    ]);
    console.log('✅ All connections closed');
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
  cleanup().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup().then(() => process.exit(1));
});

// Iniciar servidor
startServer();

// Exportar para testing
export { app, prisma, getRedisClient, createCacheHelper };