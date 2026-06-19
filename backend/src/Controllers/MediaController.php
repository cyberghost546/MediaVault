<?php
// =============================================================================
// src/Controllers/MediaController.php
// =============================================================================
// WHAT IS A CONTROLLER?
//   A controller is the "traffic cop" between the HTTP request and the rest of
//   the application. It:
//     1. Reads data from the request (URL, body, headers)
//     2. Validates the data (is the URL real? Is the platform supported?)
//     3. Calls a Service to do the actual work (extracting media via Python)
//     4. Formats the result as JSON and returns it to the frontend
//
// Controllers should be thin — they should not contain business logic.
// All the heavy lifting belongs in Service classes.
// =============================================================================

declare(strict_types=1);

namespace MediaVault\Controllers;

use Psr\Http\Message\ResponseInterface      as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

// Our Python bridge service — calls the Python yt-dlp extractor.
use MediaVault\Services\PythonBridge;

// Our platform detector — validates the URL's platform.
use MediaVault\Services\PlatformDetector;


class MediaController
{
    // =========================================================================
    // extract — POST /media/extract
    // =========================================================================
    // Accepts a URL, runs yt-dlp through Python to find all downloadable media,
    // and returns an array of MediaItem objects as JSON.
    //
    // REQUEST BODY (JSON):
    //   { "url": "https://www.instagram.com/p/ABC123/" }
    //
    // RESPONSE (JSON):
    //   { "success": true, "data": [ { "id": "...", "mediaUrl": "...", ... } ] }
    // =========================================================================
    public function extract(Request $request, Response $response): Response
    {
        // "getParsedBody()" returns the request body as an associative array.
        // Slim's body parsing middleware decoded the JSON for us automatically.
        $body = $request->getParsedBody();

        // Validate that the "url" field is present and is a string.
        // "trim()" removes surrounding whitespace.
        $url = trim((string)($body['url'] ?? ''));

        if (empty($url)) {
            // Return a 422 Unprocessable Entity response.
            // 422 means "I understood the request but the data is invalid."
            return $this->jsonError($response, 'URL is required', 422);
        }

        // Validate URL format using PHP's built-in filter.
        // "FILTER_VALIDATE_URL" returns false if the string is not a valid URL.
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return $this->jsonError($response, 'Invalid URL format', 422);
        }

        // Detect which platform this URL belongs to.
        $platform = PlatformDetector::detect($url);
        if ($platform === 'unknown') {
            return $this->jsonError($response, 'Unsupported platform. Supported: Facebook, X (Twitter), Instagram, TikTok, Snapchat.', 422);
        }

        // Call the Python bridge to run yt-dlp and extract media metadata.
        try {
            $mediaItems = PythonBridge::extractMedia($url);
        } catch (\Throwable $e) {
            // Log the full error for debugging, but show a clean message to the user.
            error_log('[MediaController::extract] ' . $e->getMessage());
            return $this->jsonError($response, 'Failed to extract media from this URL. The post may be private or unsupported.', 500);
        }

        // Return success with the array of media items.
        return $this->jsonSuccess($response, $mediaItems);
    }


    // =========================================================================
    // jsonSuccess — Helper: return a 200 JSON response with "success: true".
    // =========================================================================
    private function jsonSuccess(Response $response, mixed $data, int $status = 200): Response
    {
        $payload = json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $response->getBody()->write($payload);
        return $response
            ->withStatus($status)
            ->withHeader('Content-Type', 'application/json');
    }


    // =========================================================================
    // jsonError — Helper: return an error JSON response.
    // =========================================================================
    private function jsonError(Response $response, string $message, int $status = 400): Response
    {
        $payload = json_encode(['success' => false, 'message' => $message, 'code' => $status]);
        $response->getBody()->write($payload);
        return $response
            ->withStatus($status)
            ->withHeader('Content-Type', 'application/json');
    }
}
