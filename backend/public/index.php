<?php
// =============================================================================
// public/index.php — THE SINGLE ENTRY POINT FOR ALL HTTP REQUESTS
// =============================================================================
// Every request to the PHP backend comes through this file FIRST.
// This is called the "Front Controller" pattern.
//
// WHY one file?
//   If you had separate files for each endpoint (download.php, media.php, etc.)
//   you would repeat setup code everywhere and it would be hard to maintain.
//   With a single entry point, setup happens once and then routes handle the rest.
//
// HOW IT WORKS:
//   Browser/Frontend sends HTTP request
//     → Apache/Nginx rewrites all URLs to public/index.php
//     → Slim reads the URL and HTTP method
//     → Slim matches the route (e.g. POST /media/extract → MediaController)
//     → Controller processes the request and returns JSON
//     → Slim sends the JSON response back to the frontend
//
// APACHE REWRITE (needed if running without PHP built-in server):
//   Create public/.htaccess:
//     RewriteEngine On
//     RewriteRule ^ index.php [QSA,L]
// =============================================================================

declare(strict_types=1);

// "declare(strict_types=1)" forces PHP to be strict about types.
// WHY: Without it, PHP silently converts types (e.g. string "42" → integer 42),
//      which hides bugs. With strict types, passing the wrong type throws a TypeError.


// ── AUTOLOADING ──
// Composer generates an "autoload.php" that automatically loads PHP classes.
// Without this, you would need to "require" every class file manually.
// "require" means "load this file and stop if it doesn't exist".
require __DIR__ . '/../vendor/autoload.php';


// ── ENVIRONMENT VARIABLES ──
// phpdotenv reads the .env file and makes variables available as $_ENV['KEY'].
// The .env file contains database passwords, API keys, etc.
use Dotenv\Dotenv;

// "Dotenv::createImmutable(__DIR__ . '/..')" looks for .env in the backend/ folder.
// "load()" reads the file. If .env doesn't exist, it silently continues.
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();  // "safeLoad" does not throw if .env is missing


// ── SLIM APPLICATION ──
// Slim is a "micro-framework" — it provides routing (matching URLs to code)
// without the overhead of a full framework like Laravel.
use Slim\Factory\AppFactory;
use Slim\Routing\RouteCollectorProxy;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface      as Response;

// Import our controllers (classes that handle specific groups of routes).
use MediaVault\Controllers\MediaController;
use MediaVault\Controllers\DownloadController;
use MediaVault\Controllers\ProfileController;
use MediaVault\Controllers\HistoryController;

// Import our middleware (code that runs before/after every request).
use MediaVault\Middleware\CorsMiddleware;


// ── CREATE THE APP ──
// "AppFactory::create()" creates a new Slim application instance.
$app = AppFactory::create();


// ── ADD MIDDLEWARE ──
// Middleware runs in LIFO order (Last In, First Out) — the last one added
// runs first for requests, and first for responses. Think of it as layers
// wrapping the request/response cycle.

// Parse the JSON request body automatically.
// WHY: The frontend sends JSON ({"url": "..."}). Without this, $request->getParsedBody()
//      would return null for JSON requests.
$app->addBodyParsingMiddleware();

// Handle errors and return them as JSON (not HTML error pages).
// "true" = display error details (development). Set to "false" in production.
$app->addErrorMiddleware(
    displayErrorDetails: ($_ENV['APP_ENV'] ?? 'development') === 'development',
    logErrors:           true,
    logErrorDetails:     true
);

// Add CORS headers so the browser allows our frontend to call this API.
// Without CORS headers, the browser blocks cross-origin requests for security.
$app->add(new CorsMiddleware());


// ── ROUTES ──
// A "route" maps a URL pattern + HTTP method to a controller action.
// Format: $app->METHOD('url', [ControllerClass::class, 'methodName'])
//
// Slim creates the controller instance via its container (dependency injection).
// For simplicity here, we instantiate controllers directly.


// Health check — the frontend can call this to verify the backend is running.
$app->get('/health', function (Request $request, Response $response): Response {
    $response->getBody()->write(json_encode(['status' => 'ok', 'version' => '1.0.0']));
    return $response->withHeader('Content-Type', 'application/json');
});


// ── MEDIA ROUTES ──
// "group('/media', ...)" prefixes all routes inside with "/media".
$app->group('/media', function (RouteCollectorProxy $group): void {

    // POST /media/extract — extract media items from a URL (calls Python yt-dlp).
    $group->post('/extract', [MediaController::class, 'extract']);
});


// ── DOWNLOAD ROUTES ──
$app->group('/download', function (RouteCollectorProxy $group): void {

    // POST /download/start — start downloading a media item.
    $group->post('/start', [DownloadController::class, 'start']);

    // GET  /download/{id}/progress — get the current progress of a job.
    $group->get('/{id}/progress', [DownloadController::class, 'progress']);

    // POST /download/{id}/pause  — pause a running download.
    $group->post('/{id}/pause', [DownloadController::class, 'pause']);

    // POST /download/{id}/resume — resume a paused download.
    $group->post('/{id}/resume', [DownloadController::class, 'resume']);

    // POST /download/{id}/retry — retry a failed download.
    $group->post('/{id}/retry', [DownloadController::class, 'retry']);

    // DELETE /download/{id} — cancel and remove a download.
    $group->delete('/{id}', [DownloadController::class, 'cancel']);
});


// ── PROFILE ROUTES ──
$app->group('/profile', function (RouteCollectorProxy $group): void {

    // POST /profile/scan — scan a profile URL for media items.
    $group->post('/scan', [ProfileController::class, 'scan']);
});


// ── HISTORY ROUTES ──
$app->group('/history', function (RouteCollectorProxy $group): void {

    // GET    /history        — paginated list of download history.
    $group->get('',     [HistoryController::class, 'index']);

    // DELETE /history/{id}  — remove a history record.
    $group->delete('/{id}', [HistoryController::class, 'destroy']);
});


// ── RUN THE APP ──
// Slim reads the current HTTP request, matches a route, runs the controller,
// and sends the response back to the browser.
$app->run();
