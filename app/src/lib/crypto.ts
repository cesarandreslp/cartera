/**
 * AES-256-GCM encryption for sensitive data at rest.
 * Used for: database URLs per tenant, DIAN certificate passwords.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const KEY  = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex')

if (KEY.length !== 32) {
  // Only throw at runtime if KEY is actually needed (not at module load in CI)
  console.warn('[crypto] ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
}

export function encrypt(text: string): string {
  const iv  = randomBytes(12)
  const cipher = createCipheriv(ALGO, KEY, iv)

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Format: hex(iv):hex(tag):hex(encrypted)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(encoded: string): string {
  const [ivHex, tagHex, dataHex] = encoded.split(':')
  const iv        = Buffer.from(ivHex,  'hex')
  const tag       = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(dataHex,'hex')

  const decipher = createDecipheriv(ALGO, KEY, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8')
}
