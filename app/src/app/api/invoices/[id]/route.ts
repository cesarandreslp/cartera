import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession, getDb } from '@/lib/api'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { InvoiceStatus } from '@prisma/client'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'facturas', 'view')
  if (denied) return denied

  const db     = await getDb(await headers())
  const { id } = await ctx.params
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { building: true, payments: { orderBy: { date: 'desc' } }, feDocument: true },
  })
  if (!invoice) return fail('No encontrada', 404)
  return ok(invoice)
}

type UpdateBody = Partial<{
  concept: string; subtotal: number | string; discount: number | string
  mora: number | string; tax: number | string; dueDate: string | null
  notes: string; status: InvoiceStatus
}>

function toNum(v: number | string | undefined | null, def = 0): number {
  if (v === undefined || v === null || v === '') return def
  return Number(v)
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'facturas', 'edit')
  if (denied) return denied

  const db      = await getDb(await headers())
  const { id }  = await ctx.params
  const current = await db.invoice.findUnique({ where: { id } })
  if (!current) return fail('No encontrada', 404)
  if (current.status === 'VOID') return fail('Factura anulada', 409)

  const body = await readJson<UpdateBody>(req)
  if (isResponse(body)) return body

  const subtotal = body.subtotal !== undefined ? toNum(body.subtotal) : Number(current.subtotal)
  const discount = body.discount !== undefined ? toNum(body.discount) : Number(current.discount)
  const mora     = body.mora     !== undefined ? toNum(body.mora)     : Number(current.mora)
  const tax      = body.tax      !== undefined ? toNum(body.tax)      : Number(current.tax)
  const total    = subtotal - discount + mora + tax

  const invoice = await db.invoice.update({
    where: { id },
    data: {
      concept: body.concept ?? current.concept, subtotal, discount, mora, tax, total,
      dueDate: body.dueDate === null ? null : body.dueDate ? new Date(body.dueDate) : current.dueDate,
      notes: body.notes ?? current.notes, status: body.status ?? current.status,
    },
  })
  await audit(session, db, 'facturas', 'update', `Factura ${invoice.number}`, invoice.id)
  return ok(invoice)
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'facturas', 'delete')
  if (denied) return denied

  const db      = await getDb(await headers())
  const { id }  = await ctx.params
  const current = await db.invoice.findUnique({
    where: { id },
    include: { _count: { select: { payments: true } } },
  })
  if (!current) return fail('No encontrada', 404)

  if (current._count.payments > 0) {
    const invoice = await db.invoice.update({ where: { id }, data: { status: 'VOID' } })
    await audit(session, db, 'facturas', 'void', `Factura ${invoice.number}`, invoice.id)
    return ok({ ...invoice, voided: true })
  }

  await db.invoice.delete({ where: { id } })
  await audit(session, db, 'facturas', 'delete', `Factura ${current.number}`, id)
  return ok({ id, deleted: true })
}
