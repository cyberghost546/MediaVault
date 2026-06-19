// =============================================================================
// DOWNLOAD SERVICE
// All functions that talk to the PHP backend about downloading media.
// Components never call "api" directly — they call this service.
// WHY: If the API changes (new URL, new request format), we only fix it here.
// =============================================================================

// Import our pre-configured Axios instance.
import api from '@/services/api'

// Import TypeScript types.
import type {
  ApiResponse,
  DownloadJob,
  MediaItem,
  ProfileScanResult,
  HistoryRecord,
} from '@/types'


// =============================================================================
// extractMedia
// Sends a URL to the backend. The backend calls the Python extractor (yt-dlp)
// which finds all media items inside the URL and returns their details.
//
// This does NOT download files yet — it only discovers what is available.
//
// PARAMETERS:
//   url — the public URL the user pasted
//
// RETURNS:
//   An array of MediaItem objects describing each photo/video found.
// =============================================================================
export async function extractMedia(url: string): Promise<MediaItem[]> {

  // "api.post" sends an HTTP POST request to "/media/extract".
  // The second argument is the request body — the PHP backend reads it with json_decode().
  // "await" pauses execution here until the server responds (could be 2–10 seconds).
  const response = await api.post<ApiResponse<MediaItem[]>>('/media/extract', { url })

  // "response.data" is the JSON the PHP server returned.
  // It has the shape: { success: true, data: [...] } or { success: false, message: '...' }
  const body = response.data

  // If the server reported an error, throw it as a JavaScript Error.
  // The "?? 'Unknown error'" part handles cases where "message" is missing.
  if (!body.success) {
    throw new Error(body.message ?? 'Failed to extract media')
  }

  // Return the array of MediaItems. "?? []" means "if data is undefined, return []]".
  return body.data ?? []
}


// =============================================================================
// startDownload
// Tells the backend to begin downloading a specific MediaItem.
// The backend queues the job and starts the Python downloader.
//
// RETURNS:
//   A DownloadJob object with the job's initial state (status: 'pending').
// =============================================================================
export async function startDownload(
  item:            MediaItem,
  destinationPath: string,
): Promise<DownloadJob> {

  const response = await api.post<ApiResponse<DownloadJob>>('/download/start', {
    // Send the media item and where to save it.
    mediaItemId:     item.id,
    mediaUrl:        item.mediaUrl,
    platform:        item.platform,
    mediaType:       item.mediaType,
    destinationPath: destinationPath,
  })

  const body = response.data
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Failed to start download')
  }

  return body.data
}


// =============================================================================
// pauseDownload
// Sends a pause signal to the backend for a specific download job.
// The backend tells yt-dlp to stop writing bytes.
// =============================================================================
export async function pauseDownload(jobId: string): Promise<void> {

  // "api.post" with just a job ID — no large body needed.
  const response = await api.post<ApiResponse<null>>(`/download/${jobId}/pause`)

  if (!response.data.success) {
    throw new Error(response.data.message ?? 'Failed to pause download')
  }
}


// =============================================================================
// resumeDownload
// Signals the backend to resume a paused download.
// yt-dlp supports resuming by checking how much of the file already exists.
// =============================================================================
export async function resumeDownload(jobId: string): Promise<void> {

  const response = await api.post<ApiResponse<null>>(`/download/${jobId}/resume`)

  if (!response.data.success) {
    throw new Error(response.data.message ?? 'Failed to resume download')
  }
}


// =============================================================================
// retryDownload
// Resets a failed download and tries again.
// The "retryCount" in the database is incremented to track how many times
// we have tried.
// =============================================================================
export async function retryDownload(jobId: string): Promise<void> {

  const response = await api.post<ApiResponse<null>>(`/download/${jobId}/retry`)

  if (!response.data.success) {
    throw new Error(response.data.message ?? 'Failed to retry download')
  }
}


// =============================================================================
// cancelDownload
// Cancels a download completely and removes the partial file from disk.
// =============================================================================
export async function cancelDownload(jobId: string): Promise<void> {

  // "api.delete" sends an HTTP DELETE request — the right verb for removal.
  const response = await api.delete<ApiResponse<null>>(`/download/${jobId}`)

  if (!response.data.success) {
    throw new Error(response.data.message ?? 'Failed to cancel download')
  }
}


// =============================================================================
// getDownloadProgress
// Polls the backend for the current state of a download job.
// Used by the useDownload hook to keep the UI progress bar up to date.
// =============================================================================
export async function getDownloadProgress(jobId: string): Promise<DownloadJob> {

  const response = await api.get<ApiResponse<DownloadJob>>(`/download/${jobId}/progress`)

  const body = response.data
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Failed to get progress')
  }

  return body.data
}


// =============================================================================
// scanProfile
// Scans a public profile URL and returns all accessible media items.
// This can take a long time for accounts with many posts.
// =============================================================================
export async function scanProfile(
  profileUrl: string,
  maxPosts:   number = 100,
): Promise<ProfileScanResult> {

  // Increase the timeout for profile scans because they can take 30+ seconds.
  const response = await api.post<ApiResponse<ProfileScanResult>>(
    '/profile/scan',
    { profileUrl, maxPosts },
    { timeout: 120_000 }  // 2 minutes for large profiles
  )

  const body = response.data
  if (!body.success || !body.data) {
    throw new Error(body.message ?? 'Failed to scan profile')
  }

  return body.data
}


// =============================================================================
// getHistory
// Returns the download history stored in MySQL.
// Supports pagination: "page" and "limit" control which records to fetch.
// =============================================================================
export async function getHistory(page = 1, limit = 50): Promise<HistoryRecord[]> {

  // "api.get" with query parameters passed as "params".
  // Axios appends them to the URL: "/history?page=1&limit=50"
  const response = await api.get<ApiResponse<HistoryRecord[]>>('/history', {
    params: { page, limit },
  })

  const body = response.data
  if (!body.success) {
    throw new Error(body.message ?? 'Failed to load history')
  }

  return body.data ?? []
}


// =============================================================================
// deleteHistoryRecord
// Removes a single history entry from the database.
// Does NOT delete the actual file from disk — only the history record.
// =============================================================================
export async function deleteHistoryRecord(id: number): Promise<void> {

  const response = await api.delete<ApiResponse<null>>(`/history/${id}`)

  if (!response.data.success) {
    throw new Error(response.data.message ?? 'Failed to delete history record')
  }
}
