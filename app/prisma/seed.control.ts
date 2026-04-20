/**
 * Control Plane seed:
 * - Crea la cuenta SuperAdmin
 * - Crea un registro de tenant demo en el control plane
 *
 * Run: npx tsx prisma/seed.control.ts
 */
import 'dotenv/config'
import bcrypt    from 'bcryptjs'
import { PrismaClient } from '../src/generated/control/index.js'
import { PrismaPg }     from '@prisma/adapter-pg'

const url = process.env.CONTROL_DATABASE_URL
if (!url) {
  console.error('❌ CONTROL_DATABASE_URL no está configurada en .env')
  process.exit(1)
}

const controlDb = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
  log: ['error'],
})

async function main() {
  // ── 1. SuperAdmin ─────────────────────────────────────────────────────────
  const superEmail = process.env.SUPERADMIN_EMAIL ?? 'superadmin@gst.com.co'
  const superPass  = 'SuperAdmin2025!'
  const superHash  = await bcrypt.hash(superPass, 10)

  await controlDb.superAdmin.upsert({
    where:  { email: superEmail },
    update: { passwordHash: superHash, active: true },
    create: {
      name:         'Super Administrador',
      email:        superEmail,
      passwordHash: superHash,
      active:       true,
    },
  })

  console.log(`✅ SuperAdmin creado/actualizado`)
  console.log(`   Email:      ${superEmail}`)
  console.log(`   Contraseña: ${superPass}`)
  console.log(`   ⚠️  Cambia la contraseña en el primer inicio de sesión.`)
  console.log()

  // ── 2. Tenant demo ────────────────────────────────────────────────────────
  const demoSlug  = 'gst-demo'
  const demoDbUrl = process.env.DATABASE_URL ?? 'PLACEHOLDER_CONFIGURE_NEON'

  let encryptedUrl = demoDbUrl
  try {
    const { encrypt } = await import('../src/lib/crypto.js')
    encryptedUrl = encrypt(demoDbUrl)
  } catch {
    console.warn('   ⚠️  No se pudo cifrar la URL demo.')
  }

  const existing = await controlDb.tenant.findUnique({ where: { slug: demoSlug } })
  if (!existing) {
    await controlDb.tenant.create({
      data: {
        slug:        demoSlug,
        name:        'GST Demo S.A.S',
        nit:         '900000001-0',
        city:        'Bogotá',
        phone:       '+57 300 000 0000',
        email:       'demo@gst.com.co',
        databaseUrl: encryptedUrl,
        plan:        'PROFESSIONAL',
        active:      true,
        dianEnv:     'TEST',
      },
    })
    console.log(`✅ Tenant demo creado: ${demoSlug}.gst.com.co`)
  } else {
    console.log(`ℹ️  Tenant demo ya existe: ${demoSlug}`)
  }

  console.log()
  console.log('──────────────────────────────────────────')
  console.log('Próximos pasos:')
  console.log('  1. Accede a /superadmin con las credenciales anteriores')
  console.log('  2. Crea nuevos tenants desde el panel Superadmin')
  console.log('     (provisiona DB Neon automáticamente vía API)')
  console.log('──────────────────────────────────────────')
}

main()
  .catch(e => { console.error('❌', e); process.exit(1) })
  .finally(() => controlDb.$disconnect())
