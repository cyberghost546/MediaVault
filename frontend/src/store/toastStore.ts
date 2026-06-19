// =============================================================================
// toastStore.ts — GLOBAL TOAST NOTIFICATION STATE
// =============================================================================
// "Toasts" are the small pop-up messages that slide in from a corner of the
// screen (e.g. "Download complete!", "Error: URL not supported").
//
// Any component anywhere in the app can trigger a toast by calling:
//   useToastStore.getState().addToast({ type: 'success', message: 'Done!' })
//
// The <ToastContainer> component (in layout.tsx) reads this store and renders
// the visible toasts on screen.
// =============================================================================

import { create } from 'zustand'

// The four visual styles of toast.
export type ToastType = 'success' | 'error' | 'warning' | 'info'

// One toast notification.
export interface Toast {
  // Unique ID so React can key the element correctly.
  id: string
  // The message text shown in the toast.
  message: string
  // Controls the color and icon.
  type: ToastType
  // How long to show it before auto-dismissing (milliseconds). Default 4000.
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  // Add a new toast. Returns the generated ID so callers can dismiss it manually.
  addToast: (toast: Omit<Toast, 'id'>) => string
  // Remove a toast by ID (called after the auto-dismiss timer fires).
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    // Generate a random ID for this toast.
    const id = Math.random().toString(36).slice(2, 9)
    const duration = toast.duration ?? 4000

    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))

    // Auto-dismiss after "duration" milliseconds.
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, duration)

    return id
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))

// Convenience helpers — call these anywhere without needing the hook:
//   toast.success('Downloaded!')
//   toast.error('Something went wrong')
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'success', message, duration }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'error', message, duration: duration ?? 6000 }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'warning', message, duration }),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: 'info', message, duration }),
}
