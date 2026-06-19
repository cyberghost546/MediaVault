// =============================================================================
// FILE HELPER UTILITY
// Functions for generating file names, organising folders, and detecting
// duplicate files by comparing their SHA-256 hash.
// =============================================================================

// Import our shared types.
import type { MediaItem, Platform } from '@/types'


// =============================================================================
// buildFilePath
// Constructs the full destination path for a downloaded file.
//
// Example output:
//   "downloads/instagram/nasa/2024-06-19_AbCdEfGh.mp4"
//
// PARAMETERS:
//   basePath  — the root download folder chosen by the user (e.g. "~/Downloads")
//   item      — the MediaItem we are about to save
//   organise  — if true, create platform/username sub-folders automatically
//   timestamp — if true, prefix the filename with the post date
// =============================================================================
export function buildFilePath(
  basePath:   string,
  item:       MediaItem,
  organise:   boolean,
  timestamp:  boolean,
): string {

  // Determine the file extension from the media URL.
  // "getExtension" is defined below.
  const ext = getExtension(item.mediaUrl, item.mediaType)

  // Build the base filename from the media item's ID.
  // IDs look like "instagram_AbCdEfGh" — we take only the short part after "_".
  const shortId = item.id.split('_').pop() ?? item.id

  // If timestamp mode is on, prefix with the date from "postedAt".
  // Example: "2024-06-19_AbCdEfGh.mp4"
  const datePrefix = timestamp && item.postedAt
    ? formatDateForFilename(item.postedAt) + '_'
    : ''

  // The final filename (e.g. "2024-06-19_AbCdEfGh.mp4").
  const filename = `${datePrefix}${shortId}${ext}`

  // If "organise" is off, just put files directly in the base folder.
  if (!organise) {
    return joinPath(basePath, filename)
  }

  // Otherwise nest by:  basePath / platform / username / filename
  // This keeps files tidy when downloading from multiple accounts.
  const platformDir = item.platform   // e.g. "instagram"
  const userDir     = sanitiseFolder(item.username ?? 'unknown')

  // "joinPath" is defined below — it safely joins path segments.
  return joinPath(basePath, platformDir, userDir, filename)
}


// =============================================================================
// getExtension
// Returns the correct file extension for a media item.
//
// WHY: The URL might be a CDN link ending in "?token=xyz" with no clear extension.
//      We use the mediaType as a fallback.
// =============================================================================
export function getExtension(mediaUrl: string, mediaType: string): string {

  // Try to parse the URL and extract the pathname.
  try {
    const url      = new URL(mediaUrl)
    const pathname = url.pathname   // e.g. "/v/t51/abc.mp4"

    // Extract the extension from the last segment of the pathname.
    // "pathname.split('.').pop()" gives us the last piece after a dot.
    const rawExt = pathname.split('.').pop()?.toLowerCase()

    // Only return it if it is a known media extension (not a token or random suffix).
    if (rawExt && KNOWN_EXTENSIONS.has(rawExt)) {
      return `.${rawExt}`
    }
  } catch {
    // URL parsing failed — fall through to the type-based fallback.
  }

  // Fallback: choose a sensible extension based on the mediaType.
  const fallbacks: Record<string, string> = {
    image:   '.jpg',
    video:   '.mp4',
    reel:    '.mp4',
    story:   '.mp4',
    audio:   '.mp3',
    unknown: '.bin',  // ".bin" is generic binary — user can rename it
  }
  return fallbacks[mediaType] ?? '.bin'
}

// A set of file extensions we recognise as valid media formats.
// Using a Set makes "KNOWN_EXTENSIONS.has(ext)" very fast (O(1) lookup).
const KNOWN_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'avif',  // images
  'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v',            // videos
  'mp3', 'm4a', 'aac', 'ogg', 'wav',                    // audio
])


// =============================================================================
// sanitiseFolder
// Removes characters that are illegal in folder/file names on Windows, macOS,
// and Linux. Replaces them with an underscore.
//
// Illegal characters:  \ / : * ? " < > |  (Windows is the most restrictive)
//
// Example:
//   sanitiseFolder('john:doe/2024')  → 'john_doe_2024'
//   sanitiseFolder('nasa')           → 'nasa'
// =============================================================================
export function sanitiseFolder(name: string): string {

  // "[\\\\/:*?\"<>|]" is a regex character class that matches any of these chars.
  // "g" flag means replace ALL occurrences, not just the first.
  return name.replace(/[\\/:*?"<>|]/g, '_').trim()
}


// =============================================================================
// formatDateForFilename
// Converts an ISO 8601 date string into "YYYY-MM-DD" suitable for filenames.
//
// Example:
//   formatDateForFilename('2024-06-19T10:30:00Z')  → '2024-06-19'
// =============================================================================
export function formatDateForFilename(isoDate: string): string {
  // "new Date(isoDate)" parses the ISO string into a JavaScript Date object.
  const d = new Date(isoDate)

  // Check if the date is valid (bad strings produce an "Invalid Date").
  if (isNaN(d.getTime())) return 'unknown-date'

  // Format as YYYY-MM-DD using UTC time to avoid timezone shifts.
  const yyyy = d.getUTCFullYear()
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0')  // months are 0-indexed!
  const dd   = String(d.getUTCDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}


// =============================================================================
// joinPath
// Safely joins path segments with the correct separator.
//
// WHY: On Windows the separator is "\", on macOS/Linux it is "/".
//      When running in a browser or Capacitor we always use "/" because
//      the PHP backend runs on Linux/macOS.
//      When saving files on a Windows desktop we might need "\".
//
// For simplicity we always use "/" here. Capacitor's Filesystem plugin
// handles the conversion to the native separator internally.
//
// Example:
//   joinPath('downloads', 'instagram', 'nasa', 'photo.jpg')
//   → 'downloads/instagram/nasa/photo.jpg'
// =============================================================================
export function joinPath(...segments: string[]): string {

  return segments
    // Remove trailing slashes from each segment.
    .map((s) => s.replace(/\/+$/, ''))
    // Remove leading slashes from every segment EXCEPT the first.
    .map((s, i) => (i === 0 ? s : s.replace(/^\/+/, '')))
    // Join with "/" separator.
    .join('/')
}


// =============================================================================
// getMimeType
// Returns the MIME type string for a given file extension.
// Used when creating Blob objects or setting Content-Type headers.
//
// Example:
//   getMimeType('.mp4')  → 'video/mp4'
//   getMimeType('.jpg')  → 'image/jpeg'
// =============================================================================
export function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.avif': 'image/avif',
    '.mp4':  'video/mp4',
    '.mov':  'video/quicktime',
    '.avi':  'video/x-msvideo',
    '.mkv':  'video/x-matroska',
    '.webm': 'video/webm',
    '.mp3':  'audio/mpeg',
    '.m4a':  'audio/mp4',
    '.aac':  'audio/aac',
    '.ogg':  'audio/ogg',
    '.wav':  'audio/wav',
  }
  return mimeMap[ext.toLowerCase()] ?? 'application/octet-stream'
}
