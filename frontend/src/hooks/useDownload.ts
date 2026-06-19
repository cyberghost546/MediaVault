// =============================================================================
// useDownload — Custom React Hook
// =============================================================================
// A "custom hook" is a function whose name starts with "use" and that can call
// other hooks. It lets you extract stateful logic out of components so the same
// logic can be shared across multiple components without copy-pasting.
//
// This hook wraps the download service + the download store into a single
// convenient API that any component can use like this:
//
//   const { extract, startDownload, isLoading, error } = useDownload()
//   await extract('https://instagram.com/p/ABC123/')
// =============================================================================

// "useState"  — stores component-level state (isLoading, error, etc.)
// "useCallback" — memoizes a function so it isn't re-created on every render
import { useState, useCallback } from 'react'
import { toast } from '@/store/toastStore'

// Import the service functions that talk to the PHP backend.
import * as downloadService from '@/services/downloadService'

// Import the Zustand store's hook so we can add/update jobs globally.
import { useDownloadStore } from '@/store/downloadStore'

// Import the settings store so we can read the user's download path.
import { useSettingsStore } from '@/store/settingsStore'

// Import types.
import type { MediaItem, DownloadJob } from '@/types'


// =============================================================================
// The return type of this hook — what components get back when they call it.
// =============================================================================
interface UseDownloadReturn {

  // State
  isExtracting:  boolean         // true while we are fetching media info
  isStarting:    boolean         // true while we are queuing a download
  extractedItems: MediaItem[]    // media found at the URL
  error:          string | null  // last error message, or null

  // Actions
  extract:       (url: string) => Promise<void>
  startDownload: (item: MediaItem) => Promise<void>
  startBatch:    (items: MediaItem[]) => Promise<void>
  clearError:    () => void
  clearItems:    () => void
}


// =============================================================================
// useDownload
// The hook itself. Call it at the TOP of any React component (never inside
// conditions or loops — this is the "Rules of Hooks").
// =============================================================================
export function useDownload(): UseDownloadReturn {

  // ---- LOCAL STATE ----

  // "useState<boolean>(false)" creates a boolean variable "isExtracting"
  // and a setter "setIsExtracting". Initial value is false.
  const [isExtracting,   setIsExtracting]   = useState<boolean>(false)
  const [isStarting,     setIsStarting]     = useState<boolean>(false)
  const [extractedItems, setExtractedItems] = useState<MediaItem[]>([])
  const [error,          setError]          = useState<string | null>(null)

  // ---- GLOBAL STATE ----

  // Read actions from the download store (Zustand).
  // "useDownloadStore" is the hook created by Zustand's "create()".
  const addJob    = useDownloadStore((s) => s.addJob)
  const updateJob = useDownloadStore((s) => s.updateJob)
  const setStatus = useDownloadStore((s) => s.setStatus)

  // Read the user's settings (to get the download path).
  const settings = useSettingsStore((s) => s.settings)


  // ---- ACTIONS ----

  // "useCallback" memoizes the function — it only creates a new function
  // reference when its dependencies (listed in the second argument []) change.
  // WHY: Without useCallback, a new function is created on every render,
  //      causing child components to re-render unnecessarily.

  // extract: Takes a URL, sends it to the backend, and stores the found media.
  const extract = useCallback(async (url: string) => {

    // Reset state before starting.
    setIsExtracting(true)
    setError(null)
    setExtractedItems([])

    // "try...catch" handles async errors.
    // If the API call throws, we catch it and show the message to the user.
    try {
      // Call the service function — this sends the URL to the PHP backend.
      // "await" pauses here until the server responds.
      const items = await downloadService.extractMedia(url)

      setExtractedItems(items)
      if (items.length > 0) {
        toast.success(`Found ${items.length} item${items.length !== 1 ? 's' : ''} — select and download below.`)
      } else {
        toast.warning('No downloadable media found at that URL.')
      }

    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'An unexpected error occurred'
      setError(message)
      toast.error(message)
    } finally {
      // "finally" runs whether the try succeeded or the catch triggered.
      // Always stop the loading spinner here.
      setIsExtracting(false)
    }
  }, [])  // empty array = no dependencies, function is created once


  // startDownload: Queues a single MediaItem for download.
  const startDownload = useCallback(async (item: MediaItem) => {

    setIsStarting(true)
    setError(null)

    try {
      // Tell the backend to start downloading this item.
      const job: DownloadJob = await downloadService.startDownload(
        item,
        settings.downloadPath
      )

      // Add the new job to the global store (Zustand).
      // This makes it appear instantly in the Download Manager UI.
      addJob(job)
      toast.success('Download queued!')
      pollProgress(job.id, { addJob, updateJob, setStatus })

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start download'
      setError(message)
      toast.error(message)
    } finally {
      setIsStarting(false)
    }
  }, [settings.downloadPath, addJob, updateJob, setStatus])


  // startBatch: Download ALL extracted items (or a selected subset).
  const startBatch = useCallback(async (items: MediaItem[]) => {

    setIsStarting(true)
    setError(null)

    try {
      // Download up to "maxConcurrentDownloads" items at once.
      const limit = settings.maxConcurrentDownloads

      // "chunk" splits the array into groups of "limit" size.
      // We process each group before starting the next.
      for (const chunk of chunkArray(items, limit)) {

        // "Promise.all" starts all downloads in the chunk AT THE SAME TIME
        // and waits until ALL of them have been queued.
        await Promise.all(
          chunk.map(async (item) => {
            const job = await downloadService.startDownload(item, settings.downloadPath)
            addJob(job)
            pollProgress(job.id, { addJob, updateJob, setStatus })
          })
        )
      }
      toast.success(`${items.length} download${items.length !== 1 ? 's' : ''} queued!`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch download failed'
      setError(message)
      toast.error(message)
    } finally {
      setIsStarting(false)
    }
  }, [settings.downloadPath, settings.maxConcurrentDownloads, addJob, updateJob, setStatus])


  // clearError: Lets the UI dismiss the error message.
  const clearError = useCallback(() => setError(null), [])

  // clearItems: Clears the preview grid (e.g. when user types a new URL).
  const clearItems = useCallback(() => setExtractedItems([]), [])


  // Return everything the component needs.
  return {
    isExtracting,
    isStarting,
    extractedItems,
    error,
    extract,
    startDownload,
    startBatch,
    clearError,
    clearItems,
  }
}


// =============================================================================
// pollProgress (private helper)
// Polls the backend every 2 seconds to get the latest download progress.
// Updates the Zustand store with fresh data so the progress bar re-renders.
//
// Stops polling when the download finishes (completed or failed).
// =============================================================================
function pollProgress(
  jobId: string,
  actions: {
    addJob:    (job: DownloadJob) => void
    updateJob: (id: string, updates: Partial<DownloadJob>) => void
    setStatus: (id: string, status: import('@/types').DownloadStatus) => void
  }
): void {

  // "setInterval" calls the function every 2000 milliseconds (2 seconds).
  // It returns an ID we can use to stop it later with "clearInterval".
  const intervalId = setInterval(async () => {

    try {
      // Ask the backend for the current state of this job.
      const job = await downloadService.getDownloadProgress(jobId)

      // Update the store with fresh data from the server.
      actions.updateJob(jobId, {
        status:           job.status,
        progressPercent:  job.progressPercent,
        downloadedBytes:  job.downloadedBytes,
        totalBytes:       job.totalBytes,
        speedBytesPerSec: job.speedBytesPerSec,
        etaSeconds:       job.etaSeconds,
        errorMessage:     job.errorMessage,
      })

      // If the download finished, stop polling — no more updates are needed.
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(intervalId)
      }

    } catch {
      // If the poll itself fails (network error), just stop polling.
      // The user can manually retry from the Download Manager.
      clearInterval(intervalId)
    }

  }, 2000)  // poll every 2 seconds
}


// =============================================================================
// chunkArray (private helper)
// Splits an array into sub-arrays of at most "size" elements each.
// Example: chunkArray([1,2,3,4,5], 2) → [[1,2], [3,4], [5]]
// =============================================================================
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    // "array.slice(i, i + size)" extracts a portion of the array.
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
