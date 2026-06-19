// =============================================================================
// DownloadItem Component
// One row in the Download Manager list.
// Shows the file info, a progress bar, and action buttons (pause/resume/retry/cancel).
// =============================================================================

'use client'

import { Pause, Play, RotateCcw, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { getPlatformDisplayName } from '@/utils/platformDetector'
import { formatBytes } from '@/utils/urlParser'
import type { DownloadJob } from '@/types'
import clsx from 'clsx'


// Services — the buttons call these to tell the backend what to do.
import {
  pauseDownload,
  resumeDownload,
  retryDownload,
  cancelDownload,
} from '@/services/downloadService'

// The store so we can update the job status locally (instant UI feedback).
import { useDownloadStore } from '@/store/downloadStore'


interface DownloadItemProps {
  job: DownloadJob
}


export function DownloadItem({ job }: DownloadItemProps) {

  // Get the store's setStatus action to update the UI immediately.
  const setStatus  = useDownloadStore((s) => s.setStatus)
  const removeJob  = useDownloadStore((s) => s.removeJob)

  // ── ACTION HANDLERS ──
  // Each handler:
  //   1. Optimistically updates the store (instant visual feedback)
  //   2. Calls the backend API
  //   3. If the API fails, the polling will correct the status automatically

  async function handlePause() {
    setStatus(job.id, 'paused')        // Update UI immediately
    try {
      await pauseDownload(job.id)       // Tell backend
    } catch {
      setStatus(job.id, 'active')       // Revert on error
    }
  }

  async function handleResume() {
    setStatus(job.id, 'active')
    try {
      await resumeDownload(job.id)
    } catch {
      setStatus(job.id, 'paused')
    }
  }

  async function handleRetry() {
    setStatus(job.id, 'pending')
    try {
      await retryDownload(job.id)
    } catch {
      setStatus(job.id, 'failed')
    }
  }

  async function handleCancel() {
    try {
      await cancelDownload(job.id)
      removeJob(job.id)               // Remove from local store after cancelling
    } catch (e) {
      console.error('Cancel failed:', e)
    }
  }


  // ── STATUS COLOUR ──
  const statusColor = {
    pending:   'text-yellow-500',
    active:    'text-brand-500',
    paused:    'text-gray-400',
    completed: 'text-green-500',
    failed:    'text-red-500',
  }[job.status]

  // Progress bar colour depends on status.
  const barColor: 'blue' | 'green' | 'red' | 'yellow' =
    job.status === 'completed' ? 'green'
    : job.status === 'failed'  ? 'red'
    : job.status === 'paused'  ? 'yellow'
    : 'blue'


  return (
    <div className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">

      {/* ── PLATFORM ICON PLACEHOLDER ── */}
      <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <span className="text-lg" aria-hidden="true">
          {({ facebook: '📘', twitter: '🐦', instagram: '📸', tiktok: '🎵', snapchat: '👻' } as Record<string, string>)[job.platform] ?? '🌐'}
        </span>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0">

        {/* Top row: platform + status */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {getPlatformDisplayName(job.platform)}
            {' · '}
            <span className="text-gray-400 text-xs font-normal">
              {job.items.length} file{job.items.length !== 1 ? 's' : ''}
            </span>
          </span>

          {/* Status badge */}
          <span className={clsx('text-xs font-semibold capitalize shrink-0', statusColor)}>
            {job.status === 'active'
              ? `${job.progressPercent}%`
              : job.status}
          </span>
        </div>

        {/* URL (truncated) */}
        <p className="text-xs text-gray-400 truncate mb-2">
          {job.sourceUrl}
        </p>

        {/* Progress bar — only show for active/paused jobs */}
        {(job.status === 'active' || job.status === 'paused' || job.status === 'completed') && (
          <ProgressBar
            percent={job.progressPercent}
            downloadedBytes={job.downloadedBytes}
            totalBytes={job.totalBytes}
            speedBytesPerSec={job.status === 'active' ? job.speedBytesPerSec : undefined}
            etaSeconds={job.status === 'active' ? job.etaSeconds : undefined}
            color={barColor}
            showPercent={false}
            showStats={job.status === 'active'}
            className="mb-2"
          />
        )}

        {/* Error message */}
        {job.status === 'failed' && job.errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-red-500 mb-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{job.errorMessage}</span>
          </div>
        )}

        {/* Completed checkmark */}
        {job.status === 'completed' && (
          <div className="flex items-center gap-1.5 text-xs text-green-500 mb-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>
              Saved · {formatBytes(job.totalBytes)}
            </span>
          </div>
        )}
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="shrink-0 flex items-center gap-1">

        {/* Active download: show Pause */}
        {job.status === 'active' && (
          <Button variant="ghost" size="icon" onClick={handlePause} aria-label="Pause">
            <Pause className="w-4 h-4" />
          </Button>
        )}

        {/* Paused download: show Resume */}
        {job.status === 'paused' && (
          <Button variant="ghost" size="icon" onClick={handleResume} aria-label="Resume">
            <Play className="w-4 h-4" />
          </Button>
        )}

        {/* Failed download: show Retry */}
        {job.status === 'failed' && (
          <Button variant="ghost" size="icon" onClick={handleRetry} aria-label="Retry">
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}

        {/* Pending/active/paused: show Cancel */}
        {(job.status === 'pending' || job.status === 'active' || job.status === 'paused') && (
          <Button variant="ghost" size="icon" onClick={handleCancel} aria-label="Cancel">
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Completed: show Remove from list */}
        {job.status === 'completed' && (
          <Button variant="ghost" size="icon" onClick={() => removeJob(job.id)} aria-label="Remove">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
