import { auth }                               from '@/lib/auth'
import { getTenantDb, getTenantIdFromHeaders } from '@/lib/tenantDb'
import type { PrismaClient }                  from '@prisma/client'
import { hasPermission, type Module }         from '@/lib/utils'
import { headers }                            from 'next/headers'

export type ApiSession = {
  userId:    string
  role:      string
  permissions: Record<string, any>
  tenantId:  string
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function getSession(): Promise<ApiSession | null> {
  const session = await auth()
  if (!session?.user) return null
  const tenantId = (session.user as any).tenantId
  if (!tenantId && (session.user as any).role !== 'SUPERADMIN') return null
  return {
    userId:      (session.user as any).id,
    role:        (session.user as any).role ?? 'OPERATOR',
    permissions: (session.user as any).permissions ?? {},
    tenantId:    tenantId ?? '',
  }
}

export async function requireSession(): Promise<ApiSession | Response> {
  const s = await getSession()
  if (!s) return fail('No autenticado', 401)
  return s
}

// ─── Tenant DB helper (use inside API routes) ─────────────────────────────────

/**
 * Resolves the tenant DB from the current request headers.
 * Usage: const db = await getDb(await headers())
 */
export async function getDb(hdrs: Awaited<ReturnType<typeof headers>>): Promise<PrismaClient> {
  const tenantId = hdrs.get('x-tenant-id')
  if (!tenantId) throw new Error('No x-tenant-id header — request missing tenant context')
  return getTenantDb(tenantId)
}

// ─── Permission helpers ───────────────────────────────────────────────────────

export function requirePerm(
  session: ApiSession,
  module:  Module,
  action:  'view' | 'create' | 'edit' | 'delete' = 'view',
): Response | null {
  if (session.role === 'ADMIN' || session.role === 'SUPERADMIN') return null
  if (!hasPermission(session.permissions, module, action)) {
    return fail('Sin permisos', 403)
  }
  return null
}

export function requireAdmin(session: ApiSession): Response | null {
  if (session.role !== 'ADMIN' && session.role !== 'SUPERADMIN') {
    return fail('Solo administradores', 403)
  }
  return null
}

// ─── Audit helper ─────────────────────────────────────────────────────────────
// Supports two call signatures for backward compatibility:
//   audit(session, db,     module, action, detail?, entityId?)
//   audit(session, module, action, detail?, entityId?)   ← db resolved from headers

export async function audit(
  session:         ApiSession,
  dbOrModule:      PrismaClient | Module,
  moduleOrAction:  string,
  actionOrDetail?: string,
  detailOrEntityId?: string,
  entityIdOnly?:   string,
) {
  let db: PrismaClient | null = null
  let module: Module
  let action: string
  let detail: string | undefined
  let entityId: string | undefined

  // Detect which overload is being used
  if (dbOrModule && typeof dbOrModule === 'object' && '$connect' in (dbOrModule as any)) {
    // Full signature: (session, db, module, action, detail?, entityId?)
    db          = dbOrModule as PrismaClient
    module      = moduleOrAction as Module
    action      = actionOrDetail ?? ''
    detail      = detailOrEntityId
    entityId    = entityIdOnly
  } else {
    // Short signature: (session, module, action, detail?, entityId?)
    module      = dbOrModule as Module
    action      = moduleOrAction
    detail      = actionOrDetail
    entityId    = detailOrEntityId
  }

  try {
    if (!db) {
      // Resolve tenant DB from current request headers
      const hdrs     = await headers()
      const tenantId = hdrs.get('x-tenant-id')
      if (!tenantId) return  // superadmin or no-tenant context — skip audit
      db = await getTenantDb(tenantId)
    }
    await (db as any).auditLog.create({
      data: { userId: session.userId, module, action, detail, entityId },
    })
  } catch {
    // Never fail the request if audit write fails
  }
}

// ─── Response helpers ─────────────────────────────────────────────────────────

export function ok(data: unknown): Response {
  return Response.json({ ok: true, data })
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return Response.json({ ok: false, error: message, ...extra }, { status })
}

export async function readJson<T>(req: Request): Promise<T | Response> {
  try {
    return (await req.json()) as T
  } catch {
    return fail('JSON inválido')
  }
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response
}
