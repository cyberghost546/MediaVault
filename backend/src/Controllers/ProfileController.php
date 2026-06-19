<?php
declare(strict_types=1);
namespace MediaVault\Controllers;

use Psr\Http\Message\ResponseInterface      as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use MediaVault\Services\PythonBridge;
use MediaVault\Services\PlatformDetector;


class ProfileController
{
    // =========================================================================
    // scan — POST /profile/scan
    // Scans a public profile URL and returns all discovered media items.
    // This is a long-running operation (30s–2min for large accounts).
    // =========================================================================
    public function scan(Request $request, Response $response): Response
    {
        $body       = $request->getParsedBody();
        $profileUrl = trim((string)($body['profileUrl'] ?? ''));
        // "maxPosts" limits how many posts to scan (prevent excessive requests).
        $maxPosts   = min((int)($body['maxPosts'] ?? 100), 500);  // hard cap at 500

        if (empty($profileUrl)) {
            return $this->jsonError($response, 'profileUrl is required', 422);
        }

        if (!filter_var($profileUrl, FILTER_VALIDATE_URL)) {
            return $this->jsonError($response, 'Invalid URL format', 422);
        }

        $platform = PlatformDetector::detect($profileUrl);
        if ($platform === 'unknown') {
            return $this->jsonError($response, 'Unsupported platform', 422);
        }

        try {
            // This call can take a long time — PHP's max_execution_time must be
            // set high enough in php.ini, or we must use async processing.
            // For production, consider running this as a background job.
            $result = PythonBridge::scanProfile($profileUrl, $maxPosts);
        } catch (\Throwable $e) {
            error_log('[ProfileController::scan] ' . $e->getMessage());
            return $this->jsonError($response, 'Failed to scan profile. The profile may be private or the platform changed its structure.', 500);
        }

        return $this->jsonSuccess($response, $result);
    }


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
