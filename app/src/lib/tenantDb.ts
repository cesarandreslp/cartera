/**
 * Dynamic Prisma client resolver for tenant databases.
 * Uses @prisma/adapter-pg for Prisma 7 compatibility (engine type "client").
 *
 * Each tenant has its own Neon database. This module:
 * 1. Looks up the tenant in the Control Plane DB to get their encrypted DB URL
 * 2. Decrypts the URL
 * 3. Creates a PrismaClient with PrismaPg adapter connected to that tenant's DB
 * 4. Caches the client per tenantId for the lifetime of the serverless function
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg }     from '@prisma/adapter-pg'
import { controlDb }    from '@/lib/controlDb'
import { decrypt }      from '@/lib/crypto'

// In-process cache: tenantId → PrismaClient
const clientCache = new Map<string, PrismaClient>()

export async function getTenantDb(tenantId: string): Promise<PrismaClient> {
  if (clientCache.has(tenantId)) {
    return clientCache.get(tenantId)!
  }

  const tenant = await controlDb.tenant.findUnique({
    where:  { id: tenantId },
    select: { id: true, databaseUrl: true, active: true },
  })

  if (!tenant) throw new Error(`Tenant ${tenantId} not found in control plane`)
  if (!tenant.active) throw new Error(`Tenant ${tenantId} is inactive`)

  const dbUrl  = decrypt(tenant.databaseUrl)
  const adapter = new PrismaPg({ connectionString: dbUrl })
  const client  = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  clientCache.set(tenantId, client)
  return client
}

/**
 * Create a one-off tenant client from a raw (unencrypted) URL.
 * Used during provisioning before the tenant is in the cache.
 */
export function createTenantClientFromUrl(url: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter, log: ['error'] })
}

/**
 * Invalidate the cached client for a tenant (call after DB URL rotation).
 */
export function invalidateTenantDb(tenantId: string): void {
  const client = clientCache.get(tenantId)
  if (client) {
    client.$disconnect().catch(() => {})
    clientCache.delete(tenantId)
  }
}

/**
 * Get the tenantId from request headers (injected by middleware).
 */
export function getTenantIdFromHeaders(headers: Headers): string {
  const tenantId = headers.get('x-tenant-id')
  if (!tenantId) throw new Error('Missing x-tenant-id header — invalid tenant request')
  return tenantId
}
