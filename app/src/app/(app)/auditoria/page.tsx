import { prisma } from '@/lib/db'
import AuditoriaClient from './AuditoriaClient'

export const dynamic = 'force-dynamic'

type SP = { module?: string; userId?: string; from?: string; to?: string }

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const module = sp.module && sp.module !== '' ? sp.module : undefined
  const userId = sp.userId && sp.userId !== '' ? sp.userId : undefined
  const from = sp.from ? new Date(sp.from) : undefined
  const to = sp.to ? new Date(sp.to) : undefined

  const [logs, users] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        ...(module ? { module } : {}),
        ...(userId ? { userId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const rows = logs.map((l) => ({
    id: l.id,
    module: l.module,
    action: l.action,
    detail: l.detail,
    entityId: l.entityId,
    userName: l.user.name,
    userEmail: l.user.email,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <AuditoriaClient
      initial={rows}
      users={users}
      filters={{ module: module ?? '', userId: userId ?? '', from: sp.from ?? '', to: sp.to ?? '' }}
    />
  )
}
