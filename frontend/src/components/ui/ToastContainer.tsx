// =============================================================================
// ToastContainer.tsx — RENDERS ALL ACTIVE TOASTS ON SCREEN
// =============================================================================
// Placed once in app/layout.tsx so it exists on every page.
// It reads from the toast store and renders each notification.
// Toasts slide in from the bottom-right on desktop, bottom-center on mobile.
// =============================================================================

'use client'

import { useToastStore } from '@/store/toastStore'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import clsx from 'clsx'

// Icon + colour mapping for each toast type.
const TOAST_STYLES = {
  success: {
    icon:    CheckCircle,
    wrapper: 'bg-green-50 dark:bg-green-900/40 border-green-200 dark:border-green-700',
    icon_:   'text-green-600 dark:text-green-400',
    text:    'text-green-800 dark:text-green-200',
  },
  error: {
    icon:    AlertCircle,
    wrapper: 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700',
    icon_:   'text-red-600 dark:text-red-400',
    text:    'text-red-800 dark:text-red-200',
  },
  warning: {
    icon:    AlertTriangle,
    wrapper: 'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-700',
    icon_:   'text-yellow-600 dark:text-yellow-400',
    text:    'text-yellow-800 dark:text-yellow-200',
  },
  info: {
    icon:    Info,
    wrapper: 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700',
    icon_:   'text-blue-600 dark:text-blue-400',
    text:    'text-blue-800 dark:text-blue-200',
  },
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    // Fixed in the bottom-right corner, above everything (z-50).
    // On mobile it sits just above the bottom nav bar (bottom-20 = 5rem).
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type]
        const Icon  = style.icon

        return (
          <div
            key={toast.id}
            role="alert"
            className={clsx(
              // Base toast styles
              'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg',
              'animate-fadeIn',
              style.wrapper
            )}
          >
            {/* Icon */}
            <Icon className={clsx('w-5 h-5 shrink-0 mt-0.5', style.icon_)} />

            {/* Message text */}
            <p className={clsx('flex-1 text-sm font-medium leading-snug', style.text)}>
              {toast.message}
            </p>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className={clsx('shrink-0 opacity-60 hover:opacity-100 transition-opacity', style.text)}
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
