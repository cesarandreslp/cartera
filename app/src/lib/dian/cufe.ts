import { createHash } from 'node:crypto'

export type CufeInput = {
  number: string
  issueDate: Date
  issueTime: string
  subtotal: number
  taxAmount: number
  total: number
  issuerNit: string
  receiverIdType: string
  receiverId: string
  technicalKey: string
  environmentCode: '1' | '2'
}

function fmtMoney(n: number): string {
  return n.toFixed(2)
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function computeCufe(input: CufeInput): string {
  const concat = [
    input.number,
    fmtDate(input.issueDate),
    input.issueTime,
    fmtMoney(input.subtotal),
    '01', fmtMoney(input.taxAmount),
    '04', '0.00',
    '03', '0.00',
    fmtMoney(input.total),
    input.issuerNit,
    input.receiverIdType,
    input.receiverId,
    input.technicalKey,
    input.environmentCode,
  ].join('')

  return createHash('sha384').update(concat, 'utf8').digest('hex')
}

export function computeCude(input: CufeInput): string {
  return computeCufe(input)
}
