// =============================================================================
// MediaGrid Component
// A filterable, searchable grid of MediaCard components.
// Used on the /history and /profile pages.
// =============================================================================

'use client'

import { useState, useMemo } from 'react'
import { MediaCard } from './MediaCard'
import { FilterBar } from './FilterBar'
import type { MediaItem, FilterOptions } from '@/types'


interface MediaGridProps {
  items: MediaItem[]
  onDownload: (item: MediaItem) => void
}


// Default filter state: show everything, no search query.
const DEFAULT_FILTERS: FilterOptions = {
  mediaTypes:     [],
  platforms:      [],
  dateFrom:       null,
  dateTo:         null,
  searchQuery:    '',
  sortBy:         'date',
  sortDirection:  'desc',
}


export function MediaGrid({ items, onDownload }: MediaGridProps) {

  // "filters" is local state because filtering only affects what this component shows.
  // It does not need to be shared with other components.
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS)


  // "useMemo" computes the filtered list and caches the result.
  // It only re-calculates when "items" or "filters" actually change.
  // WHY: Filtering hundreds of items on every keystroke would be slow.
  //      useMemo prevents unnecessary recalculations.
  const filteredItems = useMemo(() => {
    let result = [...items]  // Make a copy — never mutate the original array

    // Filter by media type (if any types are selected).
    if (filters.mediaTypes.length > 0) {
      result = result.filter((item) => filters.mediaTypes.includes(item.mediaType))
    }

    // Filter by platform (if any platforms are selected).
    if (filters.platforms.length > 0) {
      result = result.filter((item) => filters.platforms.includes(item.platform))
    }

    // Filter by date range.
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime()
      result = result.filter(
        (item) => item.postedAt && new Date(item.postedAt).getTime() >= from
      )
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime()
      result = result.filter(
        (item) => item.postedAt && new Date(item.postedAt).getTime() <= to
      )
    }

    // Search filter: matches caption or username (case-insensitive).
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.caption?.toLowerCase().includes(q) ||
          item.username?.toLowerCase().includes(q)
      )
    }

    // Sort.
    result.sort((a, b) => {
      let comparison = 0

      if (filters.sortBy === 'date') {
        // Compare dates: newer items have a larger timestamp.
        const aTime = a.postedAt ? new Date(a.postedAt).getTime() : 0
        const bTime = b.postedAt ? new Date(b.postedAt).getTime() : 0
        comparison = aTime - bTime
      } else if (filters.sortBy === 'size') {
        comparison = (a.fileSizeBytes ?? 0) - (b.fileSizeBytes ?? 0)
      } else if (filters.sortBy === 'platform') {
        comparison = a.platform.localeCompare(b.platform)
      }

      // Reverse for descending order.
      return filters.sortDirection === 'desc' ? -comparison : comparison
    })

    return result
  }, [items, filters])


  return (
    <div className="space-y-4">

      {/* Filter controls */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        totalCount={items.length}
        filteredCount={filteredItems.length}
      />

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="py-12 text-center text-gray-400">
          <p className="text-sm">No items match the current filters.</p>
        </div>
      )}

      {/* The grid of cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredItems.map((item) => (
          <MediaCard key={item.id} item={item} onDownload={onDownload} />
        ))}
      </div>
    </div>
  )
}
