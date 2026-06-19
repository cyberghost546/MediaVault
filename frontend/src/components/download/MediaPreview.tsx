// =============================================================================
// MediaPreview Component
// Shows a grid of discovered media items BEFORE downloading.
// The user can select individual items or "Download All".
//
// DATA FLOW:
//   Parent (download/page.tsx) passes "items" (array of MediaItem from the API).
//   User selects which items to download.
//   User clicks "Download Selected" → parent calls useDownload().startBatch().
// =============================================================================

'use client'

import { useState, useCallback } from 'react'
import { Download, CheckSquare, Square, Image, Video, Film, Archive, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { MediaItem, MediaType } from '@/types'
import { formatBytes, formatDuration } from '@/utils/urlParser'
import { toast } from '@/store/toastStore'
import clsx from 'clsx'


// =============================================================================
// Props
// =============================================================================
interface MediaPreviewProps {
  // The list of media items extracted from the URL.
  items: MediaItem[]

  // Called when the user decides which items to download.
  onDownload: (selectedItems: MediaItem[]) => void

  // Whether a download is already in progress.
  isDownloading: boolean
}


export function MediaPreview({ items, onDownload, isDownloading }: MediaPreviewProps) {

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(items.map((item) => item.id))
  )
  // true while we are fetching and zipping files
  const [isZipping, setIsZipping] = useState(false)

  // Guard: show nothing if there are no items.
  if (items.length === 0) return null

  // ── SELECTION HELPERS ──

  // Toggle one item's selection.
  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      // Copy the Set (immutability rule — never mutate state directly).
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)  // Was selected → deselect
      } else {
        next.add(id)     // Was not selected → select
      }
      return next
    })
  }

  // Select or deselect ALL items.
  function toggleAll() {
    if (selectedIds.size === items.length) {
      // All selected → clear all.
      setSelectedIds(new Set())
    } else {
      // Not all selected → select all.
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }

  const selectedItems = items.filter((item) => selectedIds.has(item.id))

  // ── ZIP DOWNLOAD ──
  // Fetches each selected item's directUrl, bundles them with JSZip,
  // and triggers a browser download of the resulting .zip file.
  const downloadAsZip = useCallback(async () => {
    if (selectedItems.length === 0) return

    // Check that every selected item has a direct media URL.
    const itemsWithUrl = selectedItems.filter((item) => !!item.mediaUrl)
    if (itemsWithUrl.length === 0) {
      toast.error('No direct download URLs available for the selected items.')
      return
    }

    setIsZipping(true)
    toast.info(`Preparing ZIP for ${itemsWithUrl.length} file${itemsWithUrl.length !== 1 ? 's' : ''}…`)

    try {
      // Dynamically import JSZip — keeps the initial JS bundle smaller.
      const JSZip = (await import('jszip')).default
      const zip   = new JSZip()

      // Fetch each file and add it to the zip.
      await Promise.all(
        itemsWithUrl.map(async (item, index) => {
          const response = await fetch(item.mediaUrl!)
          if (!response.ok) throw new Error(`Failed to fetch item ${index + 1}`)
          const blob = await response.blob()

          // Derive a filename from the URL or fall back to a numbered name.
          const urlParts = item.mediaUrl!.split('/').pop()?.split('?')[0]
          const filename  = urlParts || `media_${index + 1}.${item.mediaType === 'image' ? 'jpg' : 'mp4'}`
          zip.file(filename, blob)
        })
      )

      // Generate the ZIP blob.
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // Create a temporary download link and click it programmatically.
      const url  = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `mediavault_${Date.now()}.zip`
      link.click()

      // Release the object URL after the download starts.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)

      toast.success(`ZIP downloaded — ${itemsWithUrl.length} file${itemsWithUrl.length !== 1 ? 's' : ''}`)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'ZIP creation failed'
      toast.error(message)
    } finally {
      setIsZipping(false)
    }
  }, [selectedItems])

  // ── ICON HELPER ──
  // Returns the right Lucide icon for each media type.
  function getMediaIcon(type: MediaType) {
    switch (type) {
      case 'video':
      case 'reel':
      case 'story': return <Film  className="w-3.5 h-3.5" />
      case 'image': return <Image className="w-3.5 h-3.5" />
      default:      return <Video className="w-3.5 h-3.5" />
    }
  }


  return (
    <div className="space-y-4">

      {/* ── HEADER ROW ── */}
      <div className="flex items-center justify-between">

        {/* Left: "X items found" with Select All toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {/* Show a filled checkbox if all are selected, empty if not */}
            {selectedIds.size === items.length
              ? <CheckSquare className="w-4 h-4 text-brand-600" />
              : <Square      className="w-4 h-4" />}
            <span>Select all</span>
          </button>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {items.length} item{items.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2">

          {/* ZIP archive button */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={selectedIds.size === 0 || isZipping || isDownloading}
            onClick={downloadAsZip}
            leftIcon={
              isZipping
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Archive  className="w-4 h-4" />
            }
            title="Download selected files as a single ZIP archive"
          >
            {isZipping ? 'Zipping…' : 'ZIP'}
          </Button>

          {/* Queue for background download button */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isDownloading}
            disabled={selectedIds.size === 0 || isDownloading}
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => onDownload(selectedItems)}
          >
            Download {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </div>
      </div>

      {/* ── MEDIA GRID ── */}
      {/* Responsive grid: 2 columns on mobile, 3 on tablet, 4 on desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => {

          const isSelected = selectedIds.has(item.id)

          return (
            <div
              key={item.id}
              // Clicking anywhere on the card toggles selection.
              onClick={() => toggleItem(item.id)}
              className={clsx(
                'relative rounded-lg overflow-hidden cursor-pointer',
                'border-2 transition-all duration-150',
                'hover:shadow-md',
                isSelected
                  ? 'border-brand-500 ring-2 ring-brand-500/20'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {/* THUMBNAIL */}
              <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                {item.thumbnailUrl ? (
                  // "object-cover" fills the container, cropping edges if needed.
                  // "loading=lazy" means the browser only loads this image
                  // when it is near the viewport — saves bandwidth.
                  <img
                    src={item.thumbnailUrl}
                    alt={item.caption ?? 'Media thumbnail'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  // Placeholder when no thumbnail URL is available.
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {getMediaIcon(item.mediaType)}
                  </div>
                )}
              </div>

              {/* SELECTION OVERLAY — checkbox in the top-right corner */}
              <div
                className={clsx(
                  'absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  'transition-colors duration-150',
                  isSelected
                    ? 'bg-brand-600 border-brand-600'
                    : 'bg-white/80 border-white'
                )}
              >
                {/* Show a white tick when selected */}
                {isSelected && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  </svg>
                )}
              </div>

              {/* MEDIA TYPE BADGE (bottom left) */}
              <div className="absolute bottom-2 left-2">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white bg-black/60 backdrop-blur-sm">
                  {getMediaIcon(item.mediaType)}
                  {item.mediaType}
                </span>
              </div>

              {/* FILE SIZE (bottom right) — only if known */}
              {item.fileSizeBytes && (
                <div className="absolute bottom-2 right-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] text-white bg-black/60 backdrop-blur-sm">
                    {formatBytes(item.fileSizeBytes)}
                  </span>
                </div>
              )}

              {/* VIDEO DURATION overlay (top left) — only for videos */}
              {item.durationSeconds && item.durationSeconds > 0 && (
                <div className="absolute top-2 left-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] text-white bg-black/60 backdrop-blur-sm">
                    {formatDuration(item.durationSeconds)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
