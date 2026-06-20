<?php
// =============================================================================
// config/database.php — DATABASE CONFIGURATION
// =============================================================================
// Returns an array of database connection settings.
// The values come from environment variables (loaded from a .env file by phpdotenv).
//
// WHY environment variables instead of hardcoded values?
//   Hardcoding passwords in code is a security risk. If the code is shared on
//   GitHub, the password is exposed. Environment variables keep secrets OUT of
//   the code. Each developer has their own .env file that is NOT committed to git.
//
// HOW TO USE:
//   Copy .env.example to .env and fill in your MySQL credentials.
//   The PHP backend reads these values when it starts.
// =============================================================================

// "return" an associative array so any file can do:
//   $dbConfig = require __DIR__ . '/database.php';
//   $host = $dbConfig['host'];
return [

    // The hostname of the MySQL server.
    // In Docker Compose, "db" is the service name (acts as a hostname).
    // Locally, it is "127.0.0.1" (same machine).
    'host'     => $_ENV['DB_HOST']     ?? '127.0.0.1',
    'port'     => $_ENV['DB_PORT']     ?? '5432',
    'database' => $_ENV['DB_DATABASE'] ?? 'postgres',
    'username' => $_ENV['DB_USERNAME'] ?? 'postgres',
    'password' => $_ENV['DB_PASSWORD'] ?? '',
    'charset'  => 'utf8',

    // PDO (PHP Data Objects) is the built-in PHP database abstraction layer.
    // These options control how PDO behaves.
    'options'  => [
        // Throw a PDOException instead of returning false on errors.
        // WHY: Makes error handling consistent — we can use try/catch everywhere.
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,

        // Return rows as associative arrays (e.g. ['id' => 1, 'url' => '...'])
        // instead of numbered arrays (e.g. [0 => 1, 1 => '...']).
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

        // Disable emulated prepared statements and use real MySQL prepared statements.
        // WHY: Real prepared statements protect against SQL injection more reliably.
        PDO::ATTR_EMULATE_PREPARES   => false,
    ],
];
