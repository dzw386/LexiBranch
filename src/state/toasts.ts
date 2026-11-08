import { create } from 'zustand'
import { newId } from '../lib/id'

export const TOAST_DURATION_MS = 4000

export type ToastVariant = 'success' | 'error'

export interface ToastMessage {
  id: string
  variant: ToastVariant
  messageKey: string
  params?: Record<string, string | number>
  dedupeKey?: string
}

export interface ShowToastOptions {
  variant: ToastVariant
  messageKey: string
  params?: Record<string, string | number>
  /** While a toast with this key is visible, later shows with the same key are skipped. */
  dedupeKey?: string
}

export interface ToastsState {
  toasts: ToastMessage[]
  showToast: (options: ShowToastOptions) => void
  dismissToast: (id: string) => void
}

export const useToastsStore = create<ToastsState>((set, get) => ({
  toasts: [],

  showToast: (options) => {
    const { toasts } = get()

    if (
      options.dedupeKey !== undefined &&
      toasts.some((toast) => toast.dedupeKey === options.dedupeKey)
    ) {
      return
    }

    const toast: ToastMessage = { id: newId(), ...options }
    set({ toasts: [...toasts, toast] })

    window.setTimeout(() => {
      get().dismissToast(toast.id)
    }, TOAST_DURATION_MS)
  },

  dismissToast: (id) =>
    set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}))
