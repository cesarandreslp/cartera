'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useMemo } from 'react'

type Row = {
  id: string
  module: string
  action: string
  detail: string | null
  entityId: string | null
  userName: string
  userEmail: string
  createdAt: string
}

type User = { id: string; name: string; email: string }

const MODULES = [
  'dashboard','edificios','facturas','facturacion','pagos','cartera',
  'cobros','reportes','gerencial','documentos','cierre','auditoria',
  'usuarios','config','ayuda',
]

export default function AuditoriaClient({
  initial,
  users,
  filters,
}: {
  initial: Row[]
  users: User[]
  filters: { module: string; userId: string; from: string; to: string }
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  const stats = useMemo(() => {
    const byModule = new Map<string, number>()
    for (const r of initial) byModule.set(r.module, (byModule.get(r.module) ?? 0) + 1)
    const top = [...byModule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    return { total: initial.length, top }
  }, [initial])

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    startTransition(() => router.push(`/auditoria?${params.toString()}`))
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Auditoría</h2>
          <p>{stats.total} eventos (últimos 300)</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--primary-light)' }}>🔍</div>
          <div className="kpi-label">Total eventos</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        {stats.top.map(([m, n]) => (
          <div key={m} className="kpi-card">
            <div className="kpi-icon" style={{ background: 'var(--info-light)' }}>📌</div>
            <div className="kpi-label">{m}</div>
            <div className="kpi-value">{n}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="filter-bar">
          <select className="form-control" style={{ width: 170 }}
            value={filters.module} onChange={(e) => update('module', e.target.value)}>
            <option value="">Todos los módulos</option>
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="form-control" style={{ width: 220 }}
            value={filters.userId} onChange={(e) => update('userId', e.target.value)}>
            <option value="">Todos los usuarios</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input type="date" className="form-control" style={{ width: 150 }}
            value={filters.from} onChange={(e) => update('from', e.target.value)} />
          <input type="date" className="form-control" style={{ width: 150 }}
            value={filters.to} onChange={(e) => update('to', e.target.value)} />
          <span className="filter-count">{initial.length} eventos</span>
        </div>

        <div className="tbl-wrap">
          {initial.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>Sin eventos</h3>
              <p>No hay registros que coincidan con los filtros.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {initial.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11.5 }}>
                      {new Date(r.createdAt).toLocaleString('es-CO', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <strong>{r.userName}</strong>
                      <br />
                      <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{r.userEmail}</span>
                    </td>
                    <td><span className="badge badge-primary">{r.module}</span></td>
                    <td><span className="badge badge-info">{r.action}</span></td>
                    <td>{r.detail ?? '—'}</td>
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
