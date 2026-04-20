import { prisma } from '@/lib/db'
import FacturasClient from './FacturasClient'

export const dynamic = 'force-dynamic'

type SP = { year?: string; status?: string; buildingId?: string }

export default async function FacturasPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const year = Number(sp.year) || new Date().getFullYear()
  const status = sp.status && sp.status !== '' ? sp.status : undefined
  const buildingId = sp.buildingId && sp.buildingId !== '' ? sp.buildingId : undefined

  const [invoices, buildings] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        fiscalYear: year,
        ...(status ? { status: status as any } : {}),
        ...(buildingId ? { buildingId } : {}),
      },
      include: {
        building: { select: { id: true, code: true, name: true } },
        payments: { select: { amount: true } },
        feDocument: { select: { dianStatus: true, pdfUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.building.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const rows = invoices.map((i) => {
    const pagado = i.payments.reduce((s, p) => s + Number(p.amount), 0)
    const total = Number(i.total)
    return {
      id: i.id,
      number: i.number,
      type: i.type,
      buildingCode: i.building.code,
      buildingName: i.building.name,
      period: i.period,
      concept: i.concept,
      total,
      saldo: total - pagado,
      status: i.status,
      dianStatus: i.feDocument?.dianStatus ?? null,
      createdAt: i.createdAt.toISOString(),
      dueDate: i.dueDate?.toISOString() ?? null,
      documentUrl: i.documentUrl ?? i.feDocument?.pdfUrl ?? null,
    }
  })

  return (
    <FacturasClient
      initial={rows}
      buildings={buildings}
      filters={{ year, status: status ?? '', buildingId: buildingId ?? '' }}
    />
  )
}
