<?php
declare(strict_types=1);
namespace MediaVault\Controllers;

use Psr\Http\Message\ResponseInterface      as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use MediaVault\Database\Connection;


class HistoryController
{
    // =========================================================================
    // index — GET /history?page=1&limit=50
    // Returns a paginated list of download history records from MySQL.
    // =========================================================================
    public function index(Request $request, Response $response): Response
    {
        // "getQueryParams()" returns URL query parameters as an array.
        // Example URL: /history?page=2&limit=50
        $params = $request->getQueryParams();
        $page   = max(1, (int)($params['page']  ?? 1));
        $limit  = min(200, max(1, (int)($params['limit'] ?? 50)));
        $offset = ($page - 1) * $limit;  // Which row to start from

        // Query the downloads table with pagination.
        // "LIMIT ? OFFSET ?" is MySQL syntax for pagination.
        // "ORDER BY downloaded_at DESC" shows newest downloads first.
        $records = Connection::query(
            'SELECT id, source_url, platform, file_path, file_size_bytes,
                    media_type, file_hash, downloaded_at
             FROM   downloads
             ORDER BY downloaded_at DESC
             LIMIT  ? OFFSET ?',
            [$limit, $offset]
        );

        // Convert snake_case database column names to camelCase for the frontend.
        $formatted = array_map([$this, 'formatRecord'], $records);

        return $this->jsonSuccess($response, $formatted);
    }


    // =========================================================================
    // destroy — DELETE /history/{id}
    // Removes a single history record. Does NOT delete the file from disk.
    // =========================================================================
    public function destroy(Request $request, Response $response, array $args): Response
    {
        $id = (int)($args['id'] ?? 0);

        if ($id <= 0) {
            return $this->jsonError($response, 'Invalid ID', 422);
        }

        $affected = Connection::execute('DELETE FROM downloads WHERE id = ?', [$id]);

        if ($affected === 0) {
            return $this->jsonError($response, 'Record not found', 404);
        }

        return $this->jsonSuccess($response, null);
    }


    // Convert a database row (snake_case keys) into a camelCase array for JSON output.
    private function formatRecord(array $row): array
    {
        return [
            'id'            => (int)$row['id'],
            'sourceUrl'     => $row['source_url'],
            'platform'      => $row['platform'],
            'filePath'      => $row['file_path'],
            'fileSizeBytes' => (int)$row['file_size_bytes'],
            'mediaType'     => $row['media_type'],
            'fileHash'      => $row['file_hash'],
            'downloadedAt'  => $row['downloaded_at'],
        ];
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
