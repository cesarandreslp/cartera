'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'
import { fmt, fmtDate } from '@/lib/utils'

type Year = {
  year: number
  totalFacturas: number
  totalFacturado: number
  pendientes: number
  closed: boolean
  closedAt: string | null
  closedBy: string | null
}

export default function CierreClient({ years }: { years: Year[] }) {
  const router = useRouter()
  const { addToast } = useAppStore()
  const [closing, setClosing] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  async function close(y: Year) {
    if (y.pendientes > 0) {
      addToast('warning', `No se puede cerrar: ${y.pendientes} facturas pendientes en ${y.year}`)
      return
    }
    if (!confirm(`¿Cerrar año fiscal ${y.year}? Esta acción es irreversible.`)) return

    setClosing(y.year)
    const res = await fetch('/api/fiscal-year', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year: y.year }),
    })
    const data = await res.json()
    setClosing(null)

    if (!res.ok || !data.ok) {
      addToast('error', data.error ?? 'Error al cerrar año')
      return
    }
    addToast('success', `Año ${y.year} cerrado`)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Cierre Fiscal</h2>
          <p>Cierre contable por año</p>
        </div>
      </div>

      {years.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🗓️</div>
            <h3>Sin años fiscales</h3>
            <p>Crea facturas para ver años disponibles.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {years.map((y) => (
            <div key={y.year} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 700, letterSpacing: .5 }}>AÑO FISCAL</div>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -.5 }}>{y.year}</div>
                </div>
                <div>
                  {y.closed
                    ? <span className="badge badge-success">🔒 Cerrado</span>
                    : y.pendientes > 0
                      ? <span className="badge badge-warning">Pendiente</span>
                      : <span className="badge badge-info">Listo para cerrar</span>
                  }
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                <Stat label="Facturas" value={String(y.totalFacturas)} />
                <Stat label="Facturado" value={fmt(y.totalFacturado)} />
                <Stat label="Pendientes" value={String(y.pendientes)} danger={y.pendientes > 0} />
                {y.closed && y.closedAt ? (
                  <Stat label="Cerrado" value={fmtDate(y.closedAt)} />
                ) : (
                  <Stat label="Estado" value={y.pendientes > 0 ? 'Bloqueado' : 'Disponible'} />
                )}
              </div>

              {y.closed ? (
                <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--success-light)', borderRadius: 8, fontSize: 11.5, color: 'var(--success)' }}>
                  ✓ Cerrado por <strong>{y.closedBy}</strong>
                </div>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ marginTop: 14, width: '100%' }}
                  disabled={closing === y.year || y.pendientes > 0}
                  onClick={() => close(y)}
                >
                  {closing === y.year ? 'Cerrando…' : '🔒 Cerrar año fiscal'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={{ background: 'var(--gray-50)', padding: 10, borderRadius: 6 }}>
      <div style={{ fontSize: 10.5, color: 'var(--gray-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: danger ? 'var(--danger)' : 'var(--gray-900)', marginTop: 2 }}>{value}</div>
    </div>
  )
}
