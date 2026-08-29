import { PrismaClient } from '@prisma/client';

/**
 * Singleton instance of PrismaClient to prevent exceeding connection pool limits
 * during development hot-reloads.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
