import { prisma } from '@/lib/db'
import { fmt } from '@/lib/utils'
import EdificiosClient from './EdificiosClient'

export const dynamic = 'force-dynamic'

export default async function EdificiosPage() {
  const buildings = await prisma.building.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { invoices: true } },
      invoices: { select: { total: true, payments: { select: { amount: true } } } },
    },
  })

  const rows = buildings.map((b) => {
    let pendiente = 0
    for (const inv of b.invoices) {
      const pagado = inv.payments.reduce((s, p) => s + Number(p.amount), 0)
      pendiente += Number(inv.total) - pagado
    }
    return {
      id: b.id,
      code: b.code,
      name: b.name,
      nit: b.nit,
      city: b.city,
      contact: b.contact,
      phone: b.phone,
      email: b.email,
      active: b.active,
      invoiceCount: b._count.invoices,
      saldo: pendiente,
      saldoFmt: fmt(pendiente),
    }
  })

  return <EdificiosClient initial={rows} />
}
