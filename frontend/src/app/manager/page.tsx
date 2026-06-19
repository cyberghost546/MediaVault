// =============================================================================
// app/manager/page.tsx — DOWNLOAD MANAGER PAGE  (URL: "/manager")
// =============================================================================
// Shows all active, paused, completed, and failed downloads.
// Uses tabs to filter the list by status.
// =============================================================================

'use client'

import { useState } from 'react'
import { DownloadQueue } from '@/components/download/DownloadQueue'
import { useDownloadStore } from '@/store/downloadStore'
import type { DownloadStatus } from '@/types'
import clsx from 'clsx'


// Tab definitions: each tab shows a filtered view of the download queue.
const TABS: { label: string; value: DownloadStatus | 'all' }[] = [
  { label: 'All',       value: 'all'       },
  { label: 'Active',    value: 'active'    },
  { label: 'Paused',    value: 'paused'    },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed',    value: 'failed'    },
]


export default function ManagerPage() {

  // Which tab is currently selected.
  const [activeTab, setActiveTab] = useState<DownloadStatus | 'all'>('all')

  // Read job counts from the store for the tab badges.
  const jobs = useDownloadStore((s) => s.jobs)

  // Count how many jobs are in each status.
  function countByStatus(status: DownloadStatus | 'all') {
    if (status === 'all') return jobs.length
    return jobs.filter((j) => j.status === status).length
  }


  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Download Manager</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Monitor, pause, and manage your download queue.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {TABS.map((tab) => {
          const count = countByStatus(tab.value)
          const isActive = activeTab === tab.value

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg',
                'text-xs font-medium transition-colors duration-150',
                isActive
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {tab.label}
              {/* Badge showing count (only show when > 0) */}
              {count > 0 && (
                <span className={clsx(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none',
                  isActive ? 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* The download queue filtered by the selected tab */}
      <DownloadQueue
        filterStatus={activeTab === 'all' ? undefined : activeTab}
      />
    </div>
  )
}
