import { prisma } from '@/lib/db'
import PagosClient from './PagosClient'

export const dynamic = 'force-dynamic'

export default async function PagosPage() {
  const [recent, pending] = await Promise.all([
    prisma.payment.findMany({
      include: {
        invoice: {
          include: { building: { select: { id: true, code: true, name: true } } },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    prisma.invoice.findMany({
      where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
      include: {
        building: { select: { code: true, name: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
  ])

  const pendingRows = pending
    .map((i) => {
      const pagado = i.payments.reduce((s, p) => s + Number(p.amount), 0)
      const saldo = Number(i.total) - pagado
      return {
        id: i.id,
        number: i.number,
        buildingCode: i.building.code,
        buildingName: i.building.name,
        period: i.period,
        total: Number(i.total),
        saldo,
      }
    })
    .filter((r) => r.saldo > 0.009)

  const recentRows = recent.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    date: p.date.toISOString(),
    method: p.method,
    reference: p.reference,
    invoiceNumber: p.invoice.number,
    buildingCode: p.invoice.building.code,
    buildingName: p.invoice.building.name,
    userName: p.user.name,
  }))

  return <PagosClient pending={pendingRows} recent={recentRows} />
}
