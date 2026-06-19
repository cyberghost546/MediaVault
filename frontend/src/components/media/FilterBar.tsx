// =============================================================================
// FilterBar Component
// A row of filter controls above the media grid.
// Lets users filter by media type, platform, and date range.
// =============================================================================

'use client'

import { Search, Filter } from 'lucide-react'
import type { FilterOptions, MediaType, Platform } from '@/types'


interface FilterBarProps {
  filters: FilterOptions
  // Called whenever any filter value changes.
  onChange: (updated: FilterOptions) => void
  // Total item count — shown in the bar for context.
  totalCount: number
  // Filtered item count.
  filteredCount: number
}


export function FilterBar({ filters, onChange, totalCount, filteredCount }: FilterBarProps) {

  // Helper: toggle a value in an array (add if missing, remove if present).
  // Used for the multi-select type/platform toggles.
  function toggleArrayValue<T>(arr: T[], value: T): T[] {
    return arr.includes(value)
      ? arr.filter((v) => v !== value)      // remove
      : [...arr, value]                     // add
  }


  // Media type toggle buttons.
  const mediaTypes: { value: MediaType; label: string }[] = [
    { value: 'image', label: 'Images' },
    { value: 'video', label: 'Videos' },
    { value: 'reel',  label: 'Reels'  },
    { value: 'story', label: 'Stories'},
  ]

  // Platform toggle buttons.
  const platforms: { value: Platform; label: string }[] = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok',    label: 'TikTok'    },
    { value: 'twitter',   label: 'X'         },
    { value: 'facebook',  label: 'Facebook'  },
    { value: 'snapchat',  label: 'Snapchat'  },
  ]


  return (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">

      {/* ── SEARCH ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Search by username or caption…"
          value={filters.searchQuery}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* ── MEDIA TYPE FILTER ── */}
      <div className="flex flex-wrap gap-1.5">
        {mediaTypes.map(({ value, label }) => {
          const isActive = filters.mediaTypes.includes(value)
          return (
            <button
              key={value}
              onClick={() => onChange({ ...filters, mediaTypes: toggleArrayValue(filters.mediaTypes, value) })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-brand-400'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── PLATFORM FILTER ── */}
      <div className="flex flex-wrap gap-1.5">
        {platforms.map(({ value, label }) => {
          const isActive = filters.platforms.includes(value)
          return (
            <button
              key={value}
              onClick={() => onChange({ ...filters, platforms: toggleArrayValue(filters.platforms, value) })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── RESULT COUNT ── */}
      <p className="text-xs text-gray-400">
        Showing {filteredCount} of {totalCount} items
      </p>
    </div>
  )
}
