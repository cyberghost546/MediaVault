'use client'

// Import React and clsx.
import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

// Import formatting helpers.
import { formatBytes } from '@/utils/urlParser'


// =============================================================================
// ProgressBar Component
// Shows a horizontal progress bar and download statistics.
// Used in DownloadItem.tsx to show the progress of each download.
// =============================================================================

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {

  // Progress from 0 to 100.
  percent: number

  // Optional: bytes downloaded so far (shown as "12.5 MB / 100 MB").
  downloadedBytes?: number

  // Optional: total file size in bytes.
  totalBytes?: number

  // Optional: current download speed in bytes/sec (shown as "5.2 MB/s").
  speedBytesPerSec?: number

  // Optional: estimated seconds remaining.
  etaSeconds?: number

  // Color variant for different statuses.
  color?: 'blue' | 'green' | 'red' | 'yellow'

  // Show the percentage number on the right side of the bar.
  showPercent?: boolean

  // Show file size info below the bar.
  showStats?: boolean
}


export function ProgressBar({
  percent,
  downloadedBytes,
  totalBytes,
  speedBytesPerSec,
  etaSeconds,
  color = 'blue',
  showPercent = true,
  showStats = false,
  className,
  ...props
}: ProgressBarProps) {

  // Clamp percent between 0 and 100 so invalid values don't break the layout.
  // "Math.max(0, Math.min(100, percent))" ensures 0 ≤ percent ≤ 100.
  const clamped = Math.max(0, Math.min(100, percent))

  // Map the color prop to Tailwind classes.
  const barColorClass = {
    blue:   'bg-brand-500',
    green:  'bg-green-500',
    red:    'bg-red-500',
    yellow: 'bg-yellow-400',
  }[color]

  // Format the ETA as a human-readable string.
  function formatEta(seconds: number): string {
    if (seconds < 60)   return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${(seconds / 3600).toFixed(1)}h`
  }

  return (
    <div className={clsx('w-full', className)} {...props}>

      {/* Row: label on the left, percentage on the right */}
      {showPercent && (
        <div className="flex justify-between mb-1 text-xs text-gray-500 dark:text-gray-400">
          <span>{clamped}%</span>
          {/* Show ETA if available */}
          {etaSeconds !== undefined && etaSeconds > 0 && (
            <span>{formatEta(etaSeconds)} remaining</span>
          )}
        </div>
      )}

      {/* The track (grey background bar) */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">

        {/* The fill (coloured portion) */}
        {/* "style={{ width: `${clamped}%` }}" sets the width dynamically. */}
        {/* WHY inline style instead of a Tailwind class?                   */}
        {/*   Tailwind generates classes at build time. A dynamic percentage */}
        {/*   like "w-[47%]" would not be in the bundle unless explicitly    */}
        {/*   listed. Inline styles handle truly runtime-dynamic values.     */}
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300 ease-out',
            barColorClass
          )}
          style={{ width: `${clamped}%` }}
          // Accessibility: screen readers read this as a progress indicator.
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Download statistics shown below the bar */}
      {showStats && (
        <div className="flex justify-between mt-1 text-xs text-gray-400 dark:text-gray-500">

          {/* Bytes transferred / total */}
          {downloadedBytes !== undefined && totalBytes !== undefined && (
            <span>
              {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
            </span>
          )}

          {/* Current speed */}
          {speedBytesPerSec !== undefined && speedBytesPerSec > 0 && (
            <span>{formatBytes(speedBytesPerSec)}/s</span>
          )}
        </div>
      )}
    </div>
  )
}
