'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'
import { fmt, fmtDate } from '@/lib/utils'

type Pending = {
  id: string
  number: string
  buildingCode: string
  buildingName: string
  period: string
  total: number
  saldo: number
}

type Recent = {
  id: string
  amount: number
  date: string
  method: string
  reference: string | null
  invoiceNumber: string
  buildingCode: string
  buildingName: string
  userName: string
}

const METHODS = [
  { v: 'TRANSFER', l: 'Transferencia' },
  { v: 'CASH',     l: 'Efectivo' },
  { v: 'CHEQUE',   l: 'Cheque' },
  { v: 'CARD',     l: 'Tarjeta' },
  { v: 'OTHER',    l: 'Otro' },
]

export default function PagosClient({
  pending,
  recent,
}: {
  pending: Pending[]
  recent: Recent[]
}) {
  const router = useRouter()
  const { addToast } = useAppStore()
  const [, startTransition] = useTransition()

  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<Pending | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('TRANSFER')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pending
    return pending.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.buildingCode.toLowerCase().includes(q) ||
        r.buildingName.toLowerCase().includes(q),
    )
  }, [pending, query])

  const totals = useMemo(() => {
    const saldoTotal = pending.reduce((s, r) => s + r.saldo, 0)
    const recaudoMes = recent
      .filter((r) => new Date(r.date).getMonth() === new Date().getMonth())
      .reduce((s, r) => s + r.amount, 0)
    return { saldoTotal, recaudoMes, pendientes: pending.length }
  }, [pending, recent])

  function openPay(row: Pending) {
    setTarget(row)
    setAmount(row.saldo.toFixed(2))
    setMethod('TRANSFER')
    setReference('')
    setDate(new Date().toISOString().slice(0, 10))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!target) return
    setSaving(true)

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId: target.id,
        amount: Number(amount),
        date,
        method,
        reference: reference || undefined,
      }),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al registrar pago')
      return
    }

    addToast('success', `Pago ${fmt(Number(amount))} aplicado a ${target.number}`)
    setTarget(null)
    startTransition(() => router.refresh())
  }

  async function reverse(id: string) {
    if (!confirm('¿Reversar este pago? El saldo de la factura se recalculará.')) return
    const res = await fetch(`/api/payments/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al reversar')
      return
    }
    addToast('success', 'Pago reversado')
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Pagos</h2>
          <p>Registro de abonos y recaudos</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI label="Saldo pendiente" value={fmt(totals.saldoTotal)} icon="📋" tint="var(--warning-light)" />
        <KPI label="Recaudo del mes" value={fmt(totals.recaudoMes)} icon="💰" tint="var(--success-light)" />
        <KPI label="Facturas con saldo" value={String(totals.pendientes)} icon="📄" tint="var(--primary-light)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="filter-bar">
            <div className="search-box">
              <input
                type="search"
                className="form-control"
                placeholder="Buscar factura o edificio…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <span className="filter-count">{filtered.length} pendientes</span>
          </div>
          <div className="tbl-wrap">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <h3>Sin pendientes</h3>
                <p>Todas las facturas están pagadas.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Edificio</th>
                    <th>Período</th>
                    <th>Total</th>
                    <th>Saldo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.number}</strong></td>
                      <td>{r.buildingCode} · {r.buildingName}</td>
                      <td>{r.period}</td>
                      <td>{fmt(r.total)}</td>
                      <td><strong>{fmt(r.saldo)}</strong></td>
                      <td>
                        <button className="btn btn-success btn-sm" onClick={() => openPay(r)}>💳 Pagar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Pagos recientes</div>
              <div className="card-sub">Últimos 100</div>
            </div>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
            {recent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>Aún no hay pagos registrados.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Factura</th>
                    <th>Monto</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.date)}</td>
                      <td>
                        <strong>{p.invoiceNumber}</strong>
                        <br />
                        <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{p.buildingCode}</span>
                      </td>
                      <td>{fmt(p.amount)}</td>
                      <td>
                        <button className="btn-icon danger" title="Reversar" onClick={() => reverse(p.id)}>↺</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {target && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setTarget(null) }}>
          <div className="modal">
            <form onSubmit={submit}>
              <div className="modal-header">
                <div className="modal-title">Registrar pago · {target.number}</div>
                <button type="button" className="modal-close" onClick={() => setTarget(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ background: 'var(--gray-50)', padding: 12, borderRadius: 8, fontSize: 12, color: 'var(--gray-600)' }}>
                  <div>{target.buildingCode} · {target.buildingName}</div>
                  <div>Período {target.period} · Total {fmt(target.total)}</div>
                  <div>Saldo pendiente: <strong style={{ color: 'var(--danger)' }}>{fmt(target.saldo)}</strong></div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label req">Monto</label>
                    <input type="number" step="0.01" className="form-control" required
                      max={target.saldo}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label req">Fecha</label>
                    <input type="date" className="form-control" required value={date}
                      onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Método</label>
                    <select className="form-control" value={method} onChange={(e) => setMethod(e.target.value)}>
                      {METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Referencia</label>
                    <input className="form-control" value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="N° transferencia / cheque" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setTarget(null)}>Cancelar</button>
                <button type="submit" className="btn btn-success" disabled={saving}>
                  {saving ? 'Procesando…' : 'Aplicar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function KPI({ label, value, icon, tint }: { label: string; value: string; icon: string; tint: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: tint }}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  )
}
