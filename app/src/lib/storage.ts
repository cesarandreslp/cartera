import { put, del } from '@vercel/blob'
import { prisma } from '@/lib/db'

/**
 * Sube un documento a Vercel Blob y opcionalmente actualiza un registro en la DB.
 * @param file El archivo (Buffer o File)
 * @param filename Nombre del archivo
 * @param entityId ID de la entidad (Invoice o FeDocument)
 * @param type Tipo de documento ('invoice' | 'fe')
 */
export async function uploadDocument(
  file: Buffer | File,
  filename: string,
  entityId?: string,
  type: 'invoice' | 'fe' = 'invoice'
) {
  try {
    const blob = await put(`documents/${type}/${Date.now()}-${filename}`, file, {
      access: 'public',
    })

    // Si se proporciona entityId, actualizamos la base de datos automáticamente
    if (entityId) {
      if (type === 'invoice') {
        await prisma.invoice.update({
          where: { id: entityId },
          data: { documentUrl: blob.url },
        })
      } else if (type === 'fe') {
        await prisma.feDocument.update({
          where: { id: entityId },
          data: { pdfUrl: blob.url },
        })
      }
    }

    return blob
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error)
    throw new Error('Error al subir el documento')
  }
}

/**
 * Elimina un documento de Vercel Blob.
 * @param url URL completa del blob a eliminar
 */
export async function deleteDocument(url: string) {
  try {
    await del(url)
  } catch (error) {
    console.error('Error deleting from Vercel Blob:', error)
    // No lanzamos error para evitar romper flujos si el archivo ya no existe
  }
}
