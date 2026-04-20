import { prisma } from '@/lib/db'
import { fmt, fmtDate } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function loadDashboard(year: number) {
  const invoices = await prisma.invoice.findMany({
    where: { fiscalYear: year },
    include: {
      payments: true,
      building: { select: { id: true, code: true, name: true } },
    },
  })

  let totalFacturado = 0
  let totalRecaudado = 0
  let totalPendiente = 0
  let totalMora = 0
  let facturasPendientes = 0

  for (const inv of invoices) {
    const pagado = inv.payments.reduce((s, p) => s + Number(p.amount), 0)
    const total = Number(inv.total)
    totalFacturado += total
    totalRecaudado += pagado
    const saldo = total - pagado
    if (saldo > 0 && inv.status !== 'VOID') {
      totalPendiente += saldo
      facturasPendientes++
      totalMora += Number(inv.mora)
    }
  }

  const pendientes = invoices
    .filter((i) => i.status !== 'VOID' && i.status !== 'PAID')
    .map((i) => {
      const pagado = i.payments.reduce((s, p) => s + Number(p.amount), 0)
      return {
        id: i.id,
        number: i.number,
        period: i.period,
        dueDate: i.dueDate,
        total: Number(i.total),
        saldo: Number(i.total) - pagado,
        mora: Number(i.mora),
        status: i.status,
        buildingCode: i.building.code,
        buildingName: i.building.name,
      }
    })
    .sort((a, b) => b.mora - a.mora || b.saldo - a.saldo)
    .slice(0, 10)

  return {
    kpis: {
      totalFacturado,
      totalRecaudado,
      totalPendiente,
      totalMora,
      facturasPendientes,
    },
    pendientes,
  }
}

type SP = { year?: string }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const year = Number(sp.year) || new Date().getFullYear()
  const { kpis, pendientes } = await loadDashboard(year)

  const cobranza =
    kpis.totalFacturado > 0 ? (kpis.totalRecaudado / kpis.totalFacturado) * 100 : 0

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Dashboard</h2>
          <p>Resumen ejecutivo · Año fiscal {year}</p>
        </div>
        <div className="page-header-right">
          <Link href="/facturas" className="btn btn-primary">+ Nueva factura</Link>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI label="Total facturado" value={fmt(kpis.totalFacturado)} icon="📄" tint="var(--primary-light)" />
        <KPI label="Total recaudado" value={fmt(kpis.totalRecaudado)} icon="💰" tint="var(--success-light)" sub={`${cobranza.toFixed(1)}% efectividad`} />
        <KPI label="Cartera pendiente" value={fmt(kpis.totalPendiente)} icon="📋" tint="var(--warning-light)" sub={`${kpis.facturasPendientes} facturas`} />
        <KPI label="Mora acumulada" value={fmt(kpis.totalMora)} icon="⚠️" tint="var(--danger-light)" />
        <KPI label="Año fiscal" value={String(year)} icon="🗓️" tint="var(--info-light)" />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Facturas pendientes</div>
            <div className="card-sub">Top 10 ordenadas por mora y saldo</div>
          </div>
          <Link href="/cartera" className="btn btn-outline btn-sm">Ver todas</Link>
        </div>
        <div className="tbl-wrap">
          {pendientes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <h3>Sin facturas pendientes</h3>
              <p>No hay saldos abiertos para el año {year}.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Edificio</th>
                  <th>Factura</th>
                  <th>Período</th>
                  <th>Vence</th>
                  <th>Total</th>
                  <th>Saldo</th>
                  <th>Mora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.buildingCode}</strong> · {p.buildingName}</td>
                    <td>{p.number}</td>
                    <td>{p.period}</td>
                    <td>{fmtDate(p.dueDate)}</td>
                    <td>{fmt(p.total)}</td>
                    <td><strong>{fmt(p.saldo)}</strong></td>
                    <td>{p.mora > 0 ? fmt(p.mora) : '—'}</td>
                    <td>
                      <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
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

function KPI({
  label,
  value,
  icon,
  tint,
  sub,
}: {
  label: string
  value: string
  icon: string
  tint: string
  sub?: string
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: tint }}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
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
