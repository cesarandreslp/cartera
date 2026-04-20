import { prisma } from '@/lib/db'
import ConfigClient from './ConfigClient'

export const dynamic = 'force-dynamic'

export default async function ConfigPage() {
  const entries = await prisma.systemConfig.findMany()
  const config: Record<string, any> = {}
  for (const e of entries) config[e.key] = e.value

  return <ConfigClient initial={config} />
}
