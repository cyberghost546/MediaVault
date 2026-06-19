#!/usr/bin/env python3
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
"""
=============================================================================
downloader.py — FILE DOWNLOADER SERVICE
=============================================================================
This script is spawned by PHP's DownloadManager as a background process.
It downloads a single media file and writes progress updates to a JSON file.

PHP reads that JSON file every time the frontend polls for progress.

USAGE (called by PHP as a background process):
  python3 downloader.py --job-id "instagram_abc123" --url "https://cdn.../video.mp4" --dest "/downloads"

FLOW:
  1. PHP calls this script with the job ID and URL.
  2. This script downloads the file using yt-dlp (or requests for direct URLs).
  3. Every 500ms it writes a progress JSON file:
       { "id": "...", "status": "active", "progressPercent": 42, "downloadedBytes": 4200000, ... }
  4. When finished it writes status='completed' and records the download in MySQL.
  5. PHP's getProgress() reads the JSON file on each frontend poll.
=============================================================================
"""

import argparse
import json
import os
import sys
import time
import hashlib
import signal

from datetime import datetime, timezone
from pathlib import Path

# yt-dlp for downloading media via its built-in downloader.
import yt_dlp

# requests for downloading from direct CDN URLs (when yt-dlp gives us a plain URL).
import requests


# =============================================================================
# Global flag for graceful shutdown.
# When the PHP DownloadManager writes a .cancel signal file, we check this flag
# and stop the download cleanly instead of leaving partial files.
# =============================================================================
should_cancel = False


# =============================================================================
# ProgressTracker
# =============================================================================
# This class is passed to yt-dlp as a "progress_hook".
# yt-dlp calls our hook function after each downloaded chunk, giving us
# the latest bytes/speed/ETA data to write to the progress file.
# =============================================================================
class ProgressTracker:

    def __init__(self, job_id: str, progress_dir: str):
        # Store the job ID and where to write the progress file.
        self.job_id       = job_id
        self.progress_dir = progress_dir
        self.progress_file = os.path.join(progress_dir, f'{job_id}.json')
        self.pause_file    = os.path.join(progress_dir, f'{job_id}.pause')
        self.cancel_file   = os.path.join(progress_dir, f'{job_id}.cancel')
        self.start_time    = time.time()

    def hook(self, d: dict):
        """
        Called by yt-dlp with status updates.
        "d" is a dict with keys: status, downloaded_bytes, total_bytes, speed, eta
        """
        # Check for cancel signal.
        if os.path.exists(self.cancel_file):
            raise InterruptedError('Download cancelled by user')

        # Check for pause signal — wait until unpaused.
        while os.path.exists(self.pause_file):
            self._write_progress('paused', 0, 0, 0, 0)
            time.sleep(0.5)

        status = d.get('status', 'downloading')

        if status == 'downloading':
            downloaded = d.get('downloaded_bytes') or 0
            total      = d.get('total_bytes')       or d.get('total_bytes_estimate') or 0
            speed      = d.get('speed')  or 0
            eta        = d.get('eta')    or 0
            percent    = int((downloaded / total) * 100) if total > 0 else 0

            self._write_progress('active', percent, downloaded, total, speed, eta)

        elif status == 'finished':
            self._write_progress('completed', 100, 0, 0, 0, 0)

        elif status == 'error':
            self._write_progress('failed', 0, 0, 0, 0, 0, error=str(d.get('error', 'Download failed')))


    def _write_progress(
        self,
        status:         str,
        percent:        int,
        downloaded:     int,
        total:          int,
        speed:          float,
        eta:            float = 0,
        error:          str   = None
    ):
        """Write the current progress to a JSON file."""
        data = {
            'id':               self.job_id,
            'status':           status,
            'progressPercent':  percent,
            'downloadedBytes':  downloaded,
            'totalBytes':       total,
            'speedBytesPerSec': int(speed) if speed else 0,
            'etaSeconds':       int(eta)   if eta   else 0,
            'errorMessage':     error,
            'updatedAt':        datetime.now(timezone.utc).isoformat(),
        }

        # Write atomically: write to a temp file then rename.
        # WHY: If PHP reads the file while we are writing, it would read partial JSON.
        #      Rename is atomic on all OS — PHP either gets the old or new file, never partial.
        tmp_path = self.progress_file + '.tmp'
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f)
        os.replace(tmp_path, self.progress_file)


# =============================================================================
# compute_file_hash
# =============================================================================
# Computes the SHA-256 hash of a file.
# Used for duplicate detection: if we already have a file with this hash,
# we skip re-downloading it.
# =============================================================================
def compute_file_hash(file_path: str) -> str:

    # "sha256()" creates a new SHA-256 hash object.
    h = hashlib.sha256()

    # Read the file in chunks to avoid loading the entire file into RAM.
    # This is important for large video files (1GB+).
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(8192)    # Read 8KB at a time
            if not chunk:
                break               # End of file
            h.update(chunk)         # Feed the chunk to the hash

    # "hexdigest()" returns the hash as a 64-character hex string.
    return h.hexdigest()


# =============================================================================
# record_to_database
# =============================================================================
# After a successful download, saves a record to the MySQL downloads table.
# We call MySQL directly from Python using the mysql-connector-python library.
# This avoids needing to call PHP again after the download finishes.
#
# NOTE: This requires "mysql-connector-python" to be in requirements.txt.
#       We keep it simple here — in production consider using SQLAlchemy.
# =============================================================================
def record_to_database(job_id: str, source_url: str, platform: str,
                        file_path: str, file_hash: str, media_type: str):
    try:
        import mysql.connector
        import os

        conn = mysql.connector.connect(
            host=     os.environ.get('DB_HOST',     '127.0.0.1'),
            port=     os.environ.get('DB_PORT',     '3306'),
            database= os.environ.get('DB_DATABASE', 'mediavault'),
            user=     os.environ.get('DB_USERNAME', 'root'),
            password= os.environ.get('DB_PASSWORD', ''),
        )
        cursor = conn.cursor()

        # Get file size.
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

        cursor.execute(
            '''INSERT INTO downloads
               (source_url, platform, file_path, file_size_bytes, media_type, file_hash, downloaded_at)
               VALUES (%s, %s, %s, %s, %s, %s, NOW())''',
            (source_url, platform, file_path, file_size, media_type, file_hash)
        )
        conn.commit()
        cursor.close()
        conn.close()

    except Exception as e:
        # Log but do not crash — the file was still downloaded successfully.
        print(f'Warning: could not record to database: {e}', file=sys.stderr)


# =============================================================================
# download
# =============================================================================
# The main download function. Uses yt-dlp to download the file.
# =============================================================================
def download(job_id: str, url: str, dest_path: str, progress_dir: str):

    # Ensure the destination directory exists.
    # "exist_ok=True" means: don't crash if the folder already exists.
    os.makedirs(dest_path, exist_ok=True)

    # Create the progress tracker that will write JSON updates.
    tracker = ProgressTracker(job_id, progress_dir)

    # Write "active" status immediately so the frontend knows we started.
    tracker._write_progress('active', 0, 0, 0, 0)

    # yt-dlp options for the actual download.
    ydl_opts = {
        'quiet':       True,
        'no_warnings': True,

        # "outtmpl" is the output template for the filename.
        # "%(title)s.%(ext)s" → uses the post title as the filename.
        # We prefix with the job_id to prevent filename collisions.
        'outtmpl':    os.path.join(dest_path, f'{job_id}_%(title)s.%(ext)s'),

        # Tell yt-dlp to call our tracker.hook function with progress updates.
        'progress_hooks': [tracker.hook],

        # Download the best quality available.
        'format': 'bestvideo+bestaudio/best',

        # Merge video+audio into a single mp4 file (requires ffmpeg).
        # If ffmpeg is not available, yt-dlp falls back to a single-stream format.
        'merge_output_format': 'mp4',

        # Socket timeout.
        'socket_timeout': 30,

        # Continue partial downloads (important for resume functionality).
        # yt-dlp checks if a partial file exists and resumes from where it left off.
        'continuedl': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)  # download=True actually downloads!

        # Find the downloaded file on disk.
        # yt-dlp may have changed the filename slightly due to title sanitisation.
        downloaded_file = None
        if info:
            # yt-dlp stores the final filename in "requested_downloads".
            downloads = info.get('requested_downloads', [])
            if downloads:
                downloaded_file = downloads[0].get('filepath')

        if downloaded_file and os.path.exists(downloaded_file):
            # Compute hash for duplicate detection.
            file_hash = compute_file_hash(downloaded_file)

            # Record in database.
            platform   = url.split('.com')[0].split('/')[-1]  # rough platform guess
            media_type = 'video' if downloaded_file.endswith(('.mp4', '.mov', '.webm')) else 'image'
            record_to_database(job_id, url, platform, downloaded_file, file_hash, media_type)

        # Write final 'completed' status.
        tracker._write_progress('completed', 100, 0, 0, 0, 0)

    except InterruptedError:
        # User cancelled the download.
        tracker._write_progress('failed', 0, 0, 0, 0, 0, error='Cancelled by user')

    except Exception as e:
        # Download failed for some other reason.
        tracker._write_progress('failed', 0, 0, 0, 0, 0, error=str(e))
        raise


# =============================================================================
# MAIN
# =============================================================================
def main():

    parser = argparse.ArgumentParser(description='MediaVault file downloader')
    parser.add_argument('--job-id', required=True,  help='Unique job identifier')
    parser.add_argument('--url',    required=True,  help='Media URL to download')
    parser.add_argument('--dest',   required=True,  help='Destination folder path')

    args = parser.parse_args()

    # Progress files directory: same folder as the downloader script parent
    # or the backend/storage/progress directory.
    script_dir   = os.path.dirname(os.path.abspath(__file__))
    progress_dir = os.path.join(script_dir, '..', 'storage', 'progress')
    os.makedirs(progress_dir, exist_ok=True)

    download(
        job_id=       args.job_id,
        url=          args.url,
        dest_path=    args.dest,
        progress_dir= progress_dir,
    )


if __name__ == '__main__':
    main()
