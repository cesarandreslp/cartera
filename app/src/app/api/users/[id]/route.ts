import { prisma } from '@/lib/db'
import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession } from '@/lib/api'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@prisma/client'

type Ctx = { params: Promise<{ id: string }> }

type UpdateBody = Partial<{
  name: string
  email: string
  password: string
  role: UserRole
  permissions: Record<string, any>
  active: boolean
}>

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'usuarios', 'edit')
  if (denied) return denied

  const { id } = await ctx.params
  const current = await prisma.user.findUnique({ where: { id } })
  if (!current) return fail('No encontrado', 404)

  const body = await readJson<UpdateBody>(req)
  if (isResponse(body)) return body

  if (body.email && body.email !== current.email) {
    const dup = await prisma.user.findUnique({ where: { email: body.email } })
    if (dup) return fail('Email ya registrado', 409)
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.email !== undefined) data.email = body.email
  if (body.role !== undefined) data.role = body.role
  if (body.permissions !== undefined) data.permissions = body.permissions
  if (body.active !== undefined) data.active = body.active
  if (body.password) {
    if (body.password.length < 6) return fail('La contraseña debe tener al menos 6 caracteres')
    data.passwordHash = await bcrypt.hash(body.password, 10)
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, permissions: true, active: true },
  })

  await audit(session, 'usuarios', 'update', `Usuario ${user.email}`, user.id)

  return ok(user)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'usuarios', 'delete')
  if (denied) return denied

  const { id } = await ctx.params
  if (id === session.userId) return fail('No puedes eliminar tu propio usuario', 422)

  const current = await prisma.user.findUnique({ where: { id } })
  if (!current) return fail('No encontrado', 404)

  const user = await prisma.user.update({ where: { id }, data: { active: false } })
  await audit(session, 'usuarios', 'deactivate', `Usuario ${user.email}`, id)

  return ok({ id, active: false })
}
