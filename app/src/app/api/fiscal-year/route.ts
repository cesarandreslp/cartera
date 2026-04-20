import { prisma } from '@/lib/db'
import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession } from '@/lib/api'
import type { NextRequest } from 'next/server'

export async function GET() {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'cierre', 'view')
  if (denied) return denied

  const years = await prisma.fiscalYear.findMany({
    include: { closedBy: { select: { name: true, email: true } } },
    orderBy: { year: 'desc' },
  })
  return ok(years)
}

type CloseBody = { year: number }

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'cierre', 'create')
  if (denied) return denied

  const body = await readJson<CloseBody>(req)
  if (isResponse(body)) return body

  const year = Number(body.year)
  if (!year || year < 2000 || year > 2100) return fail('Año inválido')

  const existing = await prisma.fiscalYear.findUnique({ where: { year } })
  if (existing) return fail('Este año ya está cerrado', 409)

  const pending = await prisma.invoice.count({
    where: {
      fiscalYear: year,
      status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    },
  })
  if (pending > 0) {
    return fail(`No se puede cerrar: existen ${pending} facturas sin pagar en ${year}`, 422)
  }

  const invoices = await prisma.invoice.findMany({
    where: { fiscalYear: year },
    include: { payments: { select: { amount: true } } },
  })

  let facturado = 0
  let recaudado = 0
  for (const inv of invoices) {
    facturado += Number(inv.total)
    recaudado += inv.payments.reduce((s, p) => s + Number(p.amount), 0)
  }

  const closed = await prisma.fiscalYear.create({
    data: {
      year,
      closedAt: new Date(),
      closedById: session.userId,
      summary: {
        totalInvoices: invoices.length,
        totalFacturado: facturado,
        totalRecaudado: recaudado,
      },
    },
  })

  await audit(session, 'cierre', 'close', `Cierre año ${year}`, closed.id)

  return ok(closed)
}
