'use client'

import { useAppStore } from '@/store/app'
import { useEffect } from 'react'

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore()

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          onClick={() => removeToast(t.id)}
          style={{ cursor: 'pointer' }}
        >
          <span>
            {t.type === 'success' && '✅'}
            {t.type === 'error'   && '❌'}
            {t.type === 'warning' && '⚠️'}
            {t.type === 'info'    && 'ℹ️'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
