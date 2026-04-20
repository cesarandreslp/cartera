import { audit, fail, isResponse, ok, requirePerm, requireSession } from '@/lib/api'
import { emitInvoice } from '@/lib/dian/emit'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'facturacion', 'create')
  if (denied) return denied

  const { id } = await ctx.params

  try {
    const result = await emitInvoice(id)
    await audit(session, 'facturacion', 'emit', `CUFE ${result.cufe.slice(0, 16)}…`, id)
    return ok(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al emitir'
    return fail(msg, 422)
  }
}
