// =============================================================================
// DownloadQueue Component
// Shows the full list of download jobs.
// Used on the /manager page and as a mini panel in sidebars.
// =============================================================================

'use client'

import { DownloadItem } from './DownloadItem'
import { Button } from '@/components/ui/Button'
import { useDownloadStore } from '@/store/downloadStore'
import { Inbox, Trash2 } from 'lucide-react'
import type { DownloadStatus } from '@/types'


interface DownloadQueueProps {
  // Optional: only show jobs in a specific status.
  // If undefined, show all jobs.
  filterStatus?: DownloadStatus
}


export function DownloadQueue({ filterStatus }: DownloadQueueProps) {

  // Read all jobs from the global store.
  const jobs         = useDownloadStore((s) => s.jobs)
  const clearFinished = useDownloadStore((s) => s.clearFinished)

  // Apply the optional status filter.
  const visibleJobs = filterStatus
    ? jobs.filter((j) => j.status === filterStatus)
    : jobs

  // Whether any jobs are completed or failed (enables the "Clear finished" button).
  const hasFinished = jobs.some(
    (j) => j.status === 'completed' || j.status === 'failed'
  )


  // Empty state
  if (visibleJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Inbox className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">No downloads yet</p>
        <p className="text-xs mt-1 text-gray-300 dark:text-gray-600">
          Paste a URL on the Download page to get started
        </p>
      </div>
    )
  }


  return (
    <div className="space-y-3">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {visibleJobs.length} job{visibleJobs.length !== 1 ? 's' : ''}
        </p>

        {/* Clear finished button */}
        {hasFinished && !filterStatus && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={clearFinished}
          >
            Clear finished
          </Button>
        )}
      </div>

      {/* ── LIST OF DOWNLOAD ITEMS ── */}
      {/* "key={job.id}" tells React to match DOM elements to the right job
          even if the list order changes. Without "key", React might update
          the wrong item's UI when the list reorders. */}
      {visibleJobs.map((job) => (
        <DownloadItem key={job.id} job={job} />
      ))}
    </div>
  )
}
