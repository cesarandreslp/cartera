/**
 * POST /api/tenant/certificate — Upload DIAN .p12 certificate for current tenant
 * GET  /api/tenant/certificate — Check if certificate is loaded
 */
import { controlDb }        from '@/lib/controlDb'
import { uploadCertificate } from '@/lib/storage'
import { encrypt }           from '@/lib/crypto'
import { fail, isResponse, ok, requireSession } from '@/lib/api'
import { headers }           from 'next/headers'
import type { NextRequest }  from 'next/server'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  if (!['ADMIN', 'SUPERADMIN'].includes(session.role)) {
    return fail('Solo administradores pueden cargar certificados', 403)
  }

  const tenantId = (await headers()).get('x-tenant-id')
  if (!tenantId) return fail('Tenant no resuelto', 400)

  const formData = await req.formData()
  const file     = formData.get('certificate') as File | null
  const password = formData.get('password')    as string | null

  if (!file) return fail('Se requiere el archivo .p12')
  if (!file.name.endsWith('.p12') && !file.name.endsWith('.pfx')) {
    return fail('Solo se aceptan archivos .p12 o .pfx')
  }

  // Upload to Vercel Blob (scoped to tenant)
  const blob = await uploadCertificate(tenantId, file)

  // Store URL and encrypted password in control plane
  await controlDb.tenant.update({
    where: { id: tenantId },
    data: {
      certBlobUrl:  blob.url,
      certPassword: password ? encrypt(password) : null,
    },
  })

  return ok({ certUrl: blob.url, uploaded: true })
}

export async function GET() {
  const session = await requireSession()
  if (isResponse(session)) return session

  const tenantId = (await headers()).get('x-tenant-id')
  if (!tenantId) return fail('Tenant no resuelto', 400)

  const tenant = await controlDb.tenant.findUnique({
    where:  { id: tenantId },
    select: { certBlobUrl: true, dianEnv: true, dianPrefix: true },
  })

  return ok({
    hasCertificate: !!tenant?.certBlobUrl,
    dianEnv:        tenant?.dianEnv ?? 'TEST',
    dianPrefix:     tenant?.dianPrefix ?? null,
  })
}
