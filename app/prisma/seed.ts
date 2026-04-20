import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@gst.com.co'
  const adminPass = 'admin123'

  const hash = await bcrypt.hash(adminPass, 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash, active: true },
    create: {
      name: 'Administrador GST',
      email: adminEmail,
      passwordHash: hash,
      role: 'ADMIN',
      permissions: {},
      active: true,
    },
  })

  console.log(`✓ Admin: ${admin.email} / ${adminPass}`)

  const buildings = [
    { code: 'ED-001', name: 'Edificio Centro', nit: '900123456-1', city: 'Bogotá', contact: 'Ana Ruiz' },
    { code: 'ED-002', name: 'Torre Norte', nit: '900123456-2', city: 'Medellín', contact: 'Luis Gómez' },
    { code: 'ED-003', name: 'Conjunto Sur', nit: '900123456-3', city: 'Cali', contact: 'María Pérez' },
  ]

  for (const b of buildings) {
    await prisma.building.upsert({
      where: { code: b.code },
      update: {},
      create: b,
    })
  }

  console.log(`✓ ${buildings.length} edificios`)

  const ed1 = await prisma.building.findUnique({ where: { code: 'ED-001' } })
  if (ed1) {
    const period = '2026-03'
    const existing = await prisma.invoice.findUnique({ where: { number: 'FAC-0001' } })
    if (!existing) {
      await prisma.invoice.create({
        data: {
          number: 'FAC-0001',
          buildingId: ed1.id,
          period,
          type: 'MANUAL',
          concept: 'Administración marzo 2026',
          subtotal: 1_500_000,
          discount: 0,
          mora: 0,
          tax: 285_000,
          total: 1_785_000,
          status: 'PENDING',
          dueDate: new Date('2026-04-30'),
          fiscalYear: 2026,
        },
      })
      console.log('✓ Factura demo FAC-0001')
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
