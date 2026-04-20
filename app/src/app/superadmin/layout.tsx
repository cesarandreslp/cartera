import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Superadmin — GST SaaS' }

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any)?.role !== 'SUPERADMIN') redirect('/dashboard')

  return (
    <div className="sa-shell">
      <header className="sa-header">
        <div className="sa-header-inner">
          <div className="sa-logo">
            <div className="sa-logo-icon">G</div>
            <div>
              <strong>GST SaaS</strong>
              <span>Panel de Control Global</span>
            </div>
          </div>
          <nav className="sa-nav">
            <a href="/superadmin/tenants" className="sa-nav-link">🏢 Tenants</a>
            <a href="/superadmin/registros" className="sa-nav-link">📋 Registros</a>
          </nav>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="sa-signout">Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="sa-main">{children}</main>
    </div>
  )
}
