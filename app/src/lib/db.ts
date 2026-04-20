import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaPg }     from '@prisma/adapter-pg'

const url = process.env.DATABASE_URL ?? process.env.CONTROL_DATABASE_URL ?? ''

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
