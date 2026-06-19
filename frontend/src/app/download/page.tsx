// =============================================================================
// app/download/page.tsx — SINGLE LINK DOWNLOAD PAGE  (URL: "/download")
// =============================================================================
// This page has three phases:
//   Phase 1: "Idle"      — only the URL input is shown
//   Phase 2: "Analysing" — spinner while the backend extracts media
//   Phase 3: "Preview"   — the MediaPreview grid is shown; user picks files
//
// DATA FLOW on this page:
//   UrlInput submits URL
//     → useDownload().extract(url)
//       → downloadService.extractMedia(url)
//         → PHP: POST /media/extract → Python: yt-dlp
//           → returns MediaItem[]
//   MediaPreview shows items
//     → User clicks Download
//       → useDownload().startBatch(selectedItems)
//         → downloadService.startDownload() for each
//           → PHP: POST /download/start → Python: downloads file
//             → Job added to Zustand store
//               → User sees it in /manager
// =============================================================================

'use client'

import type { Metadata } from 'next'
import { UrlInput    } from '@/components/download/UrlInput'
import { MediaPreview} from '@/components/download/MediaPreview'
import { Card        } from '@/components/ui/Card'
import { useDownload } from '@/hooks/useDownload'


export default function DownloadPage() {

  // Use our custom hook which manages extraction state and calls the services.
  const {
    isExtracting,    // true while the API is working
    isStarting,      // true while we are queuing download jobs
    extractedItems,  // array of MediaItem found at the URL
    error,           // any error message from the API
    extract,         // function: extract(url) → starts the extraction
    startBatch,      // function: startBatch(items) → queues downloads
    clearError,      // function: dismisses the error message
  } = useDownload()


  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* PAGE HEADING */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Single Link Download</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Paste a public post URL to discover and download its media.
        </p>
      </div>

      {/* URL INPUT CARD */}
      <Card>
        <UrlInput
          onExtract={extract}
          isLoading={isExtracting}
          externalError={error}
        />
      </Card>

      {/* MEDIA PREVIEW — only shown after items are found */}
      {extractedItems.length > 0 && (
        <Card header={`Found ${extractedItems.length} item${extractedItems.length !== 1 ? 's' : ''}`}>
          <MediaPreview
            items={extractedItems}
            onDownload={startBatch}
            isDownloading={isStarting}
          />
        </Card>
      )}

      {/* EMPTY STATE — after a successful extraction that found nothing */}
      {!isExtracting && !error && extractedItems.length === 0 && (
        <Card>
          <div className="py-8 text-center text-gray-400 text-sm">
            Paste a URL above to begin. We will find all downloadable media inside it.
          </div>
        </Card>
      )}

      {/* LEGAL NOTICE */}
      <p className="text-xs text-gray-400 dark:text-gray-600 text-center leading-relaxed">
        Only download content you own or have permission to download.
        Respect platform Terms of Service. MediaVault does not bypass authentication
        or DRM protections.
      </p>
    </div>
  )
}
