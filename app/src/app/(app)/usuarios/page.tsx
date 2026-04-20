import { prisma } from '@/lib/db'
import UsuariosClient from './UsuariosClient'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, active: true, createdAt: true,
    },
    orderBy: { name: 'asc' },
  })

  const rows = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }))

  return <UsuariosClient initial={rows} />
}
