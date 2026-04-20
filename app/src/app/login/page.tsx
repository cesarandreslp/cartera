import { headers } from 'next/headers'
import { controlDb } from '@/lib/controlDb'
import LoginClient from './LoginClient'

// Server Component: resolve tenant from x-tenant-slug injected by middleware
export default async function LoginPage() {
  const hdrs = await headers()
  const slug  = hdrs.get('x-tenant-slug') ?? 'gst-demo'

  let tenantId = ''
  let tenantName = 'GST S.A.S'

  try {
    if (slug.startsWith('__custom__')) {
      const hostname = slug.replace('__custom__', '')
      const t = await controlDb.tenant.findUnique({
        where:  { customDomain: hostname },
        select: { id: true, name: true },
      })
      tenantId   = t?.id   ?? ''
      tenantName = t?.name ?? tenantName
    } else {
      const t = await controlDb.tenant.findUnique({
        where:  { slug },
        select: { id: true, name: true },
      })
      tenantId   = t?.id   ?? ''
      tenantName = t?.name ?? tenantName
    }
  } catch {
    // Control plane unreachable — render form without tenantId; authorize will fail gracefully
  }

  return <LoginClient tenantId={tenantId} tenantName={tenantName} />
}
