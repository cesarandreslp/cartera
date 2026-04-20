import { prisma } from '@/lib/db'
import CierreClient from './CierreClient'

export const dynamic = 'force-dynamic'

export default async function CierrePage() {
  const [closed, all] = await Promise.all([
    prisma.fiscalYear.findMany({
      include: { closedBy: { select: { name: true, email: true } } },
      orderBy: { year: 'desc' },
    }),
    prisma.invoice.groupBy({
      by: ['fiscalYear', 'status'],
      _count: { _all: true },
      _sum: { total: true },
    }),
  ])

  type YearSummary = {
    year: number
    totalFacturas: number
    totalFacturado: number
    pendientes: number
    closed: boolean
    closedAt: string | null
    closedBy: string | null
  }

  const byYear = new Map<number, YearSummary>()

  for (const g of all) {
    const entry = byYear.get(g.fiscalYear) ?? {
      year: g.fiscalYear,
      totalFacturas: 0,
      totalFacturado: 0,
      pendientes: 0,
      closed: false,
      closedAt: null,
      closedBy: null,
    }
    entry.totalFacturas += g._count._all
    entry.totalFacturado += Number(g._sum.total ?? 0)
    if (g.status === 'PENDING' || g.status === 'PARTIAL' || g.status === 'OVERDUE') {
      entry.pendientes += g._count._all
    }
    byYear.set(g.fiscalYear, entry)
  }

  for (const c of closed) {
    const entry = byYear.get(c.year) ?? {
      year: c.year,
      totalFacturas: 0,
      totalFacturado: 0,
      pendientes: 0,
      closed: false,
      closedAt: null,
      closedBy: null,
    }
    entry.closed = true
    entry.closedAt = c.closedAt.toISOString()
    entry.closedBy = c.closedBy.name
    byYear.set(c.year, entry)
  }

  const rows = [...byYear.values()].sort((a, b) => b.year - a.year)

  return <CierreClient years={rows} />
}
