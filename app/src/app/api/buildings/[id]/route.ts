import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession, getDb } from '@/lib/api'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'edificios', 'view')
  if (denied) return denied

  const db       = await getDb(await headers())
  const { id }   = await ctx.params
  const building = await db.building.findUnique({
    where: { id },
    include: { invoices: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  if (!building) return fail('No encontrado', 404)
  return ok(building)
}

type UpdateBody = Partial<{
  code: string; name: string; nit: string; address: string
  city: string; phone: string; email: string; contact: string; active: boolean
}>

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'edificios', 'edit')
  if (denied) return denied

  const db     = await getDb(await headers())
  const { id } = await ctx.params
  const body   = await readJson<UpdateBody>(req)
  if (isResponse(body)) return body

  const exists = await db.building.findUnique({ where: { id } })
  if (!exists) return fail('No encontrado', 404)

  const building = await db.building.update({ where: { id }, data: body })
  await audit(session, db, 'edificios', 'update', `Edificio ${building.code}`, building.id)
  return ok(building)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'edificios', 'delete')
  if (denied) return denied

  const db     = await getDb(await headers())
  const { id } = await ctx.params
  const exists = await db.building.findUnique({
    where: { id },
    include: { _count: { select: { invoices: true } } },
  })
  if (!exists) return fail('No encontrado', 404)

  if (exists._count.invoices > 0) {
    const building = await db.building.update({ where: { id }, data: { active: false } })
    await audit(session, db, 'edificios', 'deactivate', `Edificio ${building.code}`, id)
    return ok({ ...building, softDeleted: true })
  }

  await db.building.delete({ where: { id } })
  await audit(session, db, 'edificios', 'delete', `Edificio ${exists.code}`, id)
  return ok({ id, deleted: true })
}
