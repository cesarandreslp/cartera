/**
 * Prisma client for the Control Plane database.
 * Uses @prisma/adapter-pg for Prisma 7 compatibility (engine type "client").
 * This DB only holds tenant registry and superadmin accounts.
 * Never use this for tenant-specific data.
 */
import 'dotenv/config'
import { PrismaClient } from '@/generated/control'
import { PrismaPg }     from '@prisma/adapter-pg'

function createControlClient() {
  const url = process.env.CONTROL_DATABASE_URL
  if (!url) throw new Error('CONTROL_DATABASE_URL is not set')
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

const globalForControl = globalThis as unknown as {
  controlPrisma: PrismaClient | undefined
}

export const controlDb: PrismaClient =
  globalForControl.controlPrisma ?? createControlClient()

if (process.env.NODE_ENV !== 'production') {
  globalForControl.controlPrisma = controlDb
}
