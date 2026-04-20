import { prisma } from '@/lib/db'
import FacturacionClient from './FacturacionClient'

export const dynamic = 'force-dynamic'

export default async function FacturacionPage() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: 'VOID' } },
    include: {
      building: { select: { code: true, name: true } },
      feDocument: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const rows = invoices.map((i) => ({
    id: i.id,
    number: i.number,
    buildingCode: i.building.code,
    buildingName: i.building.name,
    period: i.period,
    total: Number(i.total),
    type: i.type,
    dianStatus: i.feDocument?.dianStatus ?? null,
    cufe: i.feDocument?.cufe ?? null,
    signedAt: i.feDocument?.signedAt?.toISOString() ?? null,
    feDocId: i.feDocument?.id ?? null,
  }))

  const kpis = {
    emitidas: rows.filter((r) => r.dianStatus === 'ACCEPTED' || r.dianStatus === 'SENT').length,
    pendientes: rows.filter((r) => !r.dianStatus).length,
    firmadas: rows.filter((r) => r.dianStatus === 'SIGNED').length,
    rechazadas: rows.filter((r) => r.dianStatus === 'REJECTED').length,
  }

  return <FacturacionClient rows={rows} kpis={kpis} />
}
