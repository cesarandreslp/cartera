'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'

type Row = {
  id: string
  code: string
  name: string
  nit: string
  city: string | null
  contact: string | null
  phone: string | null
  email: string | null
  active: boolean
  invoiceCount: number
  saldo: number
  saldoFmt: string
}

type FormState = {
  id?: string
  code: string
  name: string
  nit: string
  city: string
  address: string
  contact: string
  phone: string
  email: string
}

const empty: FormState = {
  code: '', name: '', nit: '', city: '', address: '', contact: '', phone: '', email: '',
}

export default function EdificiosClient({ initial }: { initial: Row[] }) {
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
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.nit.toLowerCase().includes(q) ||
        (r.city ?? '').toLowerCase().includes(q),
    )
  }, [initial, query])

  function openNew() {
    setForm(empty)
    setOpen(true)
  }

  function openEdit(r: Row) {
    setForm({
      id: r.id,
      code: r.code,
      name: r.name,
      nit: r.nit,
      city: r.city ?? '',
      address: '',
      contact: r.contact ?? '',
      phone: r.phone ?? '',
      email: r.email ?? '',
    })
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const isEdit = Boolean(form.id)
    const url = isEdit ? `/api/buildings/${form.id}` : '/api/buildings'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        name: form.name,
        nit: form.nit,
        city: form.city || undefined,
        address: form.address || undefined,
        contact: form.contact || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al guardar')
      return
    }

    addToast('success', isEdit ? 'Edificio actualizado' : 'Edificio creado')
    setOpen(false)
    startTransition(() => router.refresh())
  }

  async function remove(r: Row) {
    if (!confirm(`¿Eliminar edificio ${r.code}?${r.invoiceCount > 0 ? ' (se inactivará porque tiene facturas)' : ''}`)) return

    const res = await fetch(`/api/buildings/${r.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al eliminar')
      return
    }
    addToast('success', data.data?.softDeleted ? 'Edificio inactivado' : 'Edificio eliminado')
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Edificios & Clientes</h2>
          <p>{initial.length} registrados</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo edificio</button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-box">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar por código, nombre, NIT o ciudad…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="filter-count">{rows.length} de {initial.length}</span>
        </div>

        <div className="tbl-wrap">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>Sin edificios</h3>
              <p>{initial.length === 0 ? 'Crea el primero para empezar.' : 'Ningún resultado coincide con tu búsqueda.'}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>NIT</th>
                  <th>Ciudad</th>
                  <th>Contacto</th>
                  <th>Facturas</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.code}</strong></td>
                    <td>{r.name}</td>
                    <td>{r.nit}</td>
                    <td>{r.city ?? '—'}</td>
                    <td>{r.contact ?? '—'}</td>
                    <td>{r.invoiceCount}</td>
                    <td>{r.saldo > 0 ? <strong>{r.saldoFmt}</strong> : '—'}</td>
                    <td>
                      <span className={`badge ${r.active ? 'badge-success' : 'badge-gray'}`}>
                        {r.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button className="btn-icon" title="Editar" onClick={() => openEdit(r)}>✏️</button>
                        <button className="btn-icon danger" title="Eliminar" onClick={() => remove(r)}>🗑️</button>
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
                <div className="modal-title">{form.id ? 'Editar edificio' : 'Nuevo edificio'}</div>
                <button type="button" className="modal-close" onClick={() => setOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label req">Código</label>
                    <input className="form-control" required value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={Boolean(form.id)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label req">NIT</label>
                    <input className="form-control" required value={form.nit}
                      onChange={(e) => setForm({ ...form, nit: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label req">Nombre</label>
                  <input className="form-control" required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ciudad</label>
                    <input className="form-control" value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dirección</label>
                    <input className="form-control" value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contacto</label>
                    <input className="form-control" value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input className="form-control" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
