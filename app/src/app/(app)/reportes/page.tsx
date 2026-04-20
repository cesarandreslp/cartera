import { prisma } from '@/lib/db'
import ReportesClient from './ReportesClient'

export const dynamic = 'force-dynamic'

type SP = { year?: string }

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const year = Number(sp.year) || new Date().getFullYear()

  const invoices = await prisma.invoice.findMany({
    where: { fiscalYear: year },
    include: {
      building: { select: { code: true, name: true } },
      payments: true,
    },
  })

  type MonthRow = { period: string; facturado: number; recaudado: number; pendiente: number; count: number }
  const months = new Map<string, MonthRow>()

  let facturadoYear = 0
  let recaudadoYear = 0
  let pendienteYear = 0

  type BuildingRow = { code: string; name: string; facturado: number; recaudado: number; pendiente: number; count: number }
  const byBuilding = new Map<string, BuildingRow>()

  for (const inv of invoices) {
    const pagado = inv.payments.reduce((s, p) => s + Number(p.amount), 0)
    const total = Number(inv.total)
    const saldo = inv.status === 'VOID' ? 0 : total - pagado

    facturadoYear += total
    recaudadoYear += pagado
    pendienteYear += saldo

    const key = inv.period
    const m = months.get(key) ?? { period: key, facturado: 0, recaudado: 0, pendiente: 0, count: 0 }
    m.facturado += total
    m.recaudado += pagado
    m.pendiente += saldo
    m.count += 1
    months.set(key, m)

    const bKey = inv.building.code
    const b = byBuilding.get(bKey) ?? { code: inv.building.code, name: inv.building.name, facturado: 0, recaudado: 0, pendiente: 0, count: 0 }
    b.facturado += total
    b.recaudado += pagado
    b.pendiente += saldo
    b.count += 1
    byBuilding.set(bKey, b)
  }

  const monthRows = [...months.values()].sort((a, b) => a.period.localeCompare(b.period))
  const buildingRows = [...byBuilding.values()].sort((a, b) => b.facturado - a.facturado)

  return (
    <ReportesClient
      year={year}
      totals={{ facturado: facturadoYear, recaudado: recaudadoYear, pendiente: pendienteYear, facturas: invoices.length }}
      monthly={monthRows}
      byBuilding={buildingRows}
    />
  )
}
