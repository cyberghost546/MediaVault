<?php
// =============================================================================
// config/app.php — GENERAL APPLICATION SETTINGS
// =============================================================================

return [

    // Is this a development or production environment?
    // In production set APP_ENV=production in .env.
    // WHY: Development mode shows detailed error messages.
    //      Production mode hides them (security risk to show stack traces publicly).
    'env'    => $_ENV['APP_ENV'] ?? 'development',

    // Secret key used to sign tokens. Generate with: openssl rand -hex 32
    'secret' => $_ENV['APP_SECRET'] ?? 'change-me-before-production',

    // Where downloaded files are stored on the server.
    // On Windows: C:/mediavault/downloads
    // On Linux: /var/www/mediavault/downloads
    'download_path' => $_ENV['DOWNLOAD_PATH'] ?? __DIR__ . '/../storage/downloads',

    // Full path to the Python executable.
    // On Linux/macOS: /usr/bin/python3
    // On Windows: C:/Python311/python.exe
    'python_path' => $_ENV['PYTHON_PATH'] ?? 'python3',

    // Full path to the media_extractor.py script.
    'python_extractor' => __DIR__ . '/../python/media_extractor.py',

    // Full path to the downloader.py script.
    'python_downloader' => __DIR__ . '/../python/downloader.py',

    // Allowed origins for CORS (the frontend URL).
    // In production, replace with your actual domain: 'https://mediavault.app'
    'cors_origins' => explode(',', $_ENV['CORS_ORIGINS'] ?? 'http://localhost:3000'),

    // Maximum number of concurrent downloads per user session.
    'max_concurrent' => (int)($_ENV['MAX_CONCURRENT'] ?? 5),

    // Timeout in seconds for media extraction (yt-dlp can be slow).
    'extract_timeout' => (int)($_ENV['EXTRACT_TIMEOUT'] ?? 60),

    // Timeout in seconds for downloading a file.
    'download_timeout' => (int)($_ENV['DOWNLOAD_TIMEOUT'] ?? 3600), // 1 hour
];
