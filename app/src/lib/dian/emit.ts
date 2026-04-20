import { prisma } from '@/lib/db'
import { computeCufe } from './cufe'
import { buildInvoiceUbl } from './ubl'

type SystemCfg = {
  companyName: string
  companyNit: string
  companyAddress: string
  companyCity: string
  companyPhone: string
  companyEmail: string
  prefix: string
  environment: 'HABILITACION' | 'PRODUCCION'
  testMode: boolean
  taxRate: number
  technicalKey: string
}

async function loadConfig(): Promise<SystemCfg> {
  const entries = await prisma.systemConfig.findMany()
  const cfg: Record<string, any> = {}
  for (const e of entries) cfg[e.key] = e.value

  return {
    companyName: cfg['company.name'] ?? 'GST S.A.S',
    companyNit: cfg['company.nit'] ?? '900000000',
    companyAddress: cfg['company.address'] ?? 'Bogotá',
    companyCity: cfg['company.city'] ?? 'Bogotá',
    companyPhone: cfg['company.phone'] ?? '',
    companyEmail: cfg['company.email'] ?? 'facturacion@gst.com.co',
    prefix: cfg['fe.prefix'] ?? 'SETP',
    environment: cfg['fe.environment'] ?? 'HABILITACION',
    testMode: cfg['fe.testMode'] !== false,
    taxRate: Number(cfg['billing.defaultTaxRate'] ?? 19),
    technicalKey: cfg['fe.technicalKey'] ?? 'fc8eac422eba16e22ffd8c6f94b3f40a6e38162c',
  }
}

async function nextConsecutive(): Promise<number> {
  const current = await prisma.systemConfig.findUnique({ where: { key: 'fe.consecutive' } })
  const n = Number((current?.value as any) ?? 0) + 1
  await prisma.systemConfig.upsert({
    where: { key: 'fe.consecutive' },
    update: { value: n as any },
    create: { key: 'fe.consecutive', value: n as any },
  })
  return n
}

export async function emitInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { building: true, feDocument: true },
  })
  if (!invoice) throw new Error('Factura no existe')
  if (invoice.status === 'VOID') throw new Error('Factura anulada')
  if (invoice.feDocument && ['SIGNED', 'SENT', 'ACCEPTED'].includes(invoice.feDocument.dianStatus)) {
    throw new Error('Factura ya emitida')
  }

  const cfg = await loadConfig()
  const consecutive = await nextConsecutive()
  const envCode: '1' | '2' = cfg.environment === 'PRODUCCION' ? '1' : '2'

  const now = new Date()
  const issueTime = now.toISOString().slice(11, 19) + '-05:00'

  const subtotal = Number(invoice.subtotal)
  const discount = Number(invoice.discount)
  const taxAmount = Number(invoice.tax)
  const total = Number(invoice.total)

  const cufe = computeCufe({
    number: invoice.number,
    issueDate: now,
    issueTime,
    subtotal,
    taxAmount,
    total,
    issuerNit: cfg.companyNit,
    receiverIdType: '31',
    receiverId: invoice.building.nit,
    technicalKey: cfg.technicalKey,
    environmentCode: envCode,
  })

  const xml = buildInvoiceUbl({
    number: invoice.number,
    prefix: cfg.prefix,
    consecutive,
    cufe,
    issueDate: now,
    issueTime,
    environmentCode: envCode,
    issuer: {
      nit: cfg.companyNit, name: cfg.companyName,
      address: cfg.companyAddress, city: cfg.companyCity,
      email: cfg.companyEmail, phone: cfg.companyPhone,
    },
    receiver: {
      idType: '31', id: invoice.building.nit,
      name: invoice.building.name,
      address: invoice.building.address ?? '',
      city: invoice.building.city ?? '',
      email: invoice.building.email ?? '',
    },
    lines: [{
      code: '94',
      description: invoice.concept ?? `Servicios ${invoice.period}`,
      quantity: 1,
      unitPrice: subtotal,
      lineTotal: subtotal,
    }],
    subtotal,
    discount,
    taxAmount,
    taxRate: cfg.taxRate,
    total,
    currency: 'COP',
    notes: invoice.notes ?? undefined,
  })

  const isSimulation = cfg.testMode || cfg.environment === 'HABILITACION'

  const feDoc = await prisma.feDocument.upsert({
    where: { invoiceId: invoice.id },
    update: {
      prefix: cfg.prefix,
      consecutive,
      cufe,
      xmlUbl: xml,
      xmlSigned: xml,
      dianStatus: isSimulation ? 'ACCEPTED' : 'SIGNED',
      dianMessage: isSimulation ? 'Simulación: aceptada en ambiente de habilitación' : null,
      signedAt: now,
      sentAt: isSimulation ? now : null,
      acceptedAt: isSimulation ? now : null,
    },
    create: {
      invoiceId: invoice.id,
      prefix: cfg.prefix,
      consecutive,
      cufe,
      xmlUbl: xml,
      xmlSigned: xml,
      dianStatus: isSimulation ? 'ACCEPTED' : 'SIGNED',
      dianMessage: isSimulation ? 'Simulación: aceptada en ambiente de habilitación' : null,
      signedAt: now,
      sentAt: isSimulation ? now : null,
      acceptedAt: isSimulation ? now : null,
    },
  })

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { type: 'ELECTRONIC' },
  })

  return { cufe, consecutive, dianStatus: feDoc.dianStatus, xmlSize: xml.length, environment: cfg.environment }
}

export async function emitNote(
  invoiceId: string,
  type: 'CREDIT' | 'DEBIT',
  reason: string,
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { building: true, feDocument: true },
  })
  if (!invoice) throw new Error('Factura no existe')
  if (!invoice.feDocument) throw new Error('La factura no ha sido emitida electrónicamente')

  const cfg = await loadConfig()
  const consecutive = await nextConsecutive()
  const envCode: '1' | '2' = cfg.environment === 'PRODUCCION' ? '1' : '2'

  const now = new Date()
  const issueTime = now.toISOString().slice(11, 19) + '-05:00'

  const cude = computeCufe({
    number: `${type === 'CREDIT' ? 'NC' : 'ND'}-${invoice.number}`,
    issueDate: now,
    issueTime,
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.tax),
    total: Number(invoice.total),
    issuerNit: cfg.companyNit,
    receiverIdType: '31',
    receiverId: invoice.building.nit,
    technicalKey: cfg.technicalKey,
    environmentCode: envCode,
  })

  const parentId = invoice.feDocument.id

  const note = await prisma.feDocument.create({
    data: {
      invoiceId: invoice.id,
      prefix: cfg.prefix,
      consecutive,
      cufe: cude,
      xmlUbl: `<!-- Nota ${type} referencia CUFE ${invoice.feDocument.cufe} · ${reason} -->`,
      xmlSigned: null,
      dianStatus: 'ACCEPTED',
      dianMessage: `Nota ${type === 'CREDIT' ? 'crédito' : 'débito'} generada`,
      signedAt: now,
      sentAt: now,
      acceptedAt: now,
      noteType: type,
      noteReason: reason,
      parentId,
    },
  })

  if (type === 'CREDIT') {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'VOID' } })
  }

  return { cude: note.cufe, consecutive, type, parentCufe: invoice.feDocument.cufe }
}
