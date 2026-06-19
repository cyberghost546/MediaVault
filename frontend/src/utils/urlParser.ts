// =============================================================================
// URL PARSER UTILITY
// Validates and normalises URLs before we send them to the backend.
// "Normalise" means: strip tracking parameters, ensure https, trim whitespace.
// =============================================================================


// =============================================================================
// isValidUrl
// Returns true if the string is a syntactically valid URL.
//
// WHY: We want to show an error message before hitting the backend with junk input.
// HOW: We try to construct a URL object. If it throws an error, the URL is invalid.
//
// Example:
//   isValidUrl('https://instagram.com/p/ABC')  → true
//   isValidUrl('not a url')                    → false
//   isValidUrl('')                             → false
// =============================================================================
export function isValidUrl(input: string): boolean {

  // First, remove whitespace from both ends (users sometimes paste with spaces).
  const trimmed = input.trim()

  // An empty string is not a valid URL.
  if (trimmed.length === 0) return false

  // "try { ... } catch { ... }" is error handling.
  // The "new URL()" constructor throws a TypeError if the string is not a valid URL.
  // We catch the error and return false instead of crashing the app.
  try {
    const url = new URL(trimmed)

    // Even if parsing succeeds, we only accept http and https URLs.
    // WHY: We do not want "file://", "ftp://", "javascript:", etc.
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    // URL() threw — the string is not a valid URL.
    return false
  }
}


// =============================================================================
// normaliseUrl
// Cleans up a URL before processing.
// Removes common tracking parameters (utm_source, fbclid, etc.) that do not
// affect what content the URL points to, but clutter our database records.
//
// Example:
//   Input:  "https://www.instagram.com/p/ABC123/?utm_source=ig_web_copy_link&igsh=XYZ"
//   Output: "https://www.instagram.com/p/ABC123/"
// =============================================================================
export function normaliseUrl(input: string): string {

  // Trim whitespace first.
  const trimmed = input.trim()

  // If it's not valid, return it as-is (the caller checks validity separately).
  if (!isValidUrl(trimmed)) return trimmed

  // Parse the URL so we can manipulate its parts individually.
  // "new URL(trimmed)" breaks the URL into: protocol, hostname, pathname, searchParams, etc.
  const url = new URL(trimmed)

  // List of tracking/analytics parameters to REMOVE.
  // These are added by social platforms and ad systems to track where traffic comes from.
  // Removing them makes URLs cleaner and avoids false "new URL" detections in duplicate checking.
  const TRACKING_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',       // Facebook click ID
    'igshid',       // Instagram share ID
    'igsh',         // Instagram share
    's',            // Twitter/X share token
    'ref_src',      // Twitter referral
    'ref_url',      // Twitter referral URL
    '_nc_cat',      // Facebook CDN category
    '_nc_sid',      // Facebook session ID
    'oe',           // Facebook encoding
    'oh',           // Facebook hash
    'feature',      // YouTube / TikTok
  ]

  // Delete each tracking parameter from the URL's query string.
  // "url.searchParams" is a URLSearchParams object — a map of query key → value.
  TRACKING_PARAMS.forEach((param) => url.searchParams.delete(param))

  // Force https:// — never send http:// to our backend.
  // WHY: http:// is unencrypted. All social media sites use https anyway.
  url.protocol = 'https:'

  // Remove "www." from the hostname to standardise.
  // "instagram.com" and "www.instagram.com" are the same — we keep just "instagram.com".
  url.hostname = url.hostname.replace(/^www\./, '')

  // Convert the URL back to a string. "toString()" reassembles all the parts.
  return url.toString()
}


// =============================================================================
// extractUsername
// Tries to pull the username/handle out of a profile URL.
//
// This is a best-effort function — it may not work for every URL format.
// The backend (Python yt-dlp) is the authoritative source for the username.
//
// Example:
//   extractUsername('https://instagram.com/nasa/')          → 'nasa'
//   extractUsername('https://twitter.com/SpaceX/status/1') → 'SpaceX'
// =============================================================================
export function extractUsername(url: string): string | null {

  // Safety check — return null for bad input.
  if (!isValidUrl(url)) return null

  // Parse the URL to get the pathname (the part after the domain).
  // For "https://instagram.com/nasa/posts/", pathname is "/nasa/posts/".
  const { pathname } = new URL(url)

  // Split the pathname by "/" to get the path segments.
  // "/nasa/posts/".split("/") → ["", "nasa", "posts", ""]
  // Then filter out empty strings.
  const segments = pathname.split('/').filter(Boolean)

  // The first non-empty segment is usually the username on most platforms.
  // For Twitter/X the username has an "@" prefix in the URL that we strip.
  const first = segments[0] ?? null
  if (!first) return null

  // Remove "@" prefix if present (TikTok uses "/@username" format).
  return first.startsWith('@') ? first.slice(1) : first
}


// =============================================================================
// formatBytes
// Converts a raw byte number into a human-readable string.
//
// Example:
//   formatBytes(1024)        → "1.0 KB"
//   formatBytes(1048576)     → "1.0 MB"
//   formatBytes(1073741824)  → "1.0 GB"
//   formatBytes(0)           → "0 B"
// =============================================================================
export function formatBytes(bytes: number, decimals = 1): string {

  // Edge case: 0 bytes.
  if (bytes === 0) return '0 B'

  // Each unit is 1024 times larger than the previous.
  const k = 1024

  // The unit labels in order from smallest to largest.
  const units = ['B', 'KB', 'MB', 'GB', 'TB']

  // Find which unit to use.
  // Math.log(bytes) / Math.log(k) tells us which power of 1024 the value is near.
  // Math.floor() rounds down to get the index into our units array.
  // Math.min(..., units.length - 1) prevents going past 'TB'.
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)

  // Divide the bytes by the appropriate power of 1024 and format with fixed decimals.
  return (bytes / Math.pow(k, i)).toFixed(decimals) + ' ' + units[i]
}


// =============================================================================
// formatDuration
// Converts seconds into a "HH:MM:SS" or "MM:SS" string.
//
// Example:
//   formatDuration(65)   → "1:05"
//   formatDuration(3661) → "1:01:01"
//   formatDuration(30)   → "0:30"
// =============================================================================
export function formatDuration(totalSeconds: number): string {

  // Calculate hours, minutes, and remaining seconds.
  const hours   = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  // Pad minutes and seconds to 2 digits (e.g. "5" → "05").
  // "String(n).padStart(2, '0')" adds a leading zero if the number is less than 10.
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')

  // Only show hours if the video is at least 1 hour long.
  if (hours > 0) {
    return `${hours}:${mm}:${ss}`
  }
  return `${minutes}:${ss}`
}
