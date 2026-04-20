import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession, getDb } from '@/lib/api'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { InvoiceStatus, InvoiceType } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'facturas', 'view')
  if (denied) return denied

  const db = await getDb(await headers())
  const sp = req.nextUrl.searchParams
  const buildingId = sp.get('buildingId') ?? undefined
  const period     = sp.get('period')     ?? undefined
  const status     = (sp.get('status') as InvoiceStatus | null) ?? undefined
  const fiscalYear = sp.get('fiscalYear')
  const q          = sp.get('q')?.trim()

  const invoices = await db.invoice.findMany({
    where: {
      ...(buildingId ? { buildingId } : {}),
      ...(period     ? { period }     : {}),
      ...(status     ? { status }     : {}),
      ...(fiscalYear ? { fiscalYear: Number(fiscalYear) } : {}),
      ...(q ? { OR: [
        { number:  { contains: q, mode: 'insensitive' } },
        { concept: { contains: q, mode: 'insensitive' } },
      ]} : {}),
    },
    include: { building: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return ok(invoices)
}

type CreateInvoiceBody = {
  number: string; buildingId: string; period: string
  type?: InvoiceType; concept?: string
  subtotal: number | string; discount?: number | string
  mora?: number | string; tax?: number | string
  dueDate?: string; notes?: string; fiscalYear?: number
}

function toNum(v: number | string | undefined, def = 0): number {
  if (v === undefined || v === null || v === '') return def
  return Number(v)
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'facturas', 'create')
  if (denied) return denied

  const db   = await getDb(await headers())
  const body = await readJson<CreateInvoiceBody>(req)
  if (isResponse(body)) return body

  if (!body.number || !body.buildingId || !body.period || body.subtotal == null) {
    return fail('number, buildingId, period y subtotal son obligatorios')
  }

  const building = await db.building.findUnique({ where: { id: body.buildingId } })
  if (!building) return fail('Edificio no existe', 404)

  const dup = await db.invoice.findUnique({ where: { number: body.number } })
  if (dup) return fail('Número de factura ya existe', 409)

  const subtotal = toNum(body.subtotal)
  const discount = toNum(body.discount)
  const mora     = toNum(body.mora)
  const tax      = toNum(body.tax)
  const total    = subtotal - discount + mora + tax

  const invoice = await db.invoice.create({
    data: {
      number: body.number, buildingId: body.buildingId, period: body.period,
      type: body.type ?? 'MANUAL', concept: body.concept,
      subtotal, discount, mora, tax, total,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      notes: body.notes,
      fiscalYear: body.fiscalYear ?? new Date().getFullYear(),
    },
  })

  await audit(session, db, 'facturas', 'create', `Factura ${invoice.number}`, invoice.id)
  return ok(invoice)
}
