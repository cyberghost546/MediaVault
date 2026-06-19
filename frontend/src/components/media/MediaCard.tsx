// =============================================================================
// MediaCard Component
// A thumbnail card shown in the MediaGrid on the history/profile pages.
// Displays thumbnail, type badge, platform, and a Download button.
// =============================================================================

'use client'

import { Download, Play, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { MediaItem } from '@/types'
import { formatBytes, formatDuration } from '@/utils/urlParser'
import { getPlatformDisplayName } from '@/utils/platformDetector'


interface MediaCardProps {
  item: MediaItem
  // Called when the user clicks "Download" on this card.
  onDownload: (item: MediaItem) => void
}


export function MediaCard({ item, onDownload }: MediaCardProps) {

  const isVideo = ['video', 'reel', 'story'].includes(item.mediaType)

  return (
    <div className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow duration-200">

      {/* ── THUMBNAIL AREA ── */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">

        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.caption ?? 'Media thumbnail'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          // Placeholder with an icon when no thumbnail is available
          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            {isVideo
              ? <Play      className="w-10 h-10" />
              : <ImageIcon className="w-10 h-10" />}
          </div>
        )}

        {/* Play button overlay for videos */}
        {isVideo && item.thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Duration badge */}
        {item.durationSeconds && item.durationSeconds > 0 && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[10px] text-white bg-black/70 rounded">
            {formatDuration(item.durationSeconds)}
          </span>
        )}

        {/* Media type badge */}
        <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium text-white bg-black/60 rounded capitalize">
          {item.mediaType}
        </span>
      </div>

      {/* ── INFO AREA ── */}
      <div className="p-3">

        {/* Platform + username */}
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
          {getPlatformDisplayName(item.platform)}
          {item.username && ` · @${item.username}`}
        </p>

        {/* Caption (truncated to 2 lines) */}
        {item.caption && (
          <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
            {item.caption}
          </p>
        )}

        {/* File size */}
        {item.fileSizeBytes && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            {formatBytes(item.fileSizeBytes)}
          </p>
        )}

        {/* Download button */}
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={() => onDownload(item)}
          className="w-full"
        >
          Download
        </Button>
      </div>
    </div>
  )
}
