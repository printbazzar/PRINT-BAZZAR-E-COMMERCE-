import { PrismaClient } from '@prisma/client';

/**
 * Print Bazzar Centralized Singleton Prisma Client
 * Ensures development-safe singleton behavior to prevent connection pool exhaustion during HMR/re-execution,
 * while maintaining clean single-instance lifecycle in production environments.
 */

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
