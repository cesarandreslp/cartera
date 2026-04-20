'use client'

import { useState } from 'react'

export default function RegistroPage() {
  const [form, setForm] = useState({
    name: '', nit: '', adminName: '', email: '', phone: '', city: '', password: '', confirm: '',
  })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState<{ slug: string; url: string } | null>(null)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8)       { setError('La contraseña debe tener al menos 8 caracteres'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:      form.name,
          nit:       form.nit,
          adminName: form.adminName,
          email:     form.email,
          phone:     form.phone,
          city:      form.city,
          password:  form.password,
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Error al registrar'); return }
      const domain = process.env.NEXT_PUBLIC_MAIN_DOMAIN ?? 'gst.com.co'
      setSuccess({ slug: data.data.slug, url: `https://${data.data.slug}.${domain}` })
    } catch {
      setError('Error de red. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="reg-screen">
        <div className="reg-success-card">
          <div className="reg-success-icon">🎉</div>
          <h2>¡Empresa registrada!</h2>
          <p>Tu plataforma está siendo configurada. En unos momentos podrás acceder en:</p>
          <a href={success.url} className="reg-url-link" target="_blank" rel="noreferrer">
            {success.url}
          </a>
          <p className="reg-success-hint">
            Guarda esta URL. Recibirás un correo de confirmación cuando todo esté listo.
          </p>
          <a href={success.url} className="reg-btn-primary" style={{ marginTop: 8 }}>
            Ir a mi plataforma →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="reg-screen">
      <div className="reg-left">
        <div className="reg-brand">
          <div className="reg-brand-icon">G</div>
          <h1>GST Cartera & Facturación</h1>
          <p>Sistema profesional de gestión para administradoras de propiedades</p>
        </div>
        <div className="reg-features">
          {[
            ['🏢', 'Multi-empresa', 'Cada cliente con su propia base de datos'],
            ['🔒', 'Aislamiento total', 'Datos 100% separados entre empresas'],
            ['⚡', 'Facturación DIAN', 'Emisión electrónica homologada'],
            ['📊', 'Reportes gerenciales', 'Cartera, recaudos y mora en tiempo real'],
          ].map(([icon, title, desc]) => (
            <div className="reg-feature" key={title}>
              <div className="reg-feature-icon">{icon}</div>
              <div>
                <strong>{title}</strong>
                <span>{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="reg-right">
        <div className="reg-form-wrap">
          <div className="reg-form-header">
            <h2>Registra tu empresa</h2>
            <p>Configura tu plataforma en segundos — sin tarjeta de crédito</p>
          </div>

          <form className="reg-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label req">Nombre de la empresa</label>
                <input id="reg-name" className="form-control" placeholder="Administradora XYZ S.A.S"
                  value={form.name} onChange={set('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label req">NIT</label>
                <input id="reg-nit" className="form-control" placeholder="900123456-7"
                  value={form.nit} onChange={set('nit')} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label req">Nombre del administrador</label>
                <input id="reg-admin-name" className="form-control" placeholder="Juan Pérez"
                  value={form.adminName} onChange={set('adminName')} required />
              </div>
              <div className="form-group">
                <label className="form-label req">Correo corporativo</label>
                <input id="reg-email" className="form-control" type="email" placeholder="admin@empresa.com"
                  value={form.email} onChange={set('email')} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input id="reg-phone" className="form-control" placeholder="+57 300 000 0000"
                  value={form.phone} onChange={set('phone')} />
              </div>
              <div className="form-group">
                <label className="form-label">Ciudad</label>
                <input id="reg-city" className="form-control" placeholder="Bogotá"
                  value={form.city} onChange={set('city')} />
              </div>
            </div>

            <div className="reg-divider"><span>Credenciales de acceso</span></div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label req">Contraseña</label>
                <input id="reg-password" className="form-control" type="password" placeholder="Mínimo 8 caracteres"
                  value={form.password} onChange={set('password')} required />
              </div>
              <div className="form-group">
                <label className="form-label req">Confirmar contraseña</label>
                <input id="reg-confirm" className="form-control" type="password" placeholder="Repite la contraseña"
                  value={form.confirm} onChange={set('confirm')} required />
              </div>
            </div>

            {error && <div className="ls-error">{error}</div>}

            <button id="reg-submit" type="submit" className="reg-btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Configurando...</>
              ) : '🚀 Crear mi plataforma'}
            </button>

            <p className="reg-terms">
              Al registrarte aceptas los{' '}
              <a href="#" style={{ color: 'var(--primary)' }}>Términos de Servicio</a>{' '}
              y la{' '}
              <a href="#" style={{ color: 'var(--primary)' }}>Política de Privacidad</a>.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
