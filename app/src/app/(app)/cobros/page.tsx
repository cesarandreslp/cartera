import { prisma } from '@/lib/db'
import CobrosClient from './CobrosClient'

export const dynamic = 'force-dynamic'

export default async function CobrosPage() {
  const [buildings, runs] = await Promise.all([
    prisma.building.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.autoBillingRun.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { executedAt: 'desc' },
      take: 30,
    }),
  ])

  const runRows = runs.map((r) => ({
    id: r.id,
    executedAt: r.executedAt.toISOString(),
    period: r.period,
    totalSent: r.totalSent,
    totalErrors: r.totalErrors,
    mode: r.mode,
    userName: r.user.name,
  }))

  return <CobrosClient buildings={buildings} runs={runRows} />
}
