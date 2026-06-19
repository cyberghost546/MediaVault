// =============================================================================
// app/history/page.tsx — DOWNLOAD HISTORY PAGE  (URL: "/history")
// =============================================================================
// Shows everything that has ever been downloaded (stored in MySQL).
// Supports searching, filtering, and deleting history records.
// =============================================================================

'use client'

import { useEffect, useState } from 'react'
import { MediaGrid } from '@/components/media/MediaGrid'
import { Card } from '@/components/ui/Card'
import { useDownload } from '@/hooks/useDownload'
import { getHistory, deleteHistoryRecord } from '@/services/downloadService'
import type { HistoryRecord, MediaItem } from '@/types'
import { History, Loader2 } from 'lucide-react'


// Convert a HistoryRecord from the database into a MediaItem so MediaGrid can display it.
// WHY: MediaGrid expects MediaItem objects. HistoryRecord has a different shape.
//      This adapter function bridges the two.
function historyToMediaItem(record: HistoryRecord): MediaItem {
  return {
    id:           String(record.id),
    sourceUrl:    record.sourceUrl,
    mediaUrl:     record.filePath,    // On history view, we point to the local file
    platform:     record.platform,
    mediaType:    record.mediaType,
    extractedAt:  record.downloadedAt,
    fileSizeBytes: record.fileSizeBytes,
  }
}


export default function HistoryPage() {

  const [records, setRecords]    = useState<HistoryRecord[]>([])
  const [isLoading, setIsLoading]= useState(true)
  const [error, setError]        = useState<string | null>(null)

  // useDownload gives us "startDownload" in case they want to re-download.
  const { startDownload } = useDownload()


  // "useEffect" with an empty dependency array [] runs ONCE when the component mounts.
  // "mount" means "when React first adds this component to the DOM".
  // This is where we load data when the page is first visited.
  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getHistory(1, 200)  // first 200 records
        setRecords(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setIsLoading(false)
      }
    }
    loadHistory()
  }, [])  // [] means "no dependencies" — only runs once on mount


  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card>
        <p className="text-sm text-red-500 text-center py-8">{error}</p>
      </Card>
    )
  }

  // Empty state
  if (records.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <History className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">No download history yet.</p>
          <p className="text-xs mt-1">Download some media to see it here.</p>
        </div>
      </div>
    )
  }


  // Convert records to MediaItems for the grid.
  const mediaItems = records.map(historyToMediaItem)

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Download History</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {records.length} file{records.length !== 1 ? 's' : ''} downloaded
        </p>
      </div>

      <MediaGrid
        items={mediaItems}
        onDownload={(item) => {
          // Find the original HistoryRecord so we can re-download it.
          const record = records.find((r) => String(r.id) === item.id)
          if (record) {
            // Build a minimal MediaItem to pass to startDownload.
            startDownload({
              ...item,
              mediaUrl: record.sourceUrl,  // Re-download from the original URL
            })
          }
        }}
      />
    </div>
  )
}
