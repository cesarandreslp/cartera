import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession, getDb } from '@/lib/api'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { PaymentMethod } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'pagos', 'view')
  if (denied) return denied

  const db = await getDb(await headers())
  const sp = req.nextUrl.searchParams
  const invoiceId = sp.get('invoiceId') ?? undefined
  const from      = sp.get('from')
  const to        = sp.get('to')

  const payments = await db.payment.findMany({
    where: {
      ...(invoiceId ? { invoiceId } : {}),
      ...(from || to ? { date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to   ? { lte: new Date(to)   } : {}),
      }} : {}),
    },
    include: {
      invoice: { select: { id: true, number: true, total: true, buildingId: true } },
      user:    { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: 200,
  })
  return ok(payments)
}

type CreatePaymentBody = {
  invoiceId: string; amount: number | string; date?: string
  method?: PaymentMethod; reference?: string; notes?: string; receiptNum?: string
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'pagos', 'create')
  if (denied) return denied

  const db   = await getDb(await headers())
  const body = await readJson<CreatePaymentBody>(req)
  if (isResponse(body)) return body

  if (!body.invoiceId || body.amount == null) return fail('invoiceId y amount son obligatorios')
  const amount = Number(body.amount)
  if (!(amount > 0)) return fail('amount debe ser mayor a 0')

  const invoice = await db.invoice.findUnique({
    where: { id: body.invoiceId },
    include: { payments: true },
  })
  if (!invoice) return fail('Factura no existe', 404)
  if (invoice.status === 'VOID') return fail('Factura anulada', 409)

  const paid    = invoice.payments.reduce((s, p) => s + Number(p.amount), 0)
  const pending = Number(invoice.total) - paid
  if (amount > pending + 0.01) {
    return fail(`El pago excede el saldo pendiente (${pending.toFixed(2)})`, 422)
  }

  const result = await db.$transaction(async (tx: any) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId: body.invoiceId, userId: session.userId, amount,
        date: body.date ? new Date(body.date) : new Date(),
        method: body.method ?? 'TRANSFER',
        reference: body.reference, notes: body.notes, receiptNum: body.receiptNum,
      },
    })

    const newPaid   = paid + amount
    const newStatus = newPaid + 0.01 >= Number(invoice.total) ? 'PAID'
                    : newPaid > 0 ? 'PARTIAL' : invoice.status
    if (newStatus !== invoice.status) {
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: newStatus } })
    }
    return payment
  })

  await audit(session, db, 'pagos', 'create', `Pago ${amount} en factura ${invoice.number}`, result.id)
  return ok(result)
}
