import { put, del } from '@vercel/blob'

/**
 * Upload a document to Vercel Blob under the tenant's namespace.
 * All tenant files are isolated under /documents/{tenantId}/...
 */
export async function uploadDocument(
  file:     Buffer | File | Blob,
  filename: string,
  tenantId: string,
  type:     'invoice' | 'fe' | 'general' = 'invoice',
  entityId?: string,
) {
  const path = `documents/${tenantId}/${type}/${Date.now()}-${filename}`
  const blob = await put(path, file, { access: 'public' })
  return blob
}

/**
 * Upload a DIAN certificate (.p12) for a tenant.
 * Stored privately under /certificates/{tenantId}/dian.p12
 */
export async function uploadCertificate(tenantId: string, file: Buffer | File | Blob) {
  const path = `certificates/${tenantId}/dian.p12`
  const blob = await put(path, file, { access: 'public' }) // use signed URLs in production
  return blob
}

/**
 * Delete a file from Vercel Blob by URL.
 */
export async function deleteDocument(url: string): Promise<void> {
  try {
    await del(url)
  } catch {
    // File might already be gone — non-fatal
  }
}
