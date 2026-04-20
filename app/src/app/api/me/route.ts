import { isResponse, ok, requireSession } from '@/lib/api'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await requireSession()
  if (isResponse(session)) return session

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      active: true,
    },
  })

  return ok(user)
}
