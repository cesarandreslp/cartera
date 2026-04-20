/**
 * POST /api/public/register — Public tenant self-registration
 * Creates a registration record and queues provisioning.
 */
import { controlDb } from '@/lib/controlDb'
import { fail, ok, readJson } from '@/lib/api'
import type { NextRequest } from 'next/server'

type RegisterBody = {
  name:     string
  nit:      string
  email:    string
  phone?:   string
  city?:    string
  password: string
  adminName: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export async function POST(req: NextRequest) {
  const body = await readJson<RegisterBody>(req)
  if (body instanceof Response) return body

  const { name, nit, email, password, adminName } = body

  if (!name || !nit || !email || !password || !adminName) {
    return fail('name, nit, email, password y adminName son obligatorios')
  }
  if (password.length < 8) return fail('La contraseña debe tener al menos 8 caracteres')

  // Generate unique slug from company name
  let slug = slugify(name)
  const existing = await controlDb.tenantRegistration.findFirst({
    where: { slug },
  })
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  const registration = await controlDb.tenantRegistration.create({
    data: {
      name,
      nit,
      email,
      phone: body.phone,
      city:  body.city,
      slug,
      status: 'PENDING',
    },
  })

  // Auto-provision: call the admin tenants API internally
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    await fetch(`${baseUrl}/api/admin/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Internal provisioning key to bypass auth
        'x-internal-provision-key': process.env.ENCRYPTION_KEY ?? '',
      },
      body: JSON.stringify({
        slug,
        name,
        nit,
        city:          body.city,
        phone:         body.phone,
        email,
        adminName,
        adminEmail:    email,
        adminPassword: password,
        plan:          'BASIC',
      }),
    })
  } catch {
    // Provisioning is async — the registration record exists, retry later
  }

  return ok({
    registrationId: registration.id,
    slug,
    message: `Tu empresa está siendo configurada. URL: https://${slug}.${process.env.MAIN_DOMAIN}`,
  })
}

// GET — poll registration status
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return fail('id requerido')

  const reg = await controlDb.tenantRegistration.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, tenantId: true, createdAt: true },
  })
  if (!reg) return fail('Registro no encontrado', 404)

  return ok(reg)
}
