/**
 * Provisiona una base de datos Neon real para el tenant gst-demo
 * y crea el primer usuario admin en ella.
 *
 * Run: $env:NEON_API_KEY="..."; $env:ENCRYPTION_KEY="..."; $env:CONTROL_DATABASE_URL="..."; npx tsx prisma/provision.demo.ts
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient as ControlClient } from '../src/generated/control/index.js'
import { PrismaClient as TenantClient }  from '@prisma/client'
import { PrismaPg }                      from '@prisma/adapter-pg'

const NEON_API_KEY      = process.env.NEON_API_KEY!
const ENCRYPTION_KEY    = process.env.ENCRYPTION_KEY!
const CONTROL_DB_URL    = process.env.CONTROL_DATABASE_URL!

if (!NEON_API_KEY || !ENCRYPTION_KEY || !CONTROL_DB_URL) {
  console.error('❌ Faltan vars: NEON_API_KEY, ENCRYPTION_KEY, CONTROL_DATABASE_URL')
  process.exit(1)
}

// ── Control DB client ────────────────────────────────────────────────────────
const controlDb = new ControlClient({
  adapter: new PrismaPg({ connectionString: CONTROL_DB_URL }),
  log: ['error'],
})

async function main() {
  // Dynamic imports inside async function (avoids top-level await CJS issue)
  const { encrypt } = await import('../src/lib/crypto.js')

  console.log('🔄 Provisionando base de datos Neon para gst-demo...')

  // 1. Crear proyecto Neon via API
  const res = await fetch('https://console.neon.tech/api/v2/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NEON_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project: {
        name:                'cartera-gst-demo',
        region_id:           process.env.NEON_REGION ?? 'aws-us-east-1',
        pg_version:          16,
        org_id:              process.env.NEON_ORG_ID,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Neon API error ${res.status}: ${err}`)
  }

  const data = await res.json() as any
  const project     = data.project
  const connection  = data.connection_uris?.[0]?.connection_uri

  if (!connection) {
    throw new Error('No se recibió connection URI de Neon')
  }

  const dbUrl = connection + '?sslmode=require'
  console.log(`✅ Proyecto Neon creado: ${project.id}`)
  console.log(`   DB URL (primeros 60 chars): ${dbUrl.slice(0, 60)}...`)

  // 2. Aplicar schema del tenant via Prisma
  console.log('\n🔄 Aplicando schema del tenant (Prisma db push)...')
  const { execSync } = await import('child_process')
  process.env.DATABASE_URL = dbUrl
  execSync('npx prisma db push --url "' + dbUrl + '" --accept-data-loss', {
    stdio: 'inherit',
    cwd: process.cwd(),
  })
  console.log('✅ Schema aplicado')

  // 3. Crear usuario admin en el tenant
  console.log('\n🔄 Creando usuario admin en gst-demo...')
  const tenantDb = new TenantClient({
    adapter: new PrismaPg({ connectionString: dbUrl }),
    log: ['error'],
  })

  const adminEmail    = 'admin@gst-demo.com'
  const adminPassword = 'Admin2025!'
  const adminHash     = await bcrypt.hash(adminPassword, 10)
  const perms = Object.fromEntries(
    ['dashboard','edificios','facturas','facturacion','pagos','cartera',
     'cobros','reportes','gerencial','documentos','cierre','auditoria',
     'usuarios','config','ayuda'].map(m => [
      m, { view: true, create: true, edit: true, delete: true }
    ])
  )

  const adminUser = await tenantDb.user.create({
    data: { name: 'Admin Demo', email: adminEmail, passwordHash: adminHash, role: 'ADMIN', active: true, permissions: perms },
  })
  console.log(`✅ Usuario admin creado: ${adminUser.email}`)
  await tenantDb.$disconnect()

  // 4. Actualizar el tenant en el control plane con la nueva DB URL
  console.log('\n🔄 Actualizando control plane con la URL cifrada...')
  const encryptedUrl = encrypt(dbUrl)
  await controlDb.tenant.update({
    where: { slug: 'gst-demo' },
    data:  { databaseUrl: encryptedUrl },
  })
  console.log('✅ Control plane actualizado')

  console.log('\n══════════════════════════════════════════════')
  console.log('✅ Tenant gst-demo provisionado correctamente')
  console.log('')
  console.log('📌 Credenciales del tenant:')
  console.log(`   Email:      ${adminEmail}`)
  console.log(`   Contraseña: ${adminPassword}`)
  console.log('')
  console.log('🔗 Login: https://app-flame-five-99.vercel.app/login')
  console.log('══════════════════════════════════════════════')
}

main()
  .catch(e => { console.error('❌', e); process.exit(1) })
  .finally(() => controlDb.$disconnect())
