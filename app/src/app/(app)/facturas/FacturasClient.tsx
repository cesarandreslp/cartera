'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import DocumentUploader from '@/components/ui/DocumentUploader'
import { useAppStore } from '@/store/app'
import { fmt, fmtDate } from '@/lib/utils'

type Row = {
  id: string
  number: string
  type: string
  buildingCode: string
  buildingName: string
  period: string
  concept: string | null
  total: number
  saldo: number
  status: string
  dianStatus: string | null
  createdAt: string
  dueDate: string | null
  documentUrl: string | null
}

type Building = { id: string; code: string; name: string }

type Filters = { year: number; status: string; buildingId: string }

type FormState = {
  number: string
  buildingId: string
  period: string
  concept: string
  subtotal: string
  discount: string
  mora: string
  tax: string
  dueDate: string
}

const emptyForm: FormState = {
  number: '',
  buildingId: '',
  period: new Date().toISOString().slice(0, 7),
  concept: '',
  subtotal: '',
  discount: '0',
  mora: '0',
  tax: '0',
  dueDate: '',
}

const STATUS_OPTIONS = [
  { v: '', l: 'Todos los estados' },
  { v: 'PENDING', l: 'Pendiente' },
  { v: 'PARTIAL', l: 'Parcial' },
  { v: 'PAID', l: 'Pagada' },
  { v: 'OVERDUE', l: 'Vencida' },
  { v: 'VOID', l: 'Anulada' },
]

export default function FacturasClient({
  initial,
  buildings,
  filters,
}: {
  initial: Row[]
  buildings: Building[]
  filters: Filters
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const { addToast } = useAppStore()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return initial
    return initial.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.buildingCode.toLowerCase().includes(q) ||
        r.buildingName.toLowerCase().includes(q) ||
        (r.concept ?? '').toLowerCase().includes(q),
    )
  }, [initial, query])

  const totalSum = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows])

  function updateFilter(key: 'year' | 'status' | 'buildingId', value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/facturas?${params.toString()}`))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: form.number,
        buildingId: form.buildingId,
        period: form.period,
        concept: form.concept || undefined,
        subtotal: Number(form.subtotal || 0),
        discount: Number(form.discount || 0),
        mora: Number(form.mora || 0),
        tax: Number(form.tax || 0),
        dueDate: form.dueDate || undefined,
        fiscalYear: Number(form.period.slice(0, 4)) || filters.year,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al crear factura')
      return
    }

    addToast('success', `Factura ${data.data.number} creada`)
    setOpen(false)
    setForm(emptyForm)
    startTransition(() => router.refresh())
  }

  async function voidInvoice(r: Row) {
    if (!confirm(`¿Anular factura ${r.number}?`)) return
    const res = await fetch(`/api/invoices/${r.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al anular')
      return
    }
    addToast('success', 'Factura anulada')
    startTransition(() => router.refresh())
  }

  const subtotal = Number(form.subtotal || 0)
  const discount = Number(form.discount || 0)
  const mora = Number(form.mora || 0)
  const tax = Number(form.tax || 0)
  const totalPreview = subtotal - discount + mora + tax

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Facturas</h2>
          <p>{rows.length} facturas · Total {fmt(totalSum)}</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Nueva factura</button>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="search-box">
            <input
              type="search"
              className="form-control"
              placeholder="Buscar número, edificio, concepto…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 110 }}
            value={filters.year}
            onChange={(e) => updateFilter('year', e.target.value)}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>Año {y}</option>
            ))}
          </select>
          <select
            className="form-control"
            style={{ width: 170 }}
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </select>
          <select
            className="form-control"
            style={{ width: 220 }}
            value={filters.buildingId}
            onChange={(e) => updateFilter('buildingId', e.target.value)}
          >
            <option value="">Todos los edificios</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.code} · {b.name}</option>
            ))}
          </select>
          <span className="filter-count">{rows.length} resultados</span>
        </div>

        <div className="tbl-wrap">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>Sin facturas</h3>
              <p>Crea la primera factura del período.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Tipo</th>
                  <th>Edificio</th>
                  <th>Período</th>
                  <th>Concepto</th>
                  <th>Total</th>
                  <th>Saldo</th>
                  <th>DIAN</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.number}</strong></td>
                    <td><span className="badge badge-gray">{r.type}</span></td>
                    <td>{r.buildingCode} · {r.buildingName}</td>
                    <td>{r.period}</td>
                    <td>{r.concept ?? '—'}</td>
                    <td>{fmt(r.total)}</td>
                    <td>{r.saldo > 0 ? <strong>{fmt(r.saldo)}</strong> : '—'}</td>
                    <td>{r.dianStatus ? <span className="badge badge-info">{r.dianStatus}</span> : '—'}</td>
                    <td><span className={`badge ${statusBadge(r.status)}`}>{r.status}</span></td>
                    <td>{fmtDate(r.dueDate)}</td>
                    <td>
                      <div className="tbl-actions">
                        {r.documentUrl ? (
                          <a href={r.documentUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Ver documento">📄</a>
                        ) : (
                          <div style={{ width: 32, display: 'flex', justifyContent: 'center' }}>
                            <DocumentUploader 
                              type="invoice" 
                              entityId={r.id} 
                              label="" 
                              onUploadComplete={() => startTransition(() => router.refresh())}
                            />
                          </div>
                        )}
                        {r.status !== 'VOID' && (
                          <button className="btn-icon danger" title="Anular" onClick={() => voidInvoice(r)}>🗑️</button>
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
          <div className="modal modal-lg">
            <form onSubmit={save}>
              <div className="modal-header">
                <div className="modal-title">Nueva factura</div>
                <button type="button" className="modal-close" onClick={() => setOpen(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label req">N° Factura</label>
                    <input className="form-control" required value={form.number}
                      onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label req">Edificio</label>
                    <select className="form-control" required value={form.buildingId}
                      onChange={(e) => setForm({ ...form, buildingId: e.target.value })}>
                      <option value="">— Selecciona —</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.code} · {b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label req">Período</label>
                    <input type="month" className="form-control" required value={form.period}
                      onChange={(e) => setForm({ ...form, period: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vence</label>
                    <input type="date" className="form-control" value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Concepto</label>
                  <input className="form-control" value={form.concept}
                    onChange={(e) => setForm({ ...form, concept: e.target.value })}
                    placeholder="Administración marzo 2026" />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label req">Subtotal</label>
                    <input type="number" step="0.01" className="form-control" required value={form.subtotal}
                      onChange={(e) => setForm({ ...form, subtotal: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descuento</label>
                    <input type="number" step="0.01" className="form-control" value={form.discount}
                      onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Mora</label>
                    <input type="number" step="0.01" className="form-control" value={form.mora}
                      onChange={(e) => setForm({ ...form, mora: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IVA / Impuesto</label>
                    <input type="number" step="0.01" className="form-control" value={form.tax}
                      onChange={(e) => setForm({ ...form, tax: e.target.value })} />
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: 14, color: 'var(--gray-700)', borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}>
                  Total: <strong style={{ fontSize: 18, color: 'var(--primary)' }}>{fmt(totalPreview)}</strong>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Crear factura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function statusBadge(s: string): string {
  switch (s) {
    case 'PAID': return 'badge-success'
    case 'PARTIAL': return 'badge-info'
    case 'OVERDUE': return 'badge-danger'
    case 'VOID': return 'badge-gray'
    default: return 'badge-warning'
  }
}
