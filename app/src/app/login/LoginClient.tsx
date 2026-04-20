'use client'

import { useState } from 'react'
import { signIn }   from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginClient({
  tenantId,
  tenantName,
}: {
  tenantId: string
  tenantName: string
}) {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Try tenant login first
    if (tenantId) {
      const res = await signIn('tenant', {
        email,
        password,
        tenantId,
        redirect: false,
      })
      if (!res?.error) {
        router.push('/dashboard')
        return
      }
    }

    // Fallback: try superadmin login
    const res = await signIn('superadmin', {
      email,
      password,
      redirect: false,
    })

    if (res?.error) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/superadmin/tenants')
    }
  }

  return (
    <div className="login-screen">
      {/* LEFT — branding */}
      <div className="ls-left">
        <div className="ls-brand">
          <div className="ls-brand-icon">G</div>
          <h1>{tenantName}</h1>
          <p>Sistema de Cartera &amp; Facturación Electrónica</p>
        </div>

        <div className="ls-features">
          {[
            { icon: '🏢', title: 'Gestión de Edificios', desc: 'Administre clientes y propiedades' },
            { icon: '📄', title: 'Facturación Electrónica', desc: 'Emisión DIAN UBL 2.1 certificada' },
            { icon: '💳', title: 'Control de Cartera', desc: 'Aging, mora y cobros automáticos' },
            { icon: '📊', title: 'Reportes Gerenciales', desc: 'Análisis con inteligencia artificial' },
          ].map(f => (
            <div key={f.title} className="ls-feature">
              <div className="ls-feature-icon">{f.icon}</div>
              <div className="ls-feature-text">
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="ls-right">
        <div className="ls-form-header">
          <h2>Iniciar Sesión</h2>
          <p>Accede a tu cuenta {tenantName}</p>
        </div>

        <form className="ls-form" onSubmit={handleSubmit}>
          {error && <div className="ls-error">⚠️ {error}</div>}

          <div className="ls-input-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <input
              id="login-email"
              type="email"
              className="ls-input"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="ls-input-group">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              className="ls-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="btn-login"
            type="submit"
            className="ls-btn"
            disabled={loading}
          >
            {loading ? '⏳ Verificando...' : '→ Ingresar al sistema'}
          </button>
        </form>

        <p style={{ marginTop: 32, fontSize: 11, color: 'var(--gray-400)', textAlign: 'center' }}>
          GST SaaS © {new Date().getFullYear()} · v7.0 Multitenant
        </p>
      </div>
    </div>
  )
}
