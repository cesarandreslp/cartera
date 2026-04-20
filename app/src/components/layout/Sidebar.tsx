'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useAppStore } from '@/store/app'

const NAV = [
  {
    section: 'GESTIÓN',
    items: [
      { id: 'dashboard',   label: 'Dashboard',      icon: '📊', href: '/dashboard' },
      { id: 'edificios',   label: 'Edificios',       icon: '🏢', href: '/edificios' },
      { id: 'facturas',    label: 'Facturas',         icon: '📄', href: '/facturas',  badge: null },
      { id: 'facturacion', label: 'Facturación E.', icon: '⚡', href: '/facturacion', badgeColor: 'green' },
      { id: 'pagos',       label: 'Pagos',            icon: '💳', href: '/pagos' },
      { id: 'cartera',     label: 'Cartera',          icon: '📋', href: '/cartera' },
    ],
  },
  {
    section: 'OPERACIONES',
    items: [
      { id: 'cobros',      label: 'Cobros Auto.',    icon: '🔄', href: '/cobros' },
      { id: 'reportes',    label: 'Reportes',         icon: '📈', href: '/reportes' },
      { id: 'gerencial',   label: 'Gerencial',        icon: '🎯', href: '/gerencial' },
      { id: 'documentos',  label: 'Documentos',       icon: '🗂️', href: '/documentos' },
    ],
  },
  {
    section: 'ADMINISTRACIÓN',
    items: [
      { id: 'cierre',      label: 'Cierre Fiscal',   icon: '🔒', href: '/cierre' },
      { id: 'auditoria',   label: 'Auditoría',        icon: '🔍', href: '/auditoria' },
      { id: 'usuarios',    label: 'Usuarios',          icon: '👥', href: '/usuarios' },
      { id: 'config',      label: 'Configuración',    icon: '⚙️', href: '/config' },
    ],
  },
  {
    section: 'SOPORTE',
    items: [
      { id: 'ayuda',       label: 'Ayuda',             icon: '❓', href: '/ayuda' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { fiscalYear } = useAppStore()
  const [profileOpen, setProfileOpen] = useState(false)

  const initials = session?.user?.name
    ? session.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sb-header">
        <div className="sb-logo">
          <div className="sb-logo-icon">G</div>
          <div className="sb-logo-txt">
            <strong>GST S.A.S</strong>
            <span>Año Fiscal {fiscalYear}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        {NAV.map(group => (
          <div key={group.section} className="sb-section">
            <span className="sb-section-label">{group.section}</span>
            {group.items.map(item => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`sb-item${active ? ' active' : ''}`}
                >
                  <span className="sb-icon">{item.icon}</span>
                  {item.label}
                  <span className="sb-dot" />
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="sb-footer">
        {/* Profile dropdown */}
        {profileOpen && (
          <div className="profile-dropdown open">
            <div className="pd-header">
              <div className="pd-avatar-big">{initials}</div>
              <div className="pd-name">{session?.user?.name}</div>
              <div className="pd-role">{(session?.user as any)?.role ?? 'Operador'}</div>
            </div>
            <div className="pd-info">
              <div className="pd-info-row">
                <span>📧</span>
                <strong>{session?.user?.email}</strong>
              </div>
            </div>
            <div className="pd-actions">
              <Link href="/config/perfil" className="pd-action" onClick={() => setProfileOpen(false)}>
                <div className="pd-action-icon">👤</div>
                Mi perfil
              </Link>
              <button
                className="pd-action danger"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <div className="pd-action-icon">🚪</div>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        <button
          className="sb-user-btn"
          onClick={() => setProfileOpen(v => !v)}
          id="btn-profile"
        >
          <div className="sb-avatar">{initials}</div>
          <div className="sb-user-info">
            <strong>{session?.user?.name ?? 'Usuario'}</strong>
            <span>{(session?.user as any)?.role ?? 'Operador'}</span>
          </div>
          <span className="sb-caret">{profileOpen ? '▲' : '▼'}</span>
        </button>
      </div>
    </aside>
  )
}
