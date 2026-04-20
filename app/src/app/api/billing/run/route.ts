import { prisma } from '@/lib/db'
import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession } from '@/lib/api'
import { emitInvoice } from '@/lib/dian/emit'
import type { NextRequest } from 'next/server'

type Body = {
  period: string
  buildingIds?: string[]
  emit?: boolean
  mode?: 'AUTO' | 'MANUAL'
}

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'cobros', 'create')
  if (denied) return denied

  const body = await readJson<Body>(req)
  if (isResponse(body)) return body

  if (!body.period || !/^\d{4}-\d{2}$/.test(body.period)) {
    return fail('period debe tener formato YYYY-MM')
  }

  const buildings = await prisma.building.findMany({
    where: {
      active: true,
      ...(body.buildingIds && body.buildingIds.length > 0 ? { id: { in: body.buildingIds } } : {}),
    },
  })

  const fiscalYear = Number(body.period.slice(0, 4))
  const results: Array<{ buildingCode: string; status: string; message?: string; invoiceId?: string }> = []
  let ok_count = 0
  let err_count = 0

  for (const b of buildings) {
    try {
      const exists = await prisma.invoice.findFirst({
        where: { buildingId: b.id, period: body.period, status: { not: 'VOID' } },
      })
      if (exists) {
        results.push({ buildingCode: b.code, status: 'skipped', message: 'Ya existe factura del período' })
        continue
      }

      const lastNumber = await prisma.invoice.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { number: true },
      })
      const seq = lastNumber ? (parseInt(lastNumber.number.replace(/\D/g, ''), 10) || 0) + 1 : 1
      const number = `FAC-${String(seq).padStart(4, '0')}`

      const subtotal = 1_500_000
      const tax = Math.round(subtotal * 0.19)
      const total = subtotal + tax

      const inv = await prisma.invoice.create({
        data: {
          number,
          buildingId: b.id,
          period: body.period,
          type: 'MASSIVE',
          concept: `Administración ${body.period}`,
          subtotal,
          discount: 0,
          mora: 0,
          tax,
          total,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 30 * 86_400_000),
          fiscalYear,
        },
      })

      if (body.emit) {
        await emitInvoice(inv.id)
      }

      results.push({ buildingCode: b.code, status: 'ok', invoiceId: inv.id })
      ok_count++
    } catch (e) {
      err_count++
      const msg = e instanceof Error ? e.message : 'Error'
      results.push({ buildingCode: b.code, status: 'error', message: msg })
    }
  }

  const run = await prisma.autoBillingRun.create({
    data: {
      executedBy: session.userId,
      period: body.period,
      totalSent: ok_count,
      totalErrors: err_count,
      result: results,
      mode: body.mode ?? 'MANUAL',
    },
  })

  await audit(session, 'cobros', 'run', `Período ${body.period}: ${ok_count} OK, ${err_count} error`, run.id)

  return ok({ runId: run.id, totalSent: ok_count, totalErrors: err_count, results })
}

export async function GET() {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'cobros', 'view')
  if (denied) return denied

  const runs = await prisma.autoBillingRun.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { executedAt: 'desc' },
    take: 50,
  })

  return ok(runs)
}
