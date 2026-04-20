import { prisma } from '@/lib/db'
import { audit, fail, isResponse, ok, requirePerm, requireSession } from '@/lib/api'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'pagos', 'view')
  if (denied) return denied

  const { id } = await ctx.params
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      invoice: { include: { building: { select: { id: true, code: true, name: true } } } },
      user: { select: { id: true, name: true } },
    },
  })
  if (!payment) return fail('No encontrado', 404)

  return ok(payment)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'pagos', 'delete')
  if (denied) return denied

  const { id } = await ctx.params
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { invoice: { include: { payments: true } } },
  })
  if (!payment) return fail('No encontrado', 404)

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } })

    const remaining = payment.invoice.payments
      .filter((p) => p.id !== id)
      .reduce((s, p) => s + Number(p.amount), 0)

    const newStatus =
      remaining <= 0
        ? 'PENDING'
        : remaining + 0.01 >= Number(payment.invoice.total)
          ? 'PAID'
          : 'PARTIAL'

    if (newStatus !== payment.invoice.status) {
      await tx.invoice.update({ where: { id: payment.invoiceId }, data: { status: newStatus } })
    }
  })

  await audit(
    session,
    'pagos',
    'delete',
    `Pago ${payment.amount} de factura ${payment.invoice.number}`,
    id,
  )

  return ok({ id, deleted: true })
}
