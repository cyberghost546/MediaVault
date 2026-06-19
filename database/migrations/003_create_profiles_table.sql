-- =============================================================================
-- 003_create_profiles_table.sql
-- =============================================================================
-- Stores scanned profile results and their associated download jobs.
-- Also creates the download_jobs table used by DownloadManager.php.
-- =============================================================================

USE mediavault;


-- "profile_scans" caches profile scan results so we do not re-scan immediately.
CREATE TABLE IF NOT EXISTS profile_scans (

    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- The profile URL that was scanned.
    profile_url     VARCHAR(2048)   NOT NULL,

    platform        ENUM('facebook','twitter','instagram','tiktok','snapchat','unknown')
                    NOT NULL DEFAULT 'unknown',

    -- The @username of the scanned account.
    username        VARCHAR(255)    NOT NULL,

    -- Display name shown on the profile.
    display_name    VARCHAR(500),

    -- Profile picture URL.
    avatar_url      TEXT,

    -- How many posts were found in the scan.
    total_posts     INT UNSIGNED    NOT NULL DEFAULT 0,

    -- How many media items were extracted.
    total_items     INT UNSIGNED    NOT NULL DEFAULT 0,

    -- When the scan completed.
    scanned_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    INDEX idx_profile_url (profile_url(255)),
    INDEX idx_username    (username)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- "download_jobs" tracks each individual download job.
-- Created by DownloadManager::start() and read by DownloadManager::getProgress().
CREATE TABLE IF NOT EXISTS download_jobs (

    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- Our generated job ID (e.g. "instagram_abc123def456").
    job_id          VARCHAR(100)    NOT NULL,

    -- The media item ID from yt-dlp extraction.
    media_item_id   VARCHAR(100)    NOT NULL DEFAULT '',

    -- The direct URL being downloaded.
    media_url       TEXT            NOT NULL,

    platform        ENUM('facebook','twitter','instagram','tiktok','snapchat','unknown')
                    NOT NULL DEFAULT 'unknown',

    media_type      ENUM('image','video','reel','story','audio','unknown')
                    NOT NULL DEFAULT 'unknown',

    -- Where the file will be saved.
    destination_path TEXT           NOT NULL,

    -- Current status of the job.
    status          ENUM('pending','active','paused','completed','failed')
                    NOT NULL DEFAULT 'pending',

    -- Error message if status='failed'.
    error_message   TEXT,

    -- How many times this job has been retried.
    retry_count     TINYINT UNSIGNED NOT NULL DEFAULT 0,

    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME,

    PRIMARY KEY (id),
    UNIQUE KEY uq_job_id (job_id),
    INDEX idx_status     (status),
    INDEX idx_created_at (created_at)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
