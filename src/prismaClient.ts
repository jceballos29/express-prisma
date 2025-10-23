import { config } from "./config";
import { PrismaClient } from "./generated/prisma/client";

const prisma = new PrismaClient(
  {
    log: config.env === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    errorFormat: config.env === 'development' ? 'pretty' : 'minimal',
  }
);

export default prisma;
