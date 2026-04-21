/**
 * Seed de usuario admin para el tenant demo (gst-demo).
 * Crea el primer usuario ADMIN en la base de datos del tenant.
 *
 * Run: npx tsx prisma/seed.tenant.demo.ts
 */
import 'dotenv/config'
import bcrypt          from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg }    from '@prisma/adapter-pg'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌  DATABASE_URL no definida en .env')
  process.exit(1)
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
  log: ['error'],
})

async function main() {
  const email    = 'admin@gst-demo.com'
  const password = 'Admin2025!'
  const hash     = await bcrypt.hash(password, 10)

  // Permissions: full access
  const perms = Object.fromEntries(
    ['dashboard','edificios','facturas','facturacion','pagos','cartera',
     'cobros','reportes','gerencial','documentos','cierre','auditoria',
     'usuarios','config','ayuda'].map(m => [
      m, { view: true, create: true, edit: true, delete: true }
    ])
  )

  const user = await db.user.upsert({
    where:  { email },
    update: { passwordHash: hash, active: true, role: 'ADMIN', permissions: perms },
    create: {
      name:         'Admin Demo',
      email,
      passwordHash: hash,
      role:         'ADMIN',
      active:       true,
      permissions:  perms,
    },
  })

  console.log('')
  console.log('✅  Usuario admin del tenant demo creado/actualizado:')
  console.log(`   Email:      ${email}`)
  console.log(`   Contraseña: ${password}`)
  console.log(`   ID:         ${user.id}`)
  console.log('')
  console.log('🔗  Ingresa en: https://app-flame-five-99.vercel.app/login')
  console.log('')
}

main()
  .catch(e => { console.error('❌', e); process.exit(1) })
  .finally(() => db.$disconnect())
