<?php
// =============================================================================
// src/Controllers/DownloadController.php
// Handles all download lifecycle operations:
//   start, progress polling, pause, resume, retry, cancel.
// =============================================================================

declare(strict_types=1);

namespace MediaVault\Controllers;

use Psr\Http\Message\ResponseInterface      as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use MediaVault\Services\DownloadManager;
use MediaVault\Database\Connection;


class DownloadController
{
    // =========================================================================
    // start — POST /download/start
    // Begins downloading a single media file.
    // The download runs as a background process (non-blocking) via Python.
    // =========================================================================
    public function start(Request $request, Response $response): Response
    {
        $body = $request->getParsedBody();

        // Read required fields from the request body.
        $mediaUrl        = trim((string)($body['mediaUrl']        ?? ''));
        $mediaItemId     = trim((string)($body['mediaItemId']     ?? ''));
        $platform        = trim((string)($body['platform']        ?? ''));
        $mediaType       = trim((string)($body['mediaType']       ?? ''));
        $destinationPath = trim((string)($body['destinationPath'] ?? ''));

        // Validate required fields.
        if (empty($mediaUrl) || empty($platform)) {
            return $this->jsonError($response, 'mediaUrl and platform are required', 422);
        }

        // "DownloadManager::start()" creates a download job record in the
        // database and spawns a Python process to do the actual downloading.
        try {
            $job = DownloadManager::start(
                mediaItemId:     $mediaItemId,
                mediaUrl:        $mediaUrl,
                platform:        $platform,
                mediaType:       $mediaType,
                destinationPath: $destinationPath
            );
        } catch (\Throwable $e) {
            error_log('[DownloadController::start] ' . $e->getMessage());
            return $this->jsonError($response, 'Failed to start download: ' . $e->getMessage(), 500);
        }

        return $this->jsonSuccess($response, $job, 201);  // 201 Created
    }


    // =========================================================================
    // progress — GET /download/{id}/progress
    // Returns the current state and progress of a download job.
    // The frontend calls this every 2 seconds to update the progress bar.
    // =========================================================================
    public function progress(Request $request, Response $response, array $args): Response
    {
        // "$args['id']" comes from the route parameter "{id}".
        // Slim extracts named route parameters into $args.
        $jobId = $args['id'] ?? '';

        if (empty($jobId)) {
            return $this->jsonError($response, 'Job ID is required', 422);
        }

        try {
            $job = DownloadManager::getProgress($jobId);
        } catch (\Throwable $e) {
            return $this->jsonError($response, 'Job not found', 404);
        }

        return $this->jsonSuccess($response, $job);
    }


    // =========================================================================
    // pause — POST /download/{id}/pause
    // =========================================================================
    public function pause(Request $request, Response $response, array $args): Response
    {
        $jobId = $args['id'] ?? '';
        if (empty($jobId)) return $this->jsonError($response, 'Job ID is required', 422);

        try {
            DownloadManager::pause($jobId);
        } catch (\Throwable $e) {
            return $this->jsonError($response, 'Failed to pause: ' . $e->getMessage(), 500);
        }

        return $this->jsonSuccess($response, null);
    }


    // =========================================================================
    // resume — POST /download/{id}/resume
    // =========================================================================
    public function resume(Request $request, Response $response, array $args): Response
    {
        $jobId = $args['id'] ?? '';
        if (empty($jobId)) return $this->jsonError($response, 'Job ID is required', 422);

        try {
            DownloadManager::resume($jobId);
        } catch (\Throwable $e) {
            return $this->jsonError($response, 'Failed to resume: ' . $e->getMessage(), 500);
        }

        return $this->jsonSuccess($response, null);
    }


    // =========================================================================
    // retry — POST /download/{id}/retry
    // =========================================================================
    public function retry(Request $request, Response $response, array $args): Response
    {
        $jobId = $args['id'] ?? '';
        if (empty($jobId)) return $this->jsonError($response, 'Job ID is required', 422);

        try {
            DownloadManager::retry($jobId);
        } catch (\Throwable $e) {
            return $this->jsonError($response, 'Failed to retry: ' . $e->getMessage(), 500);
        }

        return $this->jsonSuccess($response, null);
    }


    // =========================================================================
    // cancel — DELETE /download/{id}
    // =========================================================================
    public function cancel(Request $request, Response $response, array $args): Response
    {
        $jobId = $args['id'] ?? '';
        if (empty($jobId)) return $this->jsonError($response, 'Job ID is required', 422);

        try {
            DownloadManager::cancel($jobId);
        } catch (\Throwable $e) {
            return $this->jsonError($response, 'Failed to cancel: ' . $e->getMessage(), 500);
        }

        return $this->jsonSuccess($response, null);
    }


    // ── JSON HELPERS (same pattern as MediaController) ──

    private function jsonSuccess(Response $response, mixed $data, int $status = 200): Response
    {
        $response->getBody()->write(json_encode(['success' => true, 'data' => $data]));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }

    private function jsonError(Response $response, string $message, int $status = 400): Response
    {
        $response->getBody()->write(json_encode(['success' => false, 'message' => $message, 'code' => $status]));
        return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
    }
}
