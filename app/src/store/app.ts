'use client'

import { create } from 'zustand'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface AppStore {
  // Navigation
  currentPage: string
  setPage: (page: string) => void

  // Toasts
  toasts: Toast[]
  addToast: (type: Toast['type'], message: string) => void
  removeToast: (id: string) => void

  // Modals
  openModals: Set<string>
  openModal: (id: string) => void
  closeModal: (id: string) => void

  // Fiscal year
  fiscalYear: number
  setFiscalYear: (y: number) => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Navigation
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),

  // Toasts
  toasts: [],
  addToast: (type, message) => {
    const id = crypto.randomUUID()
    set(s => ({ toasts: [...s.toasts, { id, type, message }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },
  removeToast: (id) =>
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // Modals
  openModals: new Set(),
  openModal: (id) =>
    set(s => ({ openModals: new Set([...s.openModals, id]) })),
  closeModal: (id) => {
    const next = new Set(get().openModals)
    next.delete(id)
    set({ openModals: next })
  },

  // Fiscal year
  fiscalYear: new Date().getFullYear(),
  setFiscalYear: (y) => set({ fiscalYear: y }),
}))
