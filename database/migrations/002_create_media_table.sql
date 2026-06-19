-- =============================================================================
-- 002_create_media_table.sql
-- =============================================================================
-- Stores metadata about discovered media items (before/after downloading).
-- This is a cache so we do not need to re-run yt-dlp for the same URL.
-- =============================================================================

USE mediavault;


CREATE TABLE IF NOT EXISTS media_items (

    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

    -- A unique string ID combining platform + random hex (e.g. "instagram_abc123def456").
    item_id         VARCHAR(100)    NOT NULL,

    -- The URL the user pasted.
    source_url      VARCHAR(2048)   NOT NULL,

    -- The direct URL to the media file (found by yt-dlp).
    media_url       TEXT            NOT NULL,

    -- Which platform.
    platform        ENUM('facebook','twitter','instagram','tiktok','snapchat','unknown')
                    NOT NULL DEFAULT 'unknown',

    -- What kind of media.
    media_type      ENUM('image','video','reel','story','audio','unknown')
                    NOT NULL DEFAULT 'unknown',

    -- URL to the thumbnail image (for the grid preview).
    thumbnail_url   TEXT,

    -- The account's username/handle.
    username        VARCHAR(255),

    -- The post's caption or title.
    caption         TEXT,

    -- File size in bytes (may be NULL if unknown before downloading).
    file_size_bytes BIGINT UNSIGNED,

    -- Video duration in seconds (NULL for images).
    duration_seconds INT UNSIGNED,

    -- Width and height in pixels.
    width   SMALLINT UNSIGNED,
    height  SMALLINT UNSIGNED,

    -- When the original post was published (ISO 8601 stored as DATETIME).
    posted_at       DATETIME,

    -- When we extracted this metadata (for cache expiry).
    extracted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Unique constraint on item_id so we cannot insert duplicates.
    UNIQUE KEY uq_item_id (item_id),

    INDEX idx_platform  (platform),
    INDEX idx_username  (username),
    INDEX idx_posted_at (posted_at)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
