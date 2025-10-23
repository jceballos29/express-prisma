
import { PrismaClient } from '../generated/prisma/client';
import { config } from './index';
import logger, { loggerHelpers } from '../utils/logger';

// Crear instancia de Prisma
export const prisma = new PrismaClient({
  log: config.env === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
  errorFormat: config.env === 'development' ? 'pretty' : 'minimal',
});
// Middleware de logging de consultas
prisma.$on('query' as never, (e: any) => {
  loggerHelpers.logDatabase(e.query, e.duration);
});

// Función para conectar a la base de datos
export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    
    // Verificar conexión
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database health check passed');
  } catch (error) {
    loggerHelpers.logError(error as Error, { service: 'database' });
    throw error;
  }
}

// Función para desconectar
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error);
  }
}

// Middleware para manejo de errores de Prisma
export function handlePrismaError(error: any) {
  if (error.code === 'P2002') {
    return {
      status: 409,
      message: 'Registro duplicado',
      field: error.meta?.target,
    };
  }
  
  if (error.code === 'P2025') {
    return {
      status: 404,
      message: 'Registro no encontrado',
    };
  }
  
  if (error.code === 'P2003') {
    return {
      status: 400,
      message: 'Violación de llave foránea',
    };
  }
  
  return {
    status: 500,
    message: config.env === 'development' ? error.message : 'Error de base de datos',
  };
}

// Health check específico de la base de datos
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}