'use client'

import { useState, useRef } from 'react'
import { uploadDocument } from '@/lib/storage'

interface DocumentUploaderProps {
  entityId?: string
  type: 'invoice' | 'fe'
  onUploadComplete?: (url: string) => void
  label?: string
  accept?: string
}

export default function DocumentUploader({
  entityId,
  type,
  onUploadComplete,
  label = 'Subir documento',
  accept = '.pdf,.png,.jpg,.jpeg'
}: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const blob = await uploadDocument(file, file.name, entityId, type)
      if (onUploadComplete) {
        onUploadComplete(blob.url)
      }
    } catch (err: any) {
      setError(err.message || 'Error al subir el archivo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="uploader-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        style={{ display: 'none' }}
        id={`uploader-${type}-${entityId || 'new'}`}
      />
      
      <div 
        className={`pdf-drop ${uploading ? 'uploading' : ''} ${!label ? 'mini' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        title={label || 'Subir documento'}
      >
        <div className="pdf-drop-icon">
          {uploading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : (label ? '📎' : '➕')}
        </div>
        {label && (
          <>
            <div className="pdf-drop-title">{uploading ? 'Subiendo...' : label}</div>
            <div className="pdf-drop-sub">Haz clic o arrastra aquí</div>
          </>
        )}
      </div>

      {error && <div className="alert alert-danger" style={{ marginTop: '8px', fontSize: '11px' }}>{error}</div>}
    </div>
  )
}
