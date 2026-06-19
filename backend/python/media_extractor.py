#!/usr/bin/env python3
# Force UTF-8 output on Windows so emoji and non-ASCII characters in captions
# do not crash the script with a UnicodeEncodeError.
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
=============================================================================
media_extractor.py — MEDIA EXTRACTION SERVICE
=============================================================================
This script is called by the PHP PythonBridge service.
It accepts a URL, uses yt-dlp to extract media metadata (titles, direct
download URLs, thumbnails, file sizes), and prints a JSON object to stdout.

PHP reads this JSON output and forwards it to the frontend.

USAGE (called by PHP):
  python3 media_extractor.py --url "https://..." --mode extract
  python3 media_extractor.py --url "https://..." --mode profile --max-posts 100

SECURITY PRINCIPLES:
  - This script only READS public content. It never authenticates.
  - It never downloads the actual file — that is the downloader.py job.
  - It respects yt-dlp's built-in rate limiting to avoid hammering servers.
=============================================================================
"""

# "argparse" is Python's built-in command-line argument parser.
# It lets us define what arguments this script accepts and handles errors.
import argparse

# "json" lets us encode Python dicts into JSON strings (and decode back).
import json

# "sys" lets us write to stdout/stderr and exit with a status code.
import sys

# "uuid" generates unique IDs for each discovered media item.
import uuid

# "datetime" for recording when media was extracted.
from datetime import datetime, timezone

# "yt_dlp" is the core extraction library (installed via requirements.txt).
# "YoutubeDL" is the main class that does all the work.
import yt_dlp


# =============================================================================
# extract_single_url
# =============================================================================
# Takes a public post URL and returns a list of MediaItem dicts.
# One URL can contain multiple items (e.g. Instagram carousels have 10+ photos).
#
# PARAMETERS:
#   url (str) — the public URL from the user
#
# RETURNS:
#   list of dicts matching our TypeScript MediaItem interface
# =============================================================================
def extract_single_url(url: str) -> list:

    # yt-dlp options dictionary.
    # These control exactly how yt-dlp behaves.
    ydl_opts = {
        # "quiet=True" suppresses yt-dlp's normal console output.
        # We only want the JSON — not progress messages.
        'quiet': True,

        # "no_warnings=True" suppresses non-fatal warnings.
        'no_warnings': True,

        # "extract_flat=False" means: fully extract all info (including direct media URLs).
        # Setting this to True would only give us a list of URLs without metadata.
        'extract_flat': False,

        # Do NOT write any files — we only want metadata.
        # "skip_download=True" extracts info without downloading the actual media.
        'skip_download': True,

        # Prefer the best quality format available.
        # "bestvideo+bestaudio/best" means:
        #   1st choice: download best video + best audio separately and merge them
        #   Fallback:   download the single best combined format
        'format': 'bestvideo+bestaudio/best',

        # Socket timeout in seconds — prevent hanging forever on slow sites.
        'socket_timeout': 30,

        # Do not crash on errors — return partial results.
        'ignoreerrors': True,
    }

    # "with yt_dlp.YoutubeDL(ydl_opts) as ydl:" creates the yt-dlp instance
    # and automatically closes it when the "with" block ends.
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:

        # "extract_info(url, download=False)" fetches metadata WITHOUT downloading.
        # "download=False" is an extra safety net on top of "skip_download".
        info = ydl.extract_info(url, download=False)

    # If yt-dlp found nothing, return an empty list.
    if info is None:
        return []

    # yt-dlp returns a dict. If it found multiple items (playlist/carousel),
    # it nests them in "entries". Otherwise it is a single item.
    entries = info.get('entries') or [info]

    # Build a MediaItem dict for each entry.
    items = []
    for entry in entries:
        if entry is None:
            continue  # skip None entries (failed sub-extractors)

        item = build_media_item(entry, url)
        if item:
            items.append(item)

    return items


# =============================================================================
# scan_profile
# =============================================================================
# Scans a public profile and returns all post media found.
# Uses yt-dlp's "extract_flat" mode to get a list of post URLs quickly,
# then re-extracts each post for full metadata.
# =============================================================================
def scan_profile(profile_url: str, max_posts: int = 100) -> dict:

    # "extract_flat=True" gets a quick list of post URLs without full metadata.
    # This is much faster for large profiles — we get 100 URLs in ~5s instead of ~2min.
    flat_opts = {
        'quiet':         True,
        'no_warnings':   True,
        'extract_flat':  True,
        'skip_download': True,
        'playlistend':   max_posts,  # Stop after this many posts
        'ignoreerrors':  True,
    }

    with yt_dlp.YoutubeDL(flat_opts) as ydl:
        profile_info = ydl.extract_info(profile_url, download=False)

    if profile_info is None:
        raise ValueError('Could not scan profile. It may be private or the URL format changed.')

    # Build the profile summary.
    result = {
        'profileUrl':     profile_url,
        'platform':       detect_platform(profile_url),
        'username':       profile_info.get('uploader_id') or profile_info.get('channel_id') or 'unknown',
        'displayName':    profile_info.get('uploader') or profile_info.get('channel'),
        'avatarUrl':      profile_info.get('thumbnails', [{}])[-1].get('url'),
        'totalPostsFound':len(profile_info.get('entries', [])),
        'items':          [],
        'scannedAt':      datetime.now(timezone.utc).isoformat(),
    }

    # Now extract full metadata for each post entry.
    # We limit to max_posts to avoid hitting rate limits.
    full_opts = {
        'quiet':         True,
        'no_warnings':   True,
        'skip_download': True,
        'format':        'bestvideo+bestaudio/best',
        'ignoreerrors':  True,
    }

    entries = profile_info.get('entries', [])[:max_posts]

    with yt_dlp.YoutubeDL(full_opts) as ydl:
        for entry in entries:
            if entry is None:
                continue

            # Each "flat" entry has a "url" field pointing to the individual post.
            post_url = entry.get('url') or entry.get('webpage_url')
            if not post_url:
                continue

            try:
                post_info = ydl.extract_info(post_url, download=False)
                if post_info is None:
                    continue

                # A post might have multiple items (carousel).
                post_entries = post_info.get('entries') or [post_info]
                for pe in post_entries:
                    if pe:
                        item = build_media_item(pe, post_url)
                        if item:
                            result['items'].append(item)
            except Exception:
                # Skip posts that fail individually — continue with the rest.
                continue

    return result


# =============================================================================
# build_media_item
# =============================================================================
# Converts a yt-dlp "entry" dict into our MediaItem dict format.
# =============================================================================
def build_media_item(entry: dict, source_url: str) -> dict | None:

    # The direct URL to the media file.
    # yt-dlp puts the best format URL in "url" for non-playlist entries.
    media_url = entry.get('url') or entry.get('webpage_url')
    if not media_url:
        return None  # Cannot build a useful item without a URL

    # Determine media type from yt-dlp's "ext" (extension) and other fields.
    ext       = entry.get('ext', '').lower()
    media_type = guess_media_type(entry)

    # Get the thumbnail URL. yt-dlp returns a list of thumbnails sorted by resolution.
    # We take the last one which is usually the highest resolution.
    thumbnails  = entry.get('thumbnails') or []
    thumbnail   = thumbnails[-1].get('url') if thumbnails else entry.get('thumbnail')

    # "upload_date" from yt-dlp is in "YYYYMMDD" format.
    # We convert it to ISO 8601: "2024-06-19T00:00:00Z"
    raw_date   = entry.get('upload_date')
    posted_at  = None
    if raw_date and len(raw_date) == 8:
        posted_at = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}T00:00:00Z"

    return {
        # Generate a unique ID for this item.
        # "str(uuid.uuid4())[:8]" takes the first 8 characters of a random UUID.
        'id':            detect_platform(source_url) + '_' + str(uuid.uuid4()).replace('-', '')[:12],

        # The original URL the user pasted.
        'sourceUrl':     source_url,

        # The direct download URL found by yt-dlp.
        'mediaUrl':      media_url,

        # Which social platform.
        'platform':      detect_platform(source_url),

        # image, video, reel, story, etc.
        'mediaType':     media_type,

        # Thumbnail preview image.
        'thumbnailUrl':  thumbnail,

        # Uploader's username/handle.
        'username':      entry.get('uploader_id') or entry.get('channel_id'),

        # Post caption/title.
        'caption':       entry.get('description') or entry.get('title'),

        # File size in bytes. May be None if yt-dlp could not determine it.
        'fileSizeBytes': entry.get('filesize') or entry.get('filesize_approx'),

        # Duration in seconds (for videos). None for images.
        'durationSeconds': entry.get('duration'),

        # Width and height in pixels.
        'width':   entry.get('width'),
        'height':  entry.get('height'),

        # When the post was published (ISO 8601).
        'postedAt':   posted_at,

        # When we extracted it (right now).
        'extractedAt': datetime.now(timezone.utc).isoformat(),
    }


# =============================================================================
# guess_media_type
# =============================================================================
# Maps yt-dlp entry fields to our MediaType values.
# =============================================================================
def guess_media_type(entry: dict) -> str:

    ext = (entry.get('ext') or '').lower()

    # Video extensions → 'video'.
    if ext in {'mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'}:
        return 'video'

    # Image extensions → 'image'.
    if ext in {'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'avif'}:
        return 'image'

    # yt-dlp has an "is_live" field for live streams (not supported for download).
    if entry.get('is_live'):
        return 'video'

    # Check if the title/description suggests it's a reel or story.
    title = (entry.get('title') or '').lower()
    if 'reel' in title:
        return 'reel'
    if 'story' in title or 'stories' in title:
        return 'story'

    # Default: if it has a duration it's probably a video.
    if entry.get('duration'):
        return 'video'

    return 'image'


# =============================================================================
# detect_platform
# =============================================================================
# Returns the platform name for a given URL.
# Python mirror of the PHP PlatformDetector.
# =============================================================================
def detect_platform(url: str) -> str:
    url_lower = url.lower()
    if 'facebook.com' in url_lower or 'fb.com' in url_lower or 'fb.watch' in url_lower:
        return 'facebook'
    if 'twitter.com' in url_lower or 'x.com' in url_lower:
        return 'twitter'
    if 'instagram.com' in url_lower:
        return 'instagram'
    if 'tiktok.com' in url_lower:
        return 'tiktok'
    if 'snapchat.com' in url_lower:
        return 'snapchat'
    return 'unknown'


# =============================================================================
# MAIN — Entry point when the script is run directly.
# =============================================================================
def main():

    # Set up the argument parser.
    parser = argparse.ArgumentParser(description='MediaVault media extractor')

    # "--url" is the URL to extract from. Required.
    parser.add_argument('--url',       required=True,  help='The URL to extract media from')

    # "--mode" is either "extract" (single post) or "profile" (full account scan).
    parser.add_argument('--mode',      default='extract', choices=['extract', 'profile'])

    # "--max-posts" limits how many posts to scan in profile mode.
    parser.add_argument('--max-posts', type=int, default=100)

    args = parser.parse_args()

    try:
        if args.mode == 'extract':
            items = extract_single_url(args.url)
            # Print JSON to stdout so PHP can read it.
            print(json.dumps({'success': True, 'data': items}, ensure_ascii=False))

        elif args.mode == 'profile':
            result = scan_profile(args.url, args.max_posts)
            print(json.dumps({'success': True, 'data': result}, ensure_ascii=False))

    except Exception as e:
        # On error, print a JSON error object to stdout.
        # PHP reads stdout and expects JSON — never print raw error text here.
        print(json.dumps({
            'success': False,
            'message': str(e),
        }), file=sys.stdout)
        sys.exit(1)


# Python convention: only run main() if this file is executed directly,
# not when it is imported as a module by another script.
if __name__ == '__main__':
    main()
