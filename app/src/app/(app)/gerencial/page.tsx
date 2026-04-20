import { prisma } from '@/lib/db'
import { fmt } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function GerencialPage() {
  const year = new Date().getFullYear()
  const invoices = await prisma.invoice.findMany({
    where: { fiscalYear: year },
    include: { payments: true, building: { select: { code: true, name: true } } },
  })

  let facturado = 0
  let recaudado = 0
  let mora = 0
  let pendiente = 0

  const byMonth = new Map<string, { facturado: number; recaudado: number }>()
  const byBuilding = new Map<string, { name: string; pendiente: number; facturado: number }>()

  for (const inv of invoices) {
    const pagado = inv.payments.reduce((s, p) => s + Number(p.amount), 0)
    const total = Number(inv.total)
    const saldo = inv.status === 'VOID' ? 0 : total - pagado

    facturado += total
    recaudado += pagado
    pendiente += saldo
    mora += Number(inv.mora)

    const m = byMonth.get(inv.period) ?? { facturado: 0, recaudado: 0 }
    m.facturado += total
    m.recaudado += pagado
    byMonth.set(inv.period, m)

    const b = byBuilding.get(inv.building.code) ?? { name: inv.building.name, pendiente: 0, facturado: 0 }
    b.pendiente += saldo
    b.facturado += total
    byBuilding.set(inv.building.code, b)
  }

  const efectividad = facturado > 0 ? (recaudado / facturado) * 100 : 0
  const topPendiente = [...byBuilding.entries()]
    .sort((a, b) => b[1].pendiente - a[1].pendiente)
    .slice(0, 5)

  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const lastMonth = months[months.length - 1]?.[1]
  const prevMonth = months[months.length - 2]?.[1]
  const tendenciaFact = lastMonth && prevMonth && prevMonth.facturado > 0
    ? ((lastMonth.facturado - prevMonth.facturado) / prevMonth.facturado) * 100
    : 0
  const tendenciaRec = lastMonth && prevMonth && prevMonth.recaudado > 0
    ? ((lastMonth.recaudado - prevMonth.recaudado) / prevMonth.recaudado) * 100
    : 0

  const [totalClientes, clientesActivos] = await Promise.all([
    prisma.building.count(),
    prisma.building.count({ where: { active: true } }),
  ])

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Vista Gerencial</h2>
          <p>Indicadores ejecutivos · Año {year}</p>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI label="Efectividad de cobro" value={`${efectividad.toFixed(1)}%`}
          icon="🎯" tint="var(--primary-light)"
          sub={efectividad >= 85 ? 'Excelente' : efectividad >= 70 ? 'Aceptable' : 'Requiere atención'} />
        <KPI label="Recaudo último mes" value={fmt(lastMonth?.recaudado ?? 0)}
          icon="💰" tint="var(--success-light)"
          sub={tendenciaRec ? `${tendenciaRec >= 0 ? '▲' : '▼'} ${Math.abs(tendenciaRec).toFixed(1)}% vs mes previo` : undefined} />
        <KPI label="Facturación último mes" value={fmt(lastMonth?.facturado ?? 0)}
          icon="📈" tint="var(--info-light)"
          sub={tendenciaFact ? `${tendenciaFact >= 0 ? '▲' : '▼'} ${Math.abs(tendenciaFact).toFixed(1)}% vs mes previo` : undefined} />
        <KPI label="Cartera vencida" value={fmt(pendiente)}
          icon="⚠️" tint="var(--danger-light)"
          sub={`Mora ${fmt(mora)}`} />
        <KPI label="Clientes activos" value={`${clientesActivos}/${totalClientes}`}
          icon="🏢" tint="var(--purple-light)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top 5 edificios por cartera</div>
              <div className="card-sub">Mayor saldo pendiente</div>
            </div>
          </div>
          <div className="tbl-wrap">
            {topPendiente.length === 0 ? (
              <div className="empty-state"><p>Sin datos</p></div>
            ) : (
              <table>
                <thead>
                  <tr><th>Edificio</th><th>Facturado</th><th>Pendiente</th></tr>
                </thead>
                <tbody>
                  {topPendiente.map(([code, d]) => (
                    <tr key={code}>
                      <td><strong>{code}</strong> · {d.name}</td>
                      <td>{fmt(d.facturado)}</td>
                      <td><strong style={{ color: 'var(--danger)' }}>{fmt(d.pendiente)}</strong></td>
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
              <div className="card-title">Evolución mensual</div>
              <div className="card-sub">Facturado vs recaudado</div>
            </div>
          </div>
          <div className="card-body">
            {months.length === 0 ? (
              <div className="empty-state"><p>Sin datos</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {months.map(([period, d]) => {
                  const ef = d.facturado > 0 ? (d.recaudado / d.facturado) * 100 : 0
                  return (
                    <div key={period} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: 'var(--gray-50)', borderRadius: 6 }}>
                      <strong>{period}</strong>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                        <span>Fact: <strong>{fmt(d.facturado)}</strong></span>
                        <span>Rec: <strong style={{ color: 'var(--success)' }}>{fmt(d.recaudado)}</strong></span>
                        <span className={`badge ${ef >= 85 ? 'badge-success' : ef >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                          {ef.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function KPI({ label, value, icon, tint, sub }: { label: string; value: string; icon: string; tint: string; sub?: string }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: tint }}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
