import { auth } from '@/lib/auth'
import { logAction, type Module, hasPermission } from '@/lib/utils'

export type ApiSession = {
  userId: string
  role: string
  permissions: Record<string, any>
}

export async function getSession(): Promise<ApiSession | null> {
  const session = await auth()
  if (!session?.user) return null
  return {
    userId: (session.user as any).id,
    role: (session.user as any).role,
    permissions: (session.user as any).permissions ?? {},
  }
}

export function json(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init)
}

export function ok(data: unknown): Response {
  return Response.json({ ok: true, data })
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return Response.json({ ok: false, error: message, ...extra }, { status })
}

export async function requireSession(): Promise<ApiSession | Response> {
  const s = await getSession()
  if (!s) return fail('No autenticado', 401)
  return s
}

export function requirePerm(
  session: ApiSession,
  module: Module,
  action: 'view' | 'create' | 'edit' | 'delete' = 'view',
): Response | null {
  if (session.role === 'ADMIN') return null
  if (!hasPermission(session.permissions, module, action)) {
    return fail('Sin permisos', 403)
  }
  return null
}

export async function audit(
  session: ApiSession,
  module: Module,
  action: string,
  detail?: string,
  entityId?: string,
) {
  await logAction(session.userId, module, action, detail, entityId)
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
