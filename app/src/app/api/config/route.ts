import { prisma } from '@/lib/db'
import { audit, fail, isResponse, ok, readJson, requirePerm, requireSession } from '@/lib/api'
import type { NextRequest } from 'next/server'

export async function GET() {
  const session = await requireSession()
  if (isResponse(session)) return session
  const denied = requirePerm(session, 'config', 'view')
  if (denied) return denied

  const entries = await prisma.systemConfig.findMany()
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

  const body = await readJson<UpdateBody>(req)
  if (isResponse(body)) return body

  const updates = Object.entries(body)
  for (const [key, value] of updates) {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    })
  }

  await audit(session, 'config', 'update', `${updates.length} claves`)

  return ok({ updated: updates.length })
}
