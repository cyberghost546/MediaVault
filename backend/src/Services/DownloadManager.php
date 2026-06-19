<?php
// =============================================================================
// src/Services/DownloadManager.php
// =============================================================================
// Manages the download job lifecycle:
//   - Creates job records in MySQL
//   - Spawns background Python download processes
//   - Reads progress from a status file written by Python
//   - Handles pause/resume/retry/cancel by writing signal files
//
// HOW BACKGROUND DOWNLOADS WORK:
//   1. start() writes a job row to MySQL (status='pending')
//   2. start() launches python3 downloader.py as a background process
//      On Linux/macOS:  "python3 downloader.py &" (the & runs it in the background)
//      On Windows:      "start /B python3 downloader.py"
//   3. downloader.py downloads the file and writes progress updates to a JSON file
//      at "storage/progress/{jobId}.json"
//   4. The frontend polls GET /download/{id}/progress every 2 seconds
//   5. getProgress() reads the JSON file and returns the current state
// =============================================================================

declare(strict_types=1);

namespace MediaVault\Services;

use MediaVault\Database\Connection;
use RuntimeException;


class DownloadManager
{
    // Where progress JSON files are stored.
    // Each file is named "{jobId}.json" and updated by the Python downloader.
    private static function progressDir(): string
    {
        $dir = __DIR__ . '/../../storage/progress';
        // Create the directory if it does not exist.
        if (!is_dir($dir)) {
            mkdir($dir, 0755, recursive: true);
        }
        return $dir;
    }


    // =========================================================================
    // start — Create a download job and spawn the Python downloader.
    // =========================================================================
    public static function start(
        string $mediaItemId,
        string $mediaUrl,
        string $platform,
        string $mediaType,
        string $destinationPath
    ): array {
        $config = require __DIR__ . '/../../config/app.php';

        // Generate a unique job ID: platform + random hex.
        // "bin2hex(random_bytes(8))" generates 16 random hex characters.
        $jobId = $platform . '_' . bin2hex(random_bytes(8));

        // Ensure destination path exists.
        if (empty($destinationPath)) {
            $destinationPath = $config['download_path'];
        }

        // Create the job record in MySQL.
        Connection::execute(
            'INSERT INTO download_jobs
             (job_id, media_item_id, media_url, platform, media_type, destination_path, status, retry_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [$jobId, $mediaItemId, $mediaUrl, $platform, $mediaType, $destinationPath, 'pending', 0]
        );

        // Build the command to run the Python downloader in the background.
        $escapedUrl  = escapeshellarg($mediaUrl);
        $escapedDest = escapeshellarg($destinationPath);
        $escapedId   = escapeshellarg($jobId);
        $escapedPy   = escapeshellarg($config['python_downloader']);
        $pythonBin   = escapeshellarg($config['python_path']);

        // Background execution:
        //   On Linux/macOS: append " > /dev/null 2>&1 &" to run it in background.
        //   On Windows:     wrap with "start /B".
        if (PHP_OS_FAMILY === 'Windows') {
            $command = "start /B {$pythonBin} {$escapedPy} --job-id {$escapedId} --url {$escapedUrl} --dest {$escapedDest}";
        } else {
            $command = "{$pythonBin} {$escapedPy} --job-id {$escapedId} --url {$escapedUrl} --dest {$escapedDest} > /dev/null 2>&1 &";
        }

        // Run the command (fire and forget — we do not wait for it to finish).
        exec($command);

        // Update status from pending to active.
        Connection::execute(
            'UPDATE download_jobs SET status = ? WHERE job_id = ?',
            ['active', $jobId]
        );

        // Return the initial job state.
        return [
            'id'              => $jobId,
            'sourceUrl'       => $mediaUrl,
            'platform'        => $platform,
            'items'           => [],
            'status'          => 'active',
            'progressPercent' => 0,
            'downloadedBytes' => 0,
            'totalBytes'      => 0,
            'speedBytesPerSec'=> 0,
            'etaSeconds'      => 0,
            'destinationPath' => $destinationPath,
            'retryCount'      => 0,
            'createdAt'       => date('c'),
        ];
    }


    // =========================================================================
    // getProgress — Read the progress JSON file written by Python.
    // =========================================================================
    public static function getProgress(string $jobId): array
    {
        // Validate jobId to prevent directory traversal attacks.
        // "preg_match" allows only alphanumeric characters and underscores.
        if (!preg_match('/^[a-z0-9_]+$/i', $jobId)) {
            throw new RuntimeException('Invalid job ID');
        }

        $progressFile = self::progressDir() . '/' . $jobId . '.json';

        // If the progress file does not exist yet, the download is still starting.
        if (!file_exists($progressFile)) {
            // Fall back to the database status.
            $row = Connection::query(
                'SELECT status, retry_count, created_at, error_message FROM download_jobs WHERE job_id = ? LIMIT 1',
                [$jobId]
            )[0] ?? null;

            if (!$row) throw new RuntimeException('Job not found');

            return [
                'id'              => $jobId,
                'status'          => $row['status'],
                'progressPercent' => 0,
                'downloadedBytes' => 0,
                'totalBytes'      => 0,
                'speedBytesPerSec'=> 0,
                'etaSeconds'      => 0,
                'errorMessage'    => $row['error_message'] ?? null,
                'retryCount'      => (int)$row['retry_count'],
            ];
        }

        // Read the JSON progress file written by the Python downloader.
        $content = file_get_contents($progressFile);
        $data    = json_decode($content, associative: true);

        return $data ?? ['id' => $jobId, 'status' => 'active', 'progressPercent' => 0];
    }


    // =========================================================================
    // pause — Write a "pause signal" file. The Python process reads it.
    // =========================================================================
    public static function pause(string $jobId): void
    {
        if (!preg_match('/^[a-z0-9_]+$/i', $jobId)) {
            throw new RuntimeException('Invalid job ID');
        }
        // Creating an empty file acts as a signal to the Python process.
        file_put_contents(self::progressDir() . '/' . $jobId . '.pause', '');
        Connection::execute('UPDATE download_jobs SET status = ? WHERE job_id = ?', ['paused', $jobId]);
    }


    // =========================================================================
    // resume — Remove the pause signal file.
    // =========================================================================
    public static function resume(string $jobId): void
    {
        if (!preg_match('/^[a-z0-9_]+$/i', $jobId)) {
            throw new RuntimeException('Invalid job ID');
        }
        $pauseFile = self::progressDir() . '/' . $jobId . '.pause';
        if (file_exists($pauseFile)) {
            unlink($pauseFile);
        }
        Connection::execute('UPDATE download_jobs SET status = ? WHERE job_id = ?', ['active', $jobId]);
    }


    // =========================================================================
    // retry — Reset counters and re-run the Python downloader.
    // =========================================================================
    public static function retry(string $jobId): void
    {
        if (!preg_match('/^[a-z0-9_]+$/i', $jobId)) {
            throw new RuntimeException('Invalid job ID');
        }

        // Get the original job so we can re-launch it.
        $row = Connection::query(
            'SELECT media_url, destination_path, retry_count FROM download_jobs WHERE job_id = ? LIMIT 1',
            [$jobId]
        )[0] ?? null;

        if (!$row) throw new RuntimeException('Job not found');

        // Increment the retry counter.
        Connection::execute(
            'UPDATE download_jobs SET status = ?, retry_count = retry_count + 1, error_message = NULL WHERE job_id = ?',
            ['active', $jobId]
        );

        // Re-run the Python downloader.
        $config      = require __DIR__ . '/../../config/app.php';
        $escapedUrl  = escapeshellarg($row['media_url']);
        $escapedDest = escapeshellarg($row['destination_path']);
        $escapedId   = escapeshellarg($jobId);
        $escapedPy   = escapeshellarg($config['python_downloader']);
        $pythonBin   = escapeshellarg($config['python_path']);

        if (PHP_OS_FAMILY === 'Windows') {
            $cmd = "start /B {$pythonBin} {$escapedPy} --job-id {$escapedId} --url {$escapedUrl} --dest {$escapedDest}";
        } else {
            $cmd = "{$pythonBin} {$escapedPy} --job-id {$escapedId} --url {$escapedUrl} --dest {$escapedDest} > /dev/null 2>&1 &";
        }
        exec($cmd);
    }


    // =========================================================================
    // cancel — Kill the download and clean up files.
    // =========================================================================
    public static function cancel(string $jobId): void
    {
        if (!preg_match('/^[a-z0-9_]+$/i', $jobId)) {
            throw new RuntimeException('Invalid job ID');
        }

        // Write a cancel signal file.
        file_put_contents(self::progressDir() . '/' . $jobId . '.cancel', '');

        // Give the Python process 2 seconds to see the signal and stop cleanly.
        sleep(2);

        // Delete all signal and progress files.
        foreach (['.json', '.pause', '.cancel'] as $ext) {
            $file = self::progressDir() . '/' . $jobId . $ext;
            if (file_exists($file)) unlink($file);
        }

        // Mark the job as cancelled in the database.
        Connection::execute('DELETE FROM download_jobs WHERE job_id = ?', [$jobId]);
    }
}
