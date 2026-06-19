// Import our Platform type so TypeScript enforces valid return values.
import type { Platform } from '@/types'

// =============================================================================
// PLATFORM PATTERNS
// Each entry maps a platform name to an array of URL patterns (RegExp).
// RegExp (Regular Expression) is a pattern-matching mini-language built into
// JavaScript. "/instagram\.com/i" means "match 'instagram.com' (case insensitive)".
// WHY an array of patterns: some platforms have multiple domains
//   (e.g. "x.com" and "twitter.com" are the same platform).
// =============================================================================
const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  facebook: [
    // Matches "facebook.com/..." and "fb.com/..." and "fb.watch/..."
    /facebook\.com/i,
    /fb\.com/i,
    /fb\.watch/i,
  ],

  twitter: [
    // Matches "twitter.com/..." and "x.com/..."
    /twitter\.com/i,
    /x\.com/i,
  ],

  instagram: [
    // Matches "instagram.com/..."
    /instagram\.com/i,
  ],

  tiktok: [
    // Matches "tiktok.com/..." and the short share link "vm.tiktok.com/..."
    /tiktok\.com/i,
    /vm\.tiktok\.com/i,
  ],

  snapchat: [
    // Matches "snapchat.com/..." and the short link "t.snapchat.com/..."
    /snapchat\.com/i,
    /t\.snapchat\.com/i,
  ],

  // "unknown" is a valid Platform value but has no patterns to match against.
  // It is only returned as a fallback at the end of detectPlatform().
  unknown: [],
}


// =============================================================================
// detectPlatform
// Takes a URL string and returns the matching Platform.
// Returns 'unknown' if no pattern matches.
//
// Example:
//   detectPlatform('https://www.instagram.com/p/ABC123/')  → 'instagram'
//   detectPlatform('https://example.com/foo')              → 'unknown'
// =============================================================================
export function detectPlatform(url: string): Platform {

  // Loop over every entry in PLATFORM_PATTERNS.
  // "Object.entries()" turns the object into an array of [key, value] pairs:
  //   [ ['facebook', [/facebook\.com/i, ...]], ['twitter', [...]], ... ]
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {

    // Skip 'unknown' because it has no patterns and would always fail the test.
    if (platform === 'unknown') continue

    // "patterns.some()" returns true if AT LEAST ONE pattern matches the URL.
    // "regex.test(url)" returns true if the regex finds a match in the URL string.
    const matched = patterns.some((regex) => regex.test(url))

    // If this platform's patterns matched, return the platform name.
    // "as Platform" tells TypeScript "trust me, this string is a valid Platform".
    if (matched) return platform as Platform
  }

  // No pattern matched — the URL is from an unsupported platform.
  return 'unknown'
}


// =============================================================================
// isProfileUrl
// Tries to guess whether the URL points to a PROFILE page vs a single POST.
//
// WHY: The UI behaves differently for profiles (batch scan) vs posts (single download).
//
// IMPORTANT: This is a best-effort heuristic. It is NOT 100% accurate because
//            social media platforms change their URL structures. The backend
//            does the authoritative check using yt-dlp metadata.
// =============================================================================
export function isProfileUrl(url: string, platform: Platform): boolean {

  switch (platform) {

    case 'instagram':
      // Instagram post URLs look like:  /p/ABC123/  or  /reel/ABC123/
      // Instagram profile URLs look like:  /username/  (no "p" or "reel" segment)
      // So if the URL does NOT contain "/p/" or "/reel/", it is likely a profile.
      return !(/\/p\/|\/reel\/|\/tv\//i.test(url))

    case 'twitter':
      // Twitter/X post URLs always contain "/status/" followed by a number.
      // If "/status/" is absent, it is a profile page.
      return !(/\/status\/\d+/i.test(url))

    case 'facebook':
      // Facebook posts contain "/posts/", "/videos/", "/reel/", or "story_fbid=".
      // Anything else is treated as a profile/page.
      return !(/\/posts\/|\/videos\/|\/reel\/|story_fbid=/i.test(url))

    case 'tiktok':
      // TikTok video URLs contain "/@username/video/NUMBER".
      // A profile URL is just "/@username".
      return !(/\/@[\w.]+\/video\/\d+/i.test(url))

    case 'snapchat':
      // Snapchat spotlight URLs contain "/spotlight/".
      // Profile URLs are "/add/username" or "/p/username".
      return !(/\/spotlight\//i.test(url))

    default:
      // For unknown platforms we cannot make a guess, so return false.
      return false
  }
}


// =============================================================================
// getPlatformDisplayName
// Returns a human-friendly label for each platform.
// Used in the UI to show "Instagram" instead of "instagram".
// =============================================================================
export function getPlatformDisplayName(platform: Platform): string {
  // A simple lookup table.
  const names: Record<Platform, string> = {
    facebook:  'Facebook',
    twitter:   'X (Twitter)',
    instagram: 'Instagram',
    tiktok:    'TikTok',
    snapchat:  'Snapchat',
    unknown:   'Unknown Platform',
  }
  // Return the matching name. If somehow the platform is not in the table,
  // fall back to just capitalising the first letter.
  return names[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1)
}


// =============================================================================
// getPlatformColor
// Returns a Tailwind CSS color class for each platform's brand color.
// Usage:  <span className={getPlatformColor('instagram')}>...</span>
// =============================================================================
export function getPlatformColor(platform: Platform): string {
  const colors: Record<Platform, string> = {
    facebook:  'text-blue-600',
    twitter:   'text-sky-400',
    instagram: 'text-pink-500',
    tiktok:    'text-neutral-900 dark:text-white',
    snapchat:  'text-yellow-400',
    unknown:   'text-gray-400',
  }
  return colors[platform] ?? 'text-gray-400'
}
