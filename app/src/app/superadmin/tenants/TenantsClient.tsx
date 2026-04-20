'use client'

import { useEffect, useState, useCallback } from 'react'

type Tenant = {
  id: string; slug: string; name: string; nit: string; city?: string
  customDomain?: string; plan: string; active: boolean
  certBlobUrl?: string; dianEnv: string; createdAt: string
}

type CreateForm = {
  slug: string; name: string; nit: string; city: string
  phone: string; email: string; customDomain: string
  plan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
  adminName: string; adminEmail: string; adminPassword: string
}

const EMPTY_FORM: CreateForm = {
  slug: '', name: '', nit: '', city: '', phone: '', email: '',
  customDomain: '', plan: 'BASIC',
  adminName: '', adminEmail: '', adminPassword: '',
}

const PLAN_BADGE: Record<string, string> = {
  BASIC: 'badge-gray', PROFESSIONAL: 'badge-primary', ENTERPRISE: 'badge-purple',
}

export default function TenantsClient() {
  const [tenants,  setTenants]  = useState<Tenant[]>([])
  const [filtered, setFiltered] = useState<Tenant[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState<CreateForm>(EMPTY_FORM)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)
  const [selected, setSelected] = useState<Tenant | null>(null)
  const [detailModal, setDetailModal] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/tenants')
      const d = await r.json()
      setTenants(d.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      q ? tenants.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.nit.includes(q) ||
        (t.city ?? '').toLowerCase().includes(q)
      ) : tenants
    )
  }, [search, tenants])

  const set = (k: keyof CreateForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const slug = name.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 40)
    setForm(f => ({ ...f, name, slug }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res  = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          customDomain: form.customDomain || undefined,
        }),
      })
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? 'Error desconocido'); return }
      showToast(`✅ Tenant "${form.name}" creado exitosamente`)
      setModal(false)
      setForm(EMPTY_FORM)
      await load()
    } catch {
      setError('Error de red')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(t: Tenant) {
    const action = t.active ? 'desactivar' : 'activar'
    if (!confirm(`¿Seguro deseas ${action} "${t.name}"?`)) return
    await fetch(`/api/admin/tenants/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !t.active }),
    })
    showToast(`Tenant ${t.active ? 'desactivado' : 'activado'}`)
    load()
  }

  const active  = tenants.filter(t => t.active).length
  const plans   = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE']
  const planCounts = Object.fromEntries(plans.map(p => [p, tenants.filter(t => t.plan === p).length]))

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--primary-light)' }}>🏢</div>
          <div className="kpi-label">Total Tenants</div>
          <div className="kpi-value">{tenants.length}</div>
          <div className="kpi-sub">{active} activos</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--success-light)' }}>✅</div>
          <div className="kpi-label">Activos</div>
          <div className="kpi-value">{active}</div>
          <div className="kpi-sub">{tenants.length - active} inactivos</div>
        </div>
        {plans.map(p => (
          <div className="kpi-card" key={p}>
            <div className="kpi-icon" style={{ background: 'var(--gray-100)' }}>📋</div>
            <div className="kpi-label">{p}</div>
            <div className="kpi-value">{planCounts[p]}</div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Tenants registrados</div>
            <div className="card-sub">{filtered.length} de {tenants.length}</div>
          </div>
          <button id="btn-nuevo-tenant" className="btn btn-primary" onClick={() => setModal(true)}>
            + Nuevo Tenant
          </button>
        </div>

        <div className="filter-bar">
          <div className="search-box">
            <input
              id="tenant-search"
              className="form-control"
              placeholder="Buscar por nombre, slug, NIT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="tbl-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>Sin tenants</h3>
              <p>Crea el primer tenant para empezar</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>NIT</th>
                  <th>Slug / Dominio</th>
                  <th>Plan</th>
                  <th>DIAN</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      {t.city && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{t.city}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.nit}</td>
                    <td>
                      <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--primary)' }}>
                        {t.slug}.gst.com.co
                      </div>
                      {t.customDomain && (
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{t.customDomain}</div>
                      )}
                    </td>
                    <td><span className={`badge ${PLAN_BADGE[t.plan]}`}>{t.plan}</span></td>
                    <td>
                      <span className={`badge ${t.dianEnv === 'PROD' ? 'badge-success' : 'badge-warning'}`}>
                        {t.dianEnv}
                      </span>
                      {t.certBlobUrl && <span style={{ marginLeft: 4 }}>📜</span>}
                    </td>
                    <td>
                      <span className={`badge ${t.active ? 'badge-success' : 'badge-danger'}`}>
                        {t.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      {new Date(t.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button
                          className="btn-icon"
                          title="Ver detalle"
                          onClick={() => { setSelected(t); setDetailModal(true) }}
                        >👁</button>
                        <button
                          className={`btn-icon ${t.active ? 'danger' : ''}`}
                          title={t.active ? 'Desactivar' : 'Activar'}
                          onClick={() => handleToggle(t)}
                        >
                          {t.active ? '⏸' : '▶'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">🏢 Nuevo Tenant</div>
              <button className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Datos de la empresa
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label req">Nombre empresa</label>
                    <input id="create-name" className="form-control" value={form.name}
                      onChange={handleNameChange} placeholder="Administradora XYZ S.A.S" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label req">NIT</label>
                    <input id="create-nit" className="form-control" value={form.nit}
                      onChange={set('nit')} placeholder="900123456-7" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label req">Slug (URL)</label>
                    <input id="create-slug" className="form-control" value={form.slug}
                      onChange={set('slug')} placeholder="empresa-xyz" required
                      pattern="^[a-z0-9-]+$" title="Solo minúsculas, números y guiones" />
                    <span className="form-hint">→ {form.slug || 'slug'}.gst.com.co</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dominio personalizado</label>
                    <input id="create-domain" className="form-control" value={form.customDomain}
                      onChange={set('customDomain')} placeholder="empresa.com (opcional)" />
                  </div>
                </div>
                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Ciudad</label>
                    <input id="create-city" className="form-control" value={form.city}
                      onChange={set('city')} placeholder="Bogotá" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input id="create-phone" className="form-control" value={form.phone}
                      onChange={set('phone')} placeholder="+57 300..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Plan</label>
                    <select id="create-plan" className="form-control" value={form.plan} onChange={set('plan')}>
                      <option value="BASIC">BASIC</option>
                      <option value="PROFESSIONAL">PROFESSIONAL</option>
                      <option value="ENTERPRISE">ENTERPRISE</option>
                    </select>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 0' }} />
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Administrador inicial
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label req">Nombre admin</label>
                    <input id="create-admin-name" className="form-control" value={form.adminName}
                      onChange={set('adminName')} placeholder="Juan Pérez" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label req">Email admin</label>
                    <input id="create-admin-email" className="form-control" type="email"
                      value={form.adminEmail} onChange={set('adminEmail')}
                      placeholder="admin@empresa.com" required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label req">Contraseña inicial</label>
                  <input id="create-admin-pass" className="form-control" type="password"
                    value={form.adminPassword} onChange={set('adminPassword')}
                    placeholder="Mínimo 8 caracteres" required minLength={8} />
                </div>

                {error && <div className="ls-error">{error}</div>}

                <div style={{ background: 'var(--warning-light)', border: '1px solid rgba(217,119,6,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--warning)' }}>
                  ⚠️ Este proceso provisiona una nueva base de datos en Neon y puede tardar 10–30 segundos.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
                <button id="create-submit" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving
                    ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Provisionando...</>
                    : '🚀 Crear Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {detailModal && selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetailModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">🏢 {selected.name}</div>
              <button className="modal-close" onClick={() => setDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">NIT</label>
                  <input className="form-control" value={selected.nit} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Plan</label>
                  <input className="form-control" value={selected.plan} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">URL del tenant</label>
                <input className="form-control" value={`https://${selected.slug}.gst.com.co`} readOnly />
              </div>
              {selected.customDomain && (
                <div className="form-group">
                  <label className="form-label">Dominio personalizado</label>
                  <input className="form-control" value={selected.customDomain} readOnly />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ambiente DIAN</label>
                  <input className="form-control" value={selected.dianEnv} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Certificado DIAN</label>
                  <input className="form-control" value={selected.certBlobUrl ? '✅ Cargado' : '⚠️ Sin certificado'} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <span className={`badge ${selected.active ? 'badge-success' : 'badge-danger'}`} style={{ display: 'inline-flex', marginTop: 4 }}>
                  {selected.active ? '● Activo' : '● Inactivo'}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDetailModal(false)}>Cerrar</button>
              <button
                className={`btn ${selected.active ? 'btn-danger' : 'btn-success'}`}
                onClick={() => { handleToggle(selected); setDetailModal(false) }}
              >
                {selected.active ? '⏸ Desactivar' : '▶ Activar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.ok ? 'toast-success' : 'toast-error'}`}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  )
}
