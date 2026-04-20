/**
 * Middleware — Edge-compatible tenant resolution by hostname.
 *
 * IMPORTANT: Next.js middleware runs in the Edge Runtime (no Node.js APIs).
 * This middleware ONLY does lightweight work:
 *  1. Extract hostname & determine tenant slug/domain
 *  2. Inject x-tenant-slug + x-tenant-host into headers for Server Components
 *  3. Protect routes requiring authentication (via JWT cookie check)
 *
 * The actual DB lookup (slug → tenantId + databaseUrl) is done in:
 *  - getDb() in src/lib/api.ts  (runs in Node.js server context)
 *  - getTenantDb() in src/lib/tenantDb.ts
 *
 * The middleware passes the slug via header; the API/Server resolves the DB.
 */
import type { NextRequest } from 'next/server'
import { NextResponse }    from 'next/server'

const MAIN_DOMAIN     = process.env.MAIN_DOMAIN ?? 'gst.com.co'
const SUPERADMIN_HOST = `superadmin.${MAIN_DOMAIN}`

// Paths that bypass all auth and tenant checks
const STATIC_PREFIXES  = ['/_next', '/favicon.ico']
const PUBLIC_PREFIXES  = ['/api/auth', '/api/public', '/registro']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname     = request.headers.get('host')?.split(':')[0] ?? ''

  // ── Skip static assets ────────────────────────────────────────────────────
  if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Skip public paths (no auth, no tenant) ────────────────────────────────
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Superadmin panel ──────────────────────────────────────────────────────
  if (hostname === SUPERADMIN_HOST || pathname.startsWith('/superadmin')) {
    // Auth is checked in the superadmin layout (Server Component)
    return NextResponse.next()
  }

  // ── Determine tenant slug from hostname ───────────────────────────────────
  let tenantSlug: string | null = null

  // Dev / staging environments — use the default demo tenant
  const isDevHost =
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('192.168.') ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.now.sh')

  if (isDevHost) {
    tenantSlug = process.env.DEV_TENANT_SLUG ?? 'gst-demo'
  } else if (hostname === MAIN_DOMAIN || hostname === `www.${MAIN_DOMAIN}`) {
    // Root domain — no tenant
    tenantSlug = null
  } else if (hostname.endsWith(`.${MAIN_DOMAIN}`)) {
    // Subdomain: empresa.gst.com.co → slug = "empresa"
    tenantSlug = hostname.replace(`.${MAIN_DOMAIN}`, '')
  } else {
    // Custom domain — resolve from control DB in the server context
    tenantSlug = `__custom__${hostname}`
  }

  // Root domain with no tenant: redirect to /registro
  if (!tenantSlug) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/registro', request.url))
    }
    return NextResponse.next()
  }

  // ── Auth check via cookie (Edge-compatible) ───────────────────────────────
  const sessionCookie =
    request.cookies.get('authjs.session-token') ??
    request.cookies.get('__Secure-authjs.session-token') ??
    request.cookies.get('next-auth.session-token') ??
    request.cookies.get('__Secure-next-auth.session-token')

  const isLoginPage = pathname.startsWith('/login')

  if (!sessionCookie && !isLoginPage) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (sessionCookie && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ── Inject tenant context into headers ────────────────────────────────────
  const res = NextResponse.next()
  res.headers.set('x-tenant-slug', tenantSlug)
  res.headers.set('x-tenant-host', hostname)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
