import { PrismaClient } from '../generated/prisma/client';
import { logger, loggerHelpers } from '../shared/utils';
import { config } from './index';

// Crear instancia única de Prisma
export const prisma = new PrismaClient({
  log: config.env === 'development'
    ? [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ]
    : [{ emit: 'event', level: 'error' }],
  errorFormat: config.env === 'development' ? 'pretty' : 'minimal',
});

// Event listeners para logging detallado
if (config.env === 'development') {
  prisma.$on('query' as never, (e: any) => {
    loggerHelpers.logDatabase(e.query, e.duration);
  });
}

prisma.$on('info' as never, (e: any) => {
  logger.info({ prisma: e }, 'Prisma info');
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn({ prisma: e }, 'Prisma warning');
});

prisma.$on('error' as never, (e: any) => {
  logger.error({ prisma: e }, 'Prisma error');
});

/**
 * Conectar a la base de datos
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Verificar conexión con query simple
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database health check passed');
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'database',
      action: 'connect'
    });
    throw error;
  }
}

/**
 * Desconectar de la base de datos
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('✅ Database disconnected gracefully');
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'database',
      action: 'disconnect'
    });
  }
}

/**
 * Health check de la base de datos
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'database',
      check: 'health'
    });
    return false;
  }
}

/**
 * Obtener información de la conexión
 */
export async function getDatabaseInfo(): Promise<{
  connected: boolean;
  version?: string;
}> {
  try {
    const connected = await checkDatabaseHealth();

    if (connected) {
      const result = await prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
      return {
        connected: true,
        version: result[0]?.version,
      };
    }

    return { connected: false };
  } catch (error) {
    loggerHelpers.logError(error as Error, {
      service: 'database',
      action: 'getInfo'
    });
    return { connected: false };
  }
}

/**
 * Manejo de errores de Prisma
 * Convierte errores de Prisma a un formato más amigable
 */
export function handlePrismaError(error: any): {
  status: number;
  message: string;
  field?: string;
} {
  // P2002: Unique constraint violation
  if (error.code === 'P2002') {
    const target = error.meta?.target as string[] | undefined;
    const field = target?.[0] || 'field';
    return {
      status: 409,
      message: `A record with this ${field} already exists`,
      field,
    };
  }

  // P2025: Record not found
  if (error.code === 'P2025') {
    return {
      status: 404,
      message: 'Record not found',
    };
  }

  // P2003: Foreign key constraint violation
  if (error.code === 'P2003') {
    const field = error.meta?.field_name;
    return {
      status: 400,
      message: 'Invalid reference to related record',
      field,
    };
  }

  // P2014: Invalid ID
  if (error.code === 'P2014') {
    return {
      status: 400,
      message: 'Invalid ID provided',
    };
  }

  // P2016: Query interpretation error
  if (error.code === 'P2016') {
    return {
      status: 400,
      message: 'Invalid query parameters',
    };
  }

  // P2021: Table does not exist
  if (error.code === 'P2021') {
    return {
      status: 500,
      message: 'Database schema error',
    };
  }

  // Error genérico
  return {
    status: 500,
    message: config.env === 'development' ? error.message : 'Database error',
  };
}