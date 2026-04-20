'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'
import { fmtDate } from '@/lib/utils'

type Building = { id: string; code: string; name: string }
type Run = {
  id: string
  executedAt: string
  period: string
  totalSent: number
  totalErrors: number
  mode: string
  userName: string
}

export default function CobrosClient({
  buildings,
  runs,
}: {
  buildings: Building[]
  runs: Run[]
}) {
  const router = useRouter()
  const { addToast } = useAppStore()
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [emit, setEmit] = useState(false)
  const [running, setRunning] = useState(false)
  const [, startTransition] = useTransition()

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function toggleAll() {
    if (selected.size === buildings.length) setSelected(new Set())
    else setSelected(new Set(buildings.map((b) => b.id)))
  }

  async function run() {
    if (!confirm(`¿Generar facturación masiva para ${selected.size || 'todos los'} edificios en el período ${period}?`)) return
    setRunning(true)
    const res = await fetch('/api/billing/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period,
        buildingIds: selected.size > 0 ? [...selected] : undefined,
        emit,
        mode: 'MANUAL',
      }),
    })
    const data = await res.json()
    setRunning(false)
    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al ejecutar')
      return
    }
    addToast('success', `${data.data.totalSent} facturas generadas · ${data.data.totalErrors} errores`)
    setSelected(new Set())
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Cobros Automáticos</h2>
          <p>Generación masiva de facturación</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Edificios</div>
              <div className="card-sub">{selected.size > 0 ? `${selected.size} seleccionados` : 'Todos los activos'}</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={toggleAll}>
              {selected.size === buildings.length ? 'Deseleccionar' : 'Seleccionar todos'}
            </button>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: 480, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Código</th>
                  <th>Nombre</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((b) => (
                  <tr key={b.id} onClick={() => toggle(b.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                    </td>
                    <td><strong>{b.code}</strong></td>
                    <td>{b.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Configuración</div>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label req">Período</label>
              <input type="month" className="form-control" value={period}
                onChange={(e) => setPeriod(e.target.value)} />
            </div>

            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={emit} onChange={(e) => setEmit(e.target.checked)} />
              <div>
                <strong style={{ display: 'block' }}>Emitir electrónicamente</strong>
                <span style={{ fontSize: 11.5, color: 'var(--gray-500)' }}>
                  Genera CUFE y UBL al crear cada factura
                </span>
              </div>
            </label>

            <div style={{ background: 'var(--warning-light)', padding: 12, borderRadius: 8, fontSize: 11.5, color: 'var(--warning)' }}>
              ⚠️ Se omitirán edificios que ya tengan factura para el período.
            </div>

            <button className="btn btn-primary btn-lg" disabled={running} onClick={run}>
              {running ? 'Ejecutando…' : '🔄 Ejecutar cobro masivo'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Historial de ejecuciones</div>
            <div className="card-sub">Últimas 30 corridas</div>
          </div>
        </div>
        <div className="tbl-wrap">
          {runs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔄</div>
              <p>No hay ejecuciones previas.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Período</th>
                  <th>Modo</th>
                  <th>Usuario</th>
                  <th>OK</th>
                  <th>Errores</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.executedAt)}</td>
                    <td>{r.period}</td>
                    <td><span className="badge badge-gray">{r.mode}</span></td>
                    <td>{r.userName}</td>
                    <td><span className="badge badge-success">{r.totalSent}</span></td>
                    <td>
                      {r.totalErrors > 0
                        ? <span className="badge badge-danger">{r.totalErrors}</span>
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
