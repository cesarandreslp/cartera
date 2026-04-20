/**
 * Middleware — Tenant resolution by hostname.
 *
 * Flow:
 * 1. Extract hostname from request
 * 2. Match against slug.MAIN_DOMAIN OR custom domain in control plane
 * 3. Inject x-tenant-id / x-tenant-slug / x-tenant-name into headers
 * 4. Protect routes requiring authentication
 */
import { auth }         from '@/lib/auth'
import { controlDb }    from '@/lib/controlDb'
import type { NextRequest } from 'next/server'
import { NextResponse }    from 'next/server'

const MAIN_DOMAIN  = process.env.MAIN_DOMAIN  ?? 'gst.com.co'
const SUPERADMIN_HOST = `superadmin.${MAIN_DOMAIN}`

// Routes that don't need tenant resolution
const PUBLIC_PATHS  = ['/registro', '/api/public']
const STATIC_PATHS  = ['/_next', '/favicon.ico', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host')?.split(':')[0] ?? ''

  // ── Skip static assets & auth callbacks ───────────────────────────────────
  if (STATIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Superadmin panel (no tenant) ──────────────────────────────────────────
  if (hostname === SUPERADMIN_HOST || pathname.startsWith('/superadmin')) {
    const session = await auth()
    if (!session) return NextResponse.redirect(new URL('/login', request.url))
    if ((session.user as any)?.role !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // ── Public registration (no tenant) ───────────────────────────────────────
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ── Tenant resolution ─────────────────────────────────────────────────────
  let tenant: { id: string; slug: string; name: string; active: boolean } | null = null

  try {
    if (hostname.endsWith(`.${MAIN_DOMAIN}`)) {
      const slug = hostname.replace(`.${MAIN_DOMAIN}`, '')
      tenant = await controlDb.tenant.findUnique({
        where: { slug },
        select: { id: true, slug: true, name: true, active: true },
      })
    } else if (hostname !== MAIN_DOMAIN && hostname !== `www.${MAIN_DOMAIN}`) {
      // Custom domain
      tenant = await controlDb.tenant.findUnique({
        where: { customDomain: hostname },
        select: { id: true, slug: true, name: true, active: true },
      })
    }
  } catch {
    // control plane unreachable — fail open to avoid full outage
  }

  if (!tenant || !tenant.active) {
    // Root domain or unknown → redirect to main marketing/login page
    if (hostname === MAIN_DOMAIN || hostname === `www.${MAIN_DOMAIN}`) {
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/registro', request.url))
      }
      return NextResponse.next()
    }
    return NextResponse.rewrite(new URL('/tenant-not-found', request.url))
  }

  // ── Auth check ────────────────────────────────────────────────────────────
  const session = await auth()

  if (pathname.startsWith('/login')) {
    if (session) return NextResponse.redirect(new URL('/dashboard', request.url))
    const res = NextResponse.next()
    res.headers.set('x-tenant-id',   tenant.id)
    res.headers.set('x-tenant-slug', tenant.slug)
    res.headers.set('x-tenant-name', tenant.name)
    return res
  }

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ── Inject tenant context ─────────────────────────────────────────────────
  const res = NextResponse.next()
  res.headers.set('x-tenant-id',   tenant.id)
  res.headers.set('x-tenant-slug', tenant.slug)
  res.headers.set('x-tenant-name', tenant.name)
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
