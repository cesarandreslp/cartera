import { prisma } from '@/lib/db'
import { fmt, fmtDate } from '@/lib/utils'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Bucket = '0-30' | '31-60' | '61-90' | '90+' | 'VIG'

function bucketFor(dueDate: Date | null): Bucket {
  if (!dueDate) return 'VIG'
  const days = Math.floor((Date.now() - dueDate.getTime()) / 86_400_000)
  if (days <= 0) return 'VIG'
  if (days <= 30) return '0-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}

export default async function CarteraPage() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
    include: {
      building: { select: { id: true, code: true, name: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  const buckets: Record<Bucket, number> = { VIG: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  const byBuilding = new Map<string, { code: string; name: string; saldo: number; facturas: number }>()

  type RowOut = {
    id: string
    number: string
    buildingCode: string
    buildingName: string
    period: string
    dueDate: string | null
    saldo: number
    bucket: Bucket
    dias: number
  }

  const rows: RowOut[] = []

  for (const inv of invoices) {
    const pagado = inv.payments.reduce((s, p) => s + Number(p.amount), 0)
    const saldo = Number(inv.total) - pagado
    if (saldo <= 0.009) continue

    const b = bucketFor(inv.dueDate)
    buckets[b] += saldo

    const key = inv.building.id
    const prev = byBuilding.get(key) ?? { code: inv.building.code, name: inv.building.name, saldo: 0, facturas: 0 }
    prev.saldo += saldo
    prev.facturas += 1
    byBuilding.set(key, prev)

    const dias = inv.dueDate ? Math.max(0, Math.floor((Date.now() - inv.dueDate.getTime()) / 86_400_000)) : 0

    rows.push({
      id: inv.id,
      number: inv.number,
      buildingCode: inv.building.code,
      buildingName: inv.building.name,
      period: inv.period,
      dueDate: inv.dueDate?.toISOString() ?? null,
      saldo,
      bucket: b,
      dias,
    })
  }

  const total = Object.values(buckets).reduce((s, v) => s + v, 0)

  const buildingRows = [...byBuilding.values()].sort((a, b) => b.saldo - a.saldo)

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Cartera</h2>
          <p>Aging de saldos · Total {fmt(total)}</p>
        </div>
      </div>

      <div className="aging-grid" style={{ marginBottom: 20 }}>
        <AgingCell label="Vigente" value={buckets.VIG} klass="c0" />
        <AgingCell label="1 a 30 días" value={buckets['0-30']} klass="c30" />
        <AgingCell label="31 a 60 días" value={buckets['31-60']} klass="c60" />
        <AgingCell label="61 a 90 días" value={buckets['61-90']} klass="c90" />
        <AgingCell label="Total" value={total} klass="ctot" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Facturas con saldo</div>
              <div className="card-sub">{rows.length} documentos abiertos</div>
            </div>
          </div>
          <div className="tbl-wrap">
            {rows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <h3>Cartera al día</h3>
                <p>No hay saldos pendientes.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Edificio</th>
                    <th>Período</th>
                    <th>Vence</th>
                    <th>Días</th>
                    <th>Saldo</th>
                    <th>Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/facturas?year=${new Date().getFullYear()}`}><strong>{r.number}</strong></Link></td>
                      <td>{r.buildingCode} · {r.buildingName}</td>
                      <td>{r.period}</td>
                      <td>{fmtDate(r.dueDate)}</td>
                      <td>{r.dias > 0 ? r.dias : '—'}</td>
                      <td><strong>{fmt(r.saldo)}</strong></td>
                      <td><span className={`badge ${bucketBadge(r.bucket)}`}>{r.bucket}</span></td>
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
              <div className="card-title">Por edificio</div>
              <div className="card-sub">Saldo agrupado</div>
            </div>
          </div>
          <div className="tbl-wrap">
            {buildingRows.length === 0 ? (
              <div className="empty-state"><p>Sin datos</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Edificio</th>
                    <th>Fact.</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {buildingRows.map((b) => (
                    <tr key={b.code}>
                      <td><strong>{b.code}</strong><br /><span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{b.name}</span></td>
                      <td>{b.facturas}</td>
                      <td><strong>{fmt(b.saldo)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function AgingCell({ label, value, klass }: { label: string; value: number; klass: string }) {
  return (
    <div className={`aging-cell ${klass}`}>
      <div className="aging-label">{label}</div>
      <div className="aging-value">{fmt(value)}</div>
    </div>
  )
}

function bucketBadge(b: Bucket): string {
  switch (b) {
    case 'VIG': return 'badge-success'
    case '0-30': return 'badge-warning'
    case '31-60': return 'badge-warning'
    case '61-90': return 'badge-danger'
    case '90+': return 'badge-danger'
  }
}
