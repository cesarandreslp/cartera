'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'
import { fmtDate } from '@/lib/utils'

type Row = {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
}

type FormState = {
  id?: string
  name: string
  email: string
  password: string
  role: string
  active: boolean
}

const empty: FormState = { name: '', email: '', password: '', role: 'OPERATOR', active: true }

const ROLES = [
  { v: 'ADMIN', l: 'Administrador' },
  { v: 'MANAGER', l: 'Gerente' },
  { v: 'OPERATOR', l: 'Operador' },
  { v: 'VIEWER', l: 'Consulta' },
]

export default function UsuariosClient({ initial }: { initial: Row[] }) {
  const router = useRouter()
  const { addToast } = useAppStore()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initial
    return initial.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q),
    )
  }, [initial, query])

  function openNew() { setForm(empty); setOpen(true) }
  function openEdit(r: Row) {
    setForm({ id: r.id, name: r.name, email: r.email, password: '', role: r.role, active: r.active })
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const isEdit = Boolean(form.id)
    const url = isEdit ? `/api/users/${form.id}` : '/api/users'
    const method = isEdit ? 'PUT' : 'POST'

    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      active: form.active,
    }
    if (!isEdit || form.password) body.password = form.password

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al guardar')
      return
    }
    addToast('success', isEdit ? 'Usuario actualizado' : 'Usuario creado')
    setOpen(false)
    startTransition(() => router.refresh())
  }

  async function deactivate(r: Row) {
    if (!confirm(`¿Inactivar usuario ${r.email}?`)) return
    const res = await fetch(`/api/users/${r.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error')
      return
    }
    addToast('success', 'Usuario inactivado')
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Usuarios</h2>
          <p>{initial.length} registrados · {initial.filter(u => u.active).length} activos</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo usuario</button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-box">
            <input type="search" className="form-control"
              placeholder="Buscar por nombre, email o rol…"
              value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="filter-count">{rows.length} de {initial.length}</span>
        </div>

        <div className="tbl-wrap">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>Sin usuarios</h3>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Creado</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.email}</td>
                    <td><span className="badge badge-primary">{roleLabel(r.role)}</span></td>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td>
                      <span className={`badge ${r.active ? 'badge-success' : 'badge-gray'}`}>
                        {r.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button className="btn-icon" title="Editar" onClick={() => openEdit(r)}>✏️</button>
                        {r.active && (
                          <button className="btn-icon danger" title="Inactivar" onClick={() => deactivate(r)}>🚫</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal">
            <form onSubmit={save}>
              <div className="modal-header">
                <div className="modal-title">{form.id ? 'Editar usuario' : 'Nuevo usuario'}</div>
                <button type="button" className="modal-close" onClick={() => setOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label req">Nombre</label>
                  <input className="form-control" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label req">Email</label>
                  <input type="email" className="form-control" required value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className={`form-label${form.id ? '' : ' req'}`}>
                    Contraseña {form.id && <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>(dejar vacío para no cambiar)</span>}
                  </label>
                  <input type="password" className="form-control" required={!form.id} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Rol</label>
                    <select className="form-control" value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}>
                      {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select className="form-control" value={form.active ? '1' : '0'}
                      onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
                      <option value="1">Activo</option>
                      <option value="0">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function roleLabel(r: string): string {
  switch (r) {
    case 'ADMIN': return 'Administrador'
    case 'MANAGER': return 'Gerente'
    case 'OPERATOR': return 'Operador'
    case 'VIEWER': return 'Consulta'
    default: return r
  }
}
