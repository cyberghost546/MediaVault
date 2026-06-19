<?php
// =============================================================================
// src/Database/Connection.php — DATABASE CONNECTION (SINGLETON)
// =============================================================================
// This class creates and manages the MySQL connection using PHP's PDO library.
//
// WHAT IS PDO?
//   PDO (PHP Data Objects) is a built-in PHP extension that provides a unified
//   interface to many database types (MySQL, PostgreSQL, SQLite, etc.).
//   Instead of mysql_query() (old, insecure), we use PDO prepared statements
//   which automatically protect against SQL injection attacks.
//
// WHAT IS A SINGLETON?
//   A design pattern where a class only ever creates ONE instance of itself.
//   WHY: Opening a database connection is slow. If every part of the code
//        created its own connection, the app would be slow. The singleton
//        ensures we open the connection once and reuse it everywhere.
// =============================================================================

declare(strict_types=1);

// The "namespace" is like the file's address within the project.
// It prevents naming conflicts (if two files both define "Connection", PHP
// knows which is MediaVault\Database\Connection vs SomeOtherLib\Database\Connection).
namespace MediaVault\Database;

// Import PDO and PDOException so we can use them without the full class name.
use PDO;
use PDOException;
use RuntimeException;


class Connection
{
    // "private static ?PDO $pdo = null" is the stored PDO instance.
    // "static" means it belongs to the CLASS, not to any specific object.
    //   → All code shares the same "$pdo" regardless of how many times Connection is used.
    // "?" means the type is nullable — it can be null OR a PDO object.
    private static ?PDO $pdo = null;


    // "private function __construct()" prevents anyone from doing "new Connection()".
    // WHY: We want to force people to use "Connection::getInstance()" instead.
    private function __construct() {}


    // ==========================================================================
    // getInstance — Returns the shared PDO connection, creating it if needed.
    // ==========================================================================
    public static function getInstance(): PDO
    {
        // If we already have a connection, return it immediately.
        // This is the core of the singleton: we only create one connection.
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        // Load database configuration from config/database.php.
        // "__DIR__" is the absolute path to the current file's folder.
        // "require" loads and evaluates the file, then returns its "return" value.
        $config = require __DIR__ . '/../../config/database.php';

        // Build the DSN (Data Source Name) — a string that tells PDO where and how
        // to connect to MySQL.
        // Format: "mysql:host=HOST;port=PORT;dbname=DATABASE;charset=CHARSET"
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        // "try...catch" wraps the connection attempt.
        // If MySQL is not running, the connection throws a PDOException.
        // We catch it and throw a cleaner RuntimeException with a useful message.
        try {
            // Create the PDO connection.
            // The third argument ($config['options']) passes our PDO settings
            // (like ERRMODE_EXCEPTION and FETCH_ASSOC) defined in database.php.
            self::$pdo = new PDO(
                $dsn,
                $config['username'],
                $config['password'],
                $config['options']
            );

        } catch (PDOException $e) {
            // Re-throw with a clean message. The original PDO error might contain
            // the database password in its message, so we wrap it.
            throw new RuntimeException(
                'Database connection failed. Check your .env settings and ensure MySQL is running. Original: ' . $e->getMessage()
            );
        }

        return self::$pdo;
    }


    // ==========================================================================
    // query — Execute a SELECT query and return all matching rows.
    // ==========================================================================
    // PARAMETERS:
    //   $sql    — The SQL query with "?" placeholders for values.
    //             Example: "SELECT * FROM downloads WHERE platform = ?"
    //   $params — An array of values to replace the placeholders.
    //             Example: ['instagram']
    //
    // WHY PLACEHOLDERS instead of string concatenation?
    //   If you wrote: "SELECT * FROM downloads WHERE platform = '$platform'"
    //   a hacker could set $platform to "'; DROP TABLE downloads; --"
    //   and destroy your database. Placeholders prevent SQL injection.
    // ==========================================================================
    public static function query(string $sql, array $params = []): array
    {
        // "prepare()" creates a prepared statement — MySQL parses the SQL structure
        // before any data is inserted. Data can never change the SQL structure.
        $stmt = self::getInstance()->prepare($sql);

        // "execute()" sends the values and runs the query.
        $stmt->execute($params);

        // "fetchAll()" returns ALL matching rows as an array of associative arrays.
        return $stmt->fetchAll();
    }


    // ==========================================================================
    // execute — Run an INSERT, UPDATE, or DELETE query.
    // Returns the number of rows affected.
    // ==========================================================================
    public static function execute(string $sql, array $params = []): int
    {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);

        // "rowCount()" returns how many rows were inserted/updated/deleted.
        return $stmt->rowCount();
    }


    // ==========================================================================
    // lastInsertId — Returns the auto-incremented ID of the last INSERT.
    // Used after inserting a new record to get its database ID.
    // ==========================================================================
    public static function lastInsertId(): string
    {
        return self::getInstance()->lastInsertId();
    }
}
