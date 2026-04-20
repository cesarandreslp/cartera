import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession, getDb } from '@/lib/api'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'

export async function GET() {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'config', 'view')
  if (denied) return denied

  const db      = await getDb(await headers())
  const entries = await db.systemConfig.findMany()
  const config: Record<string, unknown> = {}
  for (const e of entries) config[e.key] = e.value
  return ok(config)
}

type UpdateBody = Record<string, unknown>

export async function PUT(req: NextRequest) {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'config', 'edit')
  if (denied) return denied

  const db   = await getDb(await headers())
  const body = await readJson<UpdateBody>(req)
  if (isResponse(body)) return body

  const updates = Object.entries(body)
  for (const [key, value] of updates) {
    await db.systemConfig.upsert({
      where:  { key },
      update: { value: value as any },
      create: { key, value: value as any },
    })
  }

  await audit(session, db, 'config', 'update', `${updates.length} claves`)
  return ok({ updated: updates.length })
}
