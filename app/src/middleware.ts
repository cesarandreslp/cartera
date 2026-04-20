/**
 * Middleware — Edge-compatible, tenant-context-only.
 *
 * RESPONSIBILITY: Inject x-tenant-slug into request headers.
 * AUTH REDIRECTS: NOT handled here — let (app)/layout.tsx and login/page.tsx handle auth.
 *
 * Why? Mixed redirect logic (middleware + layout) causes endless redirect loops.
 */
import type { NextRequest } from 'next/server'
import { NextResponse }    from 'next/server'

const MAIN_DOMAIN = process.env.MAIN_DOMAIN ?? 'gst.com.co'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname     = request.headers.get('host')?.split(':')[0] ?? ''

  // Pass through static assets without any processing
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // ── Determine tenant slug from hostname ───────────────────────────────────
  let tenantSlug: string

  // Dev / staging / preview environments
  const isDevHost =
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('192.168.') ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.now.sh')

  if (isDevHost) {
    tenantSlug = process.env.DEV_TENANT_SLUG ?? 'gst-demo'
  } else if (hostname.endsWith(`.${MAIN_DOMAIN}`)) {
    // Subdomain: empresa.gst.com.co → slug = "empresa"
    tenantSlug = hostname.replace(`.${MAIN_DOMAIN}`, '')
  } else if (hostname === MAIN_DOMAIN || hostname === `www.${MAIN_DOMAIN}`) {
    // Root marketing domain — use default or redirect to /registro
    tenantSlug = process.env.DEV_TENANT_SLUG ?? 'gst-demo'
  } else {
    // Custom domain — server will resolve from control DB
    tenantSlug = `__custom__${hostname}`
  }

  // ── Inject tenant context and pass through ────────────────────────────────
  // Auth redirects are handled in:
  //   - src/app/(app)/layout.tsx   → protects all app pages
  //   - src/app/superadmin/layout.tsx → protects superadmin pages
  const res = NextResponse.next()
  res.headers.set('x-tenant-slug', tenantSlug)
  res.headers.set('x-tenant-host', hostname)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
