'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

// =============================================================================
// Input Component
// A styled text input with optional left/right decorators (icons, buttons).
// Supports error state which adds a red border and error message below.
// =============================================================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  // Optional label displayed above the input.
  label?: string

  // Optional error message shown in red below the input.
  error?: string

  // Optional helper text shown in grey below the input (when no error).
  hint?: string

  // An element shown inside the left side of the input (e.g. a search icon).
  leftElement?: ReactNode

  // An element shown inside the right side of the input (e.g. a clear button).
  rightElement?: ReactNode
}

export function Input({
  label,
  error,
  hint,
  leftElement,
  rightElement,
  className,
  id,
  ...props
}: InputProps) {

  // Generate a stable ID for accessibility (connecting <label> to <input>).
  const inputId = id ?? `input-${label?.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="w-full">

      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}

      {/* Input wrapper — relative positioning allows absolute decorators */}
      <div className="relative">

        {/* Left decorator (icon or prefix text) */}
        {leftElement && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            {leftElement}
          </div>
        )}

        {/* The actual <input> element */}
        <input
          id={inputId}
          className={clsx(
            // Base styles
            'w-full rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
            'text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'transition-colors duration-150',
            // Focus ring
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            // Error vs normal border
            error
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600',
            // Padding: adjust left/right if decorators are present
            leftElement  ? 'pl-10' : 'pl-3.5',
            rightElement ? 'pr-10' : 'pr-3.5',
            'py-2.5 h-10',
            className
          )}
          {...props}
        />

        {/* Right decorator (clear button, suffix, etc.) */}
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
            {rightElement}
          </div>
        )}
      </div>

      {/* Error message (red) */}
      {error && (
        <p className="mt-1.5 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}

      {/* Hint text (grey), only shown when there is no error */}
      {!error && hint && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}
