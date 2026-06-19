-- =============================================================================
-- 001_create_downloads_table.sql
-- =============================================================================
-- Creates the "downloads" table that stores the history of every file
-- that has been successfully downloaded by MediaVault.
--
-- HOW TO RUN:
--   mysql -u root -p mediavault < 001_create_downloads_table.sql
--
-- COLUMNS EXPLAINED:
--   id            — Auto-incrementing integer. MySQL assigns this automatically.
--                   You never need to set it manually.
--   source_url    — The original URL the user pasted (up to 2048 chars).
--   platform      — Which social media platform (facebook, instagram, etc.)
--   file_path     — Where the downloaded file is saved on disk.
--   file_size_bytes — Size of the downloaded file in bytes.
--   media_type    — image, video, reel, story, audio, unknown
--   file_hash     — SHA-256 hash of the file, used for duplicate detection.
--   downloaded_at — Timestamp when the download completed.
-- =============================================================================

-- "USE mediavault;" switches to the mediavault database.
-- The database must already exist (CREATE DATABASE mediavault; run first).
USE mediavault;


-- "CREATE TABLE IF NOT EXISTS" creates the table only if it doesn't already exist.
-- WHY "IF NOT EXISTS"? Running this migration twice would crash without it.
CREATE TABLE IF NOT EXISTS downloads (

    -- PRIMARY KEY: a unique auto-incrementing number for each row.
    -- "UNSIGNED" means it can only be positive (0 to ~4 billion).
    -- "AUTO_INCREMENT" means MySQL automatically adds 1 for each new row.
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- The original URL. VARCHAR(2048) stores up to 2048 characters.
    -- URLs can be very long, especially with tracking parameters.
    source_url      VARCHAR(2048)   NOT NULL,

    -- Which platform. We use a fixed set of values (ENUM).
    -- MySQL enforces that only these values can be stored — prevents typos.
    platform        ENUM('facebook','twitter','instagram','tiktok','snapchat','unknown')
                    NOT NULL DEFAULT 'unknown',

    -- Where the file is on disk. TEXT stores up to 65,535 characters.
    -- We use TEXT instead of VARCHAR because file paths can be very long
    -- (especially on Windows with nested folders).
    file_path       TEXT            NOT NULL,

    -- File size in bytes. BIGINT supports files up to ~9.2 exabytes.
    file_size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,

    -- What kind of media was downloaded.
    media_type      ENUM('image','video','reel','story','audio','unknown')
                    NOT NULL DEFAULT 'unknown',

    -- SHA-256 hash as a 64-character hex string.
    -- "CHAR(64)" stores exactly 64 characters (SHA-256 always produces 64 hex chars).
    file_hash       CHAR(64)        NOT NULL DEFAULT '',

    -- When the download finished. "DEFAULT CURRENT_TIMESTAMP" sets it automatically.
    downloaded_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Every table must have a PRIMARY KEY.
    -- It uniquely identifies each row and creates an index for fast lookups.
    PRIMARY KEY (id),

    -- INDEX on "platform" speeds up queries that filter by platform.
    -- Without an index, MySQL must scan every row — slow for large tables.
    INDEX idx_platform (platform),

    -- INDEX on "downloaded_at" speeds up sorting by date (used in the history page).
    INDEX idx_downloaded_at (downloaded_at),

    -- INDEX on "file_hash" speeds up duplicate detection lookups.
    INDEX idx_file_hash (file_hash)

) ENGINE=InnoDB                    -- InnoDB is MySQL's default engine, supports transactions.
  DEFAULT CHARSET=utf8mb4           -- utf8mb4 supports all Unicode characters including emojis.
  COLLATE=utf8mb4_unicode_ci;       -- Case-insensitive string comparison.
