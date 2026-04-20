/**
 * POST /api/admin/tenants   — create tenant (Superadmin only)
 * GET  /api/admin/tenants   — list all tenants (Superadmin only)
 */
import { controlDb }                            from '@/lib/controlDb'
import { createTenantDatabase }                 from '@/lib/neonApi'
import { encrypt }                              from '@/lib/crypto'
import { fail, isResponse, ok, readJson, requireSession } from '@/lib/api'
import { createTenantClientFromUrl }            from '@/lib/tenantDb'
import bcrypt                                   from 'bcryptjs'
import type { NextRequest }                     from 'next/server'
import { execSync }                             from 'child_process'

type CreateTenantBody = {
  slug:         string   // URL-safe, e.g. "empresa-abc"
  name:         string
  nit:          string
  city?:        string
  phone?:       string
  email?:       string
  customDomain?: string
  plan?:        'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  // First admin user
  adminName:    string
  adminEmail:   string
  adminPassword: string
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  if ((session as any).role !== 'SUPERADMIN') return fail('Solo superadmin', 403)

  const body = await readJson<CreateTenantBody>(req)
  if (isResponse(body)) return body

  const { slug, name, nit, adminName, adminEmail, adminPassword } = body

  if (!slug || !name || !nit || !adminName || !adminEmail || !adminPassword) {
    return fail('slug, name, nit, adminName, adminEmail y adminPassword son obligatorios')
  }

  // Validate slug
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return fail('slug solo puede contener letras minúsculas, números y guiones')
  }

  const slugExists = await controlDb.tenant.findUnique({ where: { slug } })
  if (slugExists) return fail('El slug ya está en uso', 409)

  if (body.customDomain) {
    const domainExists = await controlDb.tenant.findUnique({ where: { customDomain: body.customDomain } })
    if (domainExists) return fail('El dominio ya está en uso', 409)
  }

  try {
    // 1. Provision new Neon database
    const neonProject = await createTenantDatabase(slug)
    const encryptedUrl = encrypt(neonProject.connectionUri)

    // 2. Create tenant in control plane
    const tenant = await controlDb.tenant.create({
      data: {
        slug,
        name,
        nit,
        city:         body.city,
        phone:        body.phone,
        email:        body.email,
        customDomain: body.customDomain ?? null,
        databaseUrl:  encryptedUrl,
        plan:         body.plan ?? 'BASIC',
        active:       true,
      },
    })

    // 3. Apply schema to new tenant DB
    const directUrl = encrypt(neonProject.directUri)
    try {
      execSync(`npx prisma db push --schema=prisma/schema.prisma`, {
        env: { ...process.env, DATABASE_URL: neonProject.directUri },
        cwd: process.cwd(),
        stdio: 'pipe',
      })
    } catch (schemaErr) {
      // Log but don't fail — can be retried
      console.error('[tenant-provision] schema push failed:', schemaErr)
    }

    // 4. Create first admin user in tenant DB
    const tenantDb = createTenantClientFromUrl(neonProject.connectionUri)
    try {
      const passwordHash = await bcrypt.hash(adminPassword, 10)
      await tenantDb.user.create({
        data: {
          name:         adminName,
          email:        adminEmail,
          passwordHash,
          role:         'ADMIN',
          permissions:  {},
          active:       true,
        },
      })
    } finally {
      await tenantDb.$disconnect()
    }

    return ok({
      tenant: {
        id:   tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        url:  body.customDomain
              ? `https://${body.customDomain}`
              : `https://${slug}.${process.env.MAIN_DOMAIN}`,
      },
      admin:  { email: adminEmail },
      dbId:   neonProject.id,
    })
  } catch (err) {
    console.error('[tenant-provision] error:', err)
    return fail('Error al provisionar el tenant. Revisa los logs.', 500)
  }
}

export async function GET() {
  const session = await requireSession()
  if (isResponse(session)) return session
  if ((session as any).role !== 'SUPERADMIN') return fail('Solo superadmin', 403)

  const tenants = await controlDb.tenant.findMany({
    select: {
      id: true, slug: true, name: true, nit: true, city: true,
      customDomain: true, plan: true, active: true,
      certBlobUrl: true, dianEnv: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return ok(tenants)
}
