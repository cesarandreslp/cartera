/**
 * GET    /api/admin/tenants/[id]   — get tenant detail
 * PATCH  /api/admin/tenants/[id]   — update tenant
 * DELETE /api/admin/tenants/[id]   — deactivate tenant
 */
import { controlDb }   from '@/lib/controlDb'
import { fail, isResponse, ok, readJson, requireSession } from '@/lib/api'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

function onlySuperadmin(session: any) {
  if (session?.role !== 'SUPERADMIN') return fail('Solo superadmin', 403)
  return null
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = onlySuperadmin(session)
  if (denied) return denied

  const { id } = await ctx.params
  const tenant = await controlDb.tenant.findUnique({
    where: { id },
    select: {
      id: true, slug: true, name: true, nit: true,
      address: true, city: true, phone: true, email: true,
      customDomain: true, plan: true, active: true,
      certBlobUrl: true, dianPrefix: true, dianEnv: true,
      createdAt: true, updatedAt: true,
    },
  })
  if (!tenant) return fail('Tenant no encontrado', 404)
  return ok(tenant)
}

type PatchBody = Partial<{
  name: string; nit: string; address: string; city: string
  phone: string; email: string; customDomain: string | null
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  active: boolean; dianPrefix: string; dianEnv: string
}>

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = onlySuperadmin(session)
  if (denied) return denied

  const { id } = await ctx.params
  const body = await readJson<PatchBody>(req)
  if (isResponse(body)) return body

  const exists = await controlDb.tenant.findUnique({ where: { id } })
  if (!exists) return fail('Tenant no encontrado', 404)

  if (body.customDomain) {
    const conflict = await controlDb.tenant.findFirst({
      where: { customDomain: body.customDomain, id: { not: id } },
    })
    if (conflict) return fail('El dominio ya está en uso', 409)
  }

  const updated = await controlDb.tenant.update({
    where: { id },
    data: {
      name:         body.name,
      nit:          body.nit,
      address:      body.address,
      city:         body.city,
      phone:        body.phone,
      email:        body.email,
      customDomain: body.customDomain,
      plan:         body.plan,
      active:       body.active,
      dianPrefix:   body.dianPrefix,
      dianEnv:      body.dianEnv,
    },
    select: {
      id: true, slug: true, name: true, active: true,
      plan: true, dianEnv: true, updatedAt: true,
    },
  })
  return ok(updated)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = onlySuperadmin(session)
  if (denied) return denied

  const { id } = await ctx.params
  const exists = await controlDb.tenant.findUnique({ where: { id } })
  if (!exists) return fail('Tenant no encontrado', 404)

  // Soft delete — mark inactive
  await controlDb.tenant.update({ where: { id }, data: { active: false } })
  return ok({ id, deactivated: true })
}
