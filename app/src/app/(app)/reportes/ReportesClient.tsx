'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useTransition } from 'react'
import { fmt } from '@/lib/utils'

type Totals = { facturado: number; recaudado: number; pendiente: number; facturas: number }
type Monthly = { period: string; facturado: number; recaudado: number; pendiente: number; count: number }
type ByBuilding = { code: string; name: string; facturado: number; recaudado: number; pendiente: number; count: number }

export default function ReportesClient({
  year,
  totals,
  monthly,
  byBuilding,
}: {
  year: number
  totals: Totals
  monthly: Monthly[]
  byBuilding: ByBuilding[]
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  const max = useMemo(
    () => Math.max(1, ...monthly.map((m) => Math.max(m.facturado, m.recaudado))),
    [monthly],
  )

  const efectividad = totals.facturado > 0 ? (totals.recaudado / totals.facturado) * 100 : 0

  function setYear(v: string) {
    const params = new URLSearchParams(sp.toString())
    params.set('year', v)
    startTransition(() => router.push(`/reportes?${params.toString()}`))
  }

  function exportCsv() {
    const headers = ['Período', 'Facturas', 'Facturado', 'Recaudado', 'Pendiente']
    const rows = monthly.map((m) => [m.period, m.count, m.facturado, m.recaudado, m.pendiente].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Reportes</h2>
          <p>Año {year} · {totals.facturas} facturas</p>
        </div>
        <div className="page-header-right">
          <select className="form-control" style={{ width: 110 }} value={year}
            onChange={(e) => setYear(e.target.value)}>
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>Año {y}</option>
            ))}
          </select>
          <button className="btn btn-outline" onClick={exportCsv}>📥 Exportar CSV</button>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI label="Facturado" value={fmt(totals.facturado)} tint="var(--primary-light)" icon="📄" />
        <KPI label="Recaudado" value={fmt(totals.recaudado)} tint="var(--success-light)" icon="💰"
          sub={`${efectividad.toFixed(1)}% efectividad`} />
        <KPI label="Pendiente" value={fmt(totals.pendiente)} tint="var(--warning-light)" icon="📋" />
        <KPI label="Facturas" value={String(totals.facturas)} tint="var(--info-light)" icon="🧾" />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Facturado vs Recaudado mensual</div>
            <div className="card-sub">Barras comparativas por período</div>
          </div>
        </div>
        <div className="card-body">
          {monthly.length === 0 ? (
            <div className="empty-state"><p>Sin datos para {year}</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {monthly.map((m) => (
                <div key={m.period}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <strong>{m.period}</strong>
                    <span style={{ color: 'var(--gray-500)' }}>
                      {fmt(m.recaudado)} / {fmt(m.facturado)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Bar value={m.facturado} max={max} color="var(--primary)" label="Facturado" />
                    <Bar value={m.recaudado} max={max} color="var(--success)" label="Recaudado" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Por edificio</div>
            <div className="card-sub">Ranking de facturación</div>
          </div>
        </div>
        <div className="tbl-wrap">
          {byBuilding.length === 0 ? (
            <div className="empty-state"><p>Sin datos</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Edificio</th>
                  <th>Facturas</th>
                  <th>Facturado</th>
                  <th>Recaudado</th>
                  <th>Pendiente</th>
                  <th>Efectividad</th>
                </tr>
              </thead>
              <tbody>
                {byBuilding.map((b) => {
                  const ef = b.facturado > 0 ? (b.recaudado / b.facturado) * 100 : 0
                  return (
                    <tr key={b.code}>
                      <td><strong>{b.code}</strong> · {b.name}</td>
                      <td>{b.count}</td>
                      <td>{fmt(b.facturado)}</td>
                      <td>{fmt(b.recaudado)}</td>
                      <td><strong>{fmt(b.pendiente)}</strong></td>
                      <td>
                        <span className={`badge ${ef >= 90 ? 'badge-success' : ef >= 70 ? 'badge-warning' : 'badge-danger'}`}>
                          {ef.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

function KPI({ label, value, tint, icon, sub }: { label: string; value: string; tint: string; icon: string; sub?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: tint }}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = (value / max) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5 }}>
      <span style={{ width: 60, color: 'var(--gray-500)' }}>{label}</span>
      <div style={{ flex: 1, background: 'var(--gray-100)', borderRadius: 4, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width .3s' }} />
      </div>
    </div>
  )
}
