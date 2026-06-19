<?php
// =============================================================================
// src/Services/PythonBridge.php — BRIDGE BETWEEN PHP AND PYTHON
// =============================================================================
// PHP calls Python scripts using the command line.
//
// WHY Python instead of doing it in PHP?
//   yt-dlp (the media extraction library) is a Python package with no PHP port.
//   Python also has better libraries for scraping and media processing.
//
// HOW IT WORKS:
//   PHP builds a shell command:  python3 media_extractor.py --url "..."
//   PHP runs it via proc_open()  which captures stdout and stderr.
//   Python yt-dlp extracts media info and prints JSON to stdout.
//   PHP reads the JSON output and decodes it.
//
// SECURITY NOTE:
//   User input (URLs) is passed to the shell command. We MUST escape them with
//   "escapeshellarg()" to prevent command injection attacks.
//   Example of injection WITHOUT escaping:
//     URL: https://example.com"; rm -rf /; echo "
//   With escapeshellarg(), the quotes are escaped and the injection is blocked.
// =============================================================================

declare(strict_types=1);

namespace MediaVault\Services;

use RuntimeException;


class PythonBridge
{
    // =========================================================================
    // extractMedia — Run the Python extractor and return MediaItem data.
    // =========================================================================
    public static function extractMedia(string $url): array
    {
        $config = require __DIR__ . '/../../config/app.php';

        // "escapeshellarg()" wraps the URL in single quotes and escapes any
        // single quotes inside the URL. This prevents shell injection.
        // NEVER skip this step when passing user input to a shell command.
        $escapedUrl = escapeshellarg($url);

        // The full command we will run.
        // We pass "--format json" so the Python script outputs JSON we can parse.
        $command = sprintf(
            '%s %s --url %s --mode extract 2>&1',
            escapeshellarg($config['python_path']),
            escapeshellarg($config['python_extractor']),
            $escapedUrl
        );

        // Run the command and capture its output.
        $output   = self::runCommand($command, $config['extract_timeout']);
        $decoded  = json_decode($output, associative: true);

        // Check that the Python script returned valid JSON.
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException('Python extractor returned invalid JSON. Output: ' . substr($output, 0, 500));
        }

        // The Python script wraps its output in { "success": true, "data": [...] }.
        if (!($decoded['success'] ?? false)) {
            throw new RuntimeException($decoded['message'] ?? 'Extraction failed');
        }

        return $decoded['data'] ?? [];
    }


    // =========================================================================
    // scanProfile — Run yt-dlp on a profile URL to collect all post media.
    // =========================================================================
    public static function scanProfile(string $profileUrl, int $maxPosts = 100): array
    {
        $config     = require __DIR__ . '/../../config/app.php';
        $escapedUrl = escapeshellarg($profileUrl);
        $maxPosts   = max(1, min(500, $maxPosts));  // clamp between 1 and 500

        $command = sprintf(
            '%s %s --url %s --mode profile --max-posts %d 2>&1',
            escapeshellarg($config['python_path']),
            escapeshellarg($config['python_extractor']),
            $escapedUrl,
            $maxPosts
        );

        // Profile scanning can take much longer — use a longer timeout.
        $timeout = $config['extract_timeout'] * 3;
        $output  = self::runCommand($command, $timeout);
        $decoded = json_decode($output, associative: true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException('Profile scan returned invalid JSON. Output: ' . substr($output, 0, 500));
        }

        if (!($decoded['success'] ?? false)) {
            throw new RuntimeException($decoded['message'] ?? 'Profile scan failed');
        }

        return $decoded['data'] ?? [];
    }


    // =========================================================================
    // runCommand — Execute a shell command with a timeout.
    //
    // "proc_open" is the right way to run commands in PHP because:
    //   - "shell_exec" and "exec" do not support timeouts
    //   - "proc_open" gives us pipes to read stdout/stderr separately
    //   - We can kill the process if it runs too long
    // =========================================================================
    private static function runCommand(string $command, int $timeoutSeconds): string
    {
        // "proc_open" starts the process. "descriptorspec" maps pipe numbers:
        //   0 = stdin  (we do not send input)
        //   1 = stdout (we read the output)
        //   2 = stderr (we read errors — "2>&1" in the command merges them)
        $descriptorSpec = [
            0 => ['pipe', 'r'],   // stdin  — process reads from here
            1 => ['pipe', 'w'],   // stdout — process writes here
            2 => ['pipe', 'w'],   // stderr
        ];

        $pipes   = [];
        $process = proc_open($command, $descriptorSpec, $pipes);

        if (!is_resource($process)) {
            throw new RuntimeException('Failed to start Python process');
        }

        // Close stdin — we are not sending anything to the process.
        fclose($pipes[0]);

        // Set a non-blocking read so we can implement our own timeout.
        stream_set_blocking($pipes[1], false);
        stream_set_blocking($pipes[2], false);

        $output    = '';
        $startTime = time();

        // Read output in a loop until the process exits or the timeout is reached.
        while (true) {
            $status = proc_get_status($process);

            // Process has finished — read any remaining output and break.
            if (!$status['running']) {
                $output .= stream_get_contents($pipes[1]);
                break;
            }

            // Check for timeout.
            if (time() - $startTime > $timeoutSeconds) {
                // Kill the process and throw an exception.
                proc_terminate($process);
                proc_close($process);
                throw new RuntimeException("Python process timed out after {$timeoutSeconds} seconds");
            }

            // Read any available output (non-blocking).
            $chunk = fread($pipes[1], 8192);
            if ($chunk !== false) {
                $output .= $chunk;
            }

            // Sleep for 100ms before checking again (prevents CPU spinning).
            usleep(100_000);
        }

        // Close pipes and free process resource.
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);

        return trim($output);
    }
}
