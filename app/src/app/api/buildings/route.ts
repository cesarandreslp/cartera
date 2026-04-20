import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession, getDb } from '@/lib/api'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'edificios', 'view')
  if (denied) return denied

  const db = await getDb(await headers())
  const q      = req.nextUrl.searchParams.get('q')?.trim()
  const active = req.nextUrl.searchParams.get('active')

  const buildings = await db.building.findMany({
    where: {
      ...(active === 'true' ? { active: true } : active === 'false' ? { active: false } : {}),
      ...(q ? { OR: [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { nit:  { contains: q, mode: 'insensitive' } },
      ]} : {}),
    },
    orderBy: { name: 'asc' },
  })

  return ok(buildings)
}

type CreateBuildingBody = {
  code: string; name: string; nit: string
  address?: string; city?: string; phone?: string; email?: string; contact?: string
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'edificios', 'create')
  if (denied) return denied

  const db   = await getDb(await headers())
  const body = await readJson<CreateBuildingBody>(req)
  if (isResponse(body)) return body

  if (!body.code || !body.name || !body.nit) return fail('code, name y nit son obligatorios')

  const exists = await db.building.findUnique({ where: { code: body.code } })
  if (exists) return fail('Código de edificio ya existe', 409)

  const building = await db.building.create({ data: body })
  await audit(session, db, 'edificios', 'create', `Edificio ${building.code}`, building.id)
  return ok(building)
}
