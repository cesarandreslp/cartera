import { audit, fail, isResponse, ok, readJson, requireAdmin, requirePerm, requireSession, getDb } from '@/lib/api'
import { headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@prisma/client'

export async function GET() {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'usuarios', 'view')
  if (denied) return denied

  const db    = await getDb(await headers())
  const users = await db.user.findMany({
    select: {
      id: true, name: true, email: true, role: true,
      permissions: true, active: true, createdAt: true, updatedAt: true,
    },
    orderBy: { name: 'asc' },
  })
  return ok(users)
}

type CreateBody = {
  name: string; email: string; password: string
  role?: UserRole; permissions?: Record<string, any>; active?: boolean
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  // Only ADMIN can create users within their tenant
  const denied = requireAdmin(session)
  if (denied) return denied

  const db   = await getDb(await headers())
  const body = await readJson<CreateBody>(req)
  if (isResponse(body)) return body

  if (!body.name || !body.email || !body.password) return fail('name, email y password son obligatorios')
  if (body.password.length < 6) return fail('La contraseña debe tener al menos 6 caracteres')

  const exists = await db.user.findUnique({ where: { email: body.email } })
  if (exists) return fail('Email ya registrado', 409)

  const passwordHash = await bcrypt.hash(body.password, 10)
  const user = await db.user.create({
    data: {
      name: body.name, email: body.email, passwordHash,
      role: body.role ?? 'OPERATOR',
      permissions: body.permissions ?? {},
      active: body.active ?? true,
    },
    select: { id: true, name: true, email: true, role: true, permissions: true, active: true },
  })

  await audit(session, db, 'usuarios', 'create', `Usuario ${user.email}`, user.id)
  return ok(user)
}
