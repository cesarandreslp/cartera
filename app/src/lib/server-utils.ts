/**
 * Server-only utilities — DB access and auth helpers.
 * DO NOT import this from Client Components.
 */
import 'server-only'
import { prisma } from '@/lib/db'
import { auth }   from '@/lib/auth'
import type { Module } from '@/lib/utils'

export async function logAction(
  userId: string,
  module: Module,
  action: string,
  detail?: string,
  entityId?: string
) {
  await prisma.auditLog.create({
    data: { userId, module, action, detail, entityId },
  })
}

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('No autenticado')
  }
  return session
}
