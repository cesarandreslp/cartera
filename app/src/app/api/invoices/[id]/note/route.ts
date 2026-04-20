import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession } from '@/lib/api'
import { emitNote } from '@/lib/dian/emit'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

type Body = { type: 'CREDIT' | 'DEBIT'; reason: string }

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'facturacion', 'create')
  if (denied) return denied

  const { id } = await ctx.params
  const body = await readJson<Body>(req)
  if (isResponse(body)) return body

  if (!body.type || !body.reason) return fail('type y reason son obligatorios')
  if (body.type !== 'CREDIT' && body.type !== 'DEBIT') return fail('type debe ser CREDIT o DEBIT')

  try {
    const result = await emitNote(id, body.type, body.reason)
    await audit(session, 'facturacion', `note-${body.type.toLowerCase()}`, body.reason, id)
    return ok(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al emitir nota'
    return fail(msg, 422)
  }
}
