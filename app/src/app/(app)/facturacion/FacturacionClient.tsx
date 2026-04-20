'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'
import { fmt, fmtDate } from '@/lib/utils'

type Row = {
  id: string
  number: string
  buildingCode: string
  buildingName: string
  period: string
  total: number
  type: string
  dianStatus: string | null
  cufe: string | null
  signedAt: string | null
  feDocId: string | null
}

type Kpis = { emitidas: number; pendientes: number; firmadas: number; rechazadas: number }

export default function FacturacionClient({ rows, kpis }: { rows: Row[]; kpis: Kpis }) {
  const router = useRouter()
  const { addToast } = useAppStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [noteTarget, setNoteTarget] = useState<Row | null>(null)
  const [noteType, setNoteType] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [noteReason, setNoteReason] = useState('')
  const [, startTransition] = useTransition()

  async function emit(r: Row) {
    setBusy(r.id)
    const res = await fetch(`/api/invoices/${r.id}/emit`, { method: 'POST' })
    const data = await res.json()
    setBusy(null)
    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al emitir')
      return
    }
    addToast('success', `Emitida · CUFE ${data.data.cufe.slice(0, 12)}…`)
    startTransition(() => router.refresh())
  }

  async function emitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!noteTarget) return
    setBusy(noteTarget.id)
    const res = await fetch(`/api/invoices/${noteTarget.id}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: noteType, reason: noteReason }),
    })
    const data = await res.json()
    setBusy(null)
    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error')
      return
    }
    addToast('success', `Nota ${noteType === 'CREDIT' ? 'crédito' : 'débito'} generada`)
    setNoteTarget(null)
    setNoteReason('')
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Facturación Electrónica</h2>
          <p>UBL 2.1 · Ambiente DIAN configurable</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI label="Aceptadas DIAN" value={String(kpis.emitidas)} icon="✅" tint="var(--success-light)" />
        <KPI label="Firmadas" value={String(kpis.firmadas)} icon="✍️" tint="var(--info-light)" />
        <KPI label="Pendientes de emitir" value={String(kpis.pendientes)} icon="⏳" tint="var(--warning-light)" />
        <KPI label="Rechazadas" value={String(kpis.rechazadas)} icon="❌" tint="var(--danger-light)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Facturas</div>
            <div className="card-sub">Emisión electrónica · {rows.length} recientes</div>
          </div>
        </div>
        <div className="tbl-wrap">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>Sin facturas</h3>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Edificio</th>
                  <th>Período</th>
                  <th>Total</th>
                  <th>Tipo</th>
                  <th>DIAN</th>
                  <th>CUFE</th>
                  <th>Firmada</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.number}</strong></td>
                    <td>{r.buildingCode} · {r.buildingName}</td>
                    <td>{r.period}</td>
                    <td>{fmt(r.total)}</td>
                    <td><span className="badge badge-gray">{r.type}</span></td>
                    <td>
                      {r.dianStatus
                        ? <span className={`badge ${dianBadge(r.dianStatus)}`}>{r.dianStatus}</span>
                        : <span className="badge badge-warning">PENDIENTE</span>}
                    </td>
                    <td>
                      {r.cufe
                        ? <code style={{ fontSize: 10 }}>{r.cufe.slice(0, 14)}…</code>
                        : '—'}
                    </td>
                    <td>{fmtDate(r.signedAt)}</td>
                    <td>
                      <div className="tbl-actions">
                        {!r.dianStatus ? (
                          <button className="btn btn-success btn-sm"
                            disabled={busy === r.id}
                            onClick={() => emit(r)}>
                            {busy === r.id ? '…' : '⚡ Emitir'}
                          </button>
                        ) : (r.dianStatus === 'ACCEPTED' || r.dianStatus === 'SENT') && (
                          <button className="btn btn-outline btn-sm"
                            onClick={() => { setNoteTarget(r); setNoteType('CREDIT'); setNoteReason('') }}>
                            📝 Nota
                          </button>
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

      {noteTarget && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setNoteTarget(null) }}>
          <div className="modal">
            <form onSubmit={emitNote}>
              <div className="modal-header">
                <div className="modal-title">Nota electrónica · {noteTarget.number}</div>
                <button type="button" className="modal-close" onClick={() => setNoteTarget(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                  CUFE factura: <code>{noteTarget.cufe?.slice(0, 24)}…</code>
                </div>
                <div className="form-group">
                  <label className="form-label req">Tipo</label>
                  <select className="form-control" value={noteType}
                    onChange={(e) => setNoteType(e.target.value as 'CREDIT' | 'DEBIT')}>
                    <option value="CREDIT">Nota crédito (anula factura)</option>
                    <option value="DEBIT">Nota débito (ajuste adicional)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label req">Motivo</label>
                  <textarea className="form-control" required rows={3}
                    value={noteReason}
                    onChange={(e) => setNoteReason(e.target.value)}
                    placeholder="Ej: Devolución del cliente / Error en valor facturado" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setNoteTarget(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={busy === noteTarget.id}>
                  {busy === noteTarget.id ? 'Emitiendo…' : 'Emitir nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function dianBadge(s: string): string {
  switch (s) {
    case 'ACCEPTED': return 'badge-success'
    case 'SENT': return 'badge-info'
    case 'SIGNED': return 'badge-primary'
    case 'REJECTED': return 'badge-danger'
    case 'VOID': return 'badge-gray'
    default: return 'badge-warning'
  }
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
