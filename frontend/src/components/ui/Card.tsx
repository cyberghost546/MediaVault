'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

// =============================================================================
// Card Component
// A white (light mode) / dark (dark mode) box with rounded corners and a shadow.
// Used as the container for most panels in the app.
// =============================================================================

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  // Optional header text or element displayed at the top of the card.
  header?: ReactNode

  // Optional footer displayed at the bottom.
  footer?: ReactNode

  // Remove the default padding (useful when you want full-bleed content like an image).
  noPadding?: boolean
}

export function Card({ children, header, footer, noPadding, className, ...props }: CardProps) {
  return (
    // Outer container: white background, border, rounded corners, drop shadow.
    <div
      className={clsx(
        'bg-white dark:bg-gray-900',
        'border border-gray-200 dark:border-gray-700',
        'rounded-xl shadow-card',
        'overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Card header — only rendered if "header" prop is provided */}
      {header && (
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          {typeof header === 'string'
            ? <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{header}</h3>
            : header}
        </div>
      )}

      {/* Main body */}
      <div className={noPadding ? '' : 'p-5'}>
        {children}
      </div>

      {/* Card footer */}
      {footer && (
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {footer}
        </div>
      )}
    </div>
  )
}
