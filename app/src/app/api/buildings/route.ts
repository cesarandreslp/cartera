import { prisma } from '@/lib/db'
import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession } from '@/lib/api'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'edificios', 'view')
  if (denied) return denied

  const q = req.nextUrl.searchParams.get('q')?.trim()
  const active = req.nextUrl.searchParams.get('active')

  const buildings = await prisma.building.findMany({
    where: {
      ...(active === 'true' ? { active: true } : active === 'false' ? { active: false } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
              { nit: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
  })

  return ok(buildings)
}

type CreateBuildingBody = {
  code: string
  name: string
  nit: string
  address?: string
  city?: string
  phone?: string
  email?: string
  contact?: string
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'edificios', 'create')
  if (denied) return denied

  const body = await readJson<CreateBuildingBody>(req)
  if (isResponse(body)) return body

  if (!body.code || !body.name || !body.nit) {
    return fail('code, name y nit son obligatorios')
  }

  const exists = await prisma.building.findUnique({ where: { code: body.code } })
  if (exists) return fail('Código de edificio ya existe', 409)

  const building = await prisma.building.create({
    data: {
      code: body.code,
      name: body.name,
      nit: body.nit,
      address: body.address,
      city: body.city,
      phone: body.phone,
      email: body.email,
      contact: body.contact,
    },
  })

  await audit(session, 'edificios', 'create', `Edificio ${building.code}`, building.id)

  return ok(building)
}
