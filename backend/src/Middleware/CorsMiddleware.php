<?php
// =============================================================================
// src/Middleware/CorsMiddleware.php — CROSS-ORIGIN RESOURCE SHARING MIDDLEWARE
// =============================================================================
// WHAT IS CORS?
//   When the Next.js frontend (running on http://localhost:3000) sends a
//   request to the PHP backend (running on http://localhost:8000), the browser
//   blocks the request by default because the ORIGINS are different.
//   This is a security feature called the "Same-Origin Policy".
//
//   CORS (Cross-Origin Resource Sharing) is the mechanism that lets a server
//   say: "I trust requests from http://localhost:3000 — allow them."
//
// HOW IT WORKS:
//   1. The browser sends a "preflight" OPTIONS request to ask: "Can I send this?"
//   2. Our middleware responds with "Access-Control-Allow-Origin: *" headers.
//   3. The browser reads the headers and allows the actual request through.
//
// COMMON MISTAKE:
//   Forgetting to handle OPTIONS preflight requests.
//   The browser sends OPTIONS before POST/PUT/DELETE requests with a JSON body.
//   If we return 404 for OPTIONS, the browser aborts and shows a CORS error
//   even though the actual POST would have worked fine.
// =============================================================================

declare(strict_types=1);

namespace MediaVault\Middleware;

use Psr\Http\Message\ResponseInterface      as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Response as SlimResponse;


class CorsMiddleware implements MiddlewareInterface
{
    // "process" is called by Slim for EVERY request, before the route handler.
    // "$request" contains the incoming HTTP request.
    // "$handler" represents the next middleware or route handler in the chain.
    public function process(Request $request, Handler $handler): Response
    {
        // Handle preflight OPTIONS requests immediately.
        // These are sent by the browser to check CORS permissions BEFORE
        // sending the actual request.
        if ($request->getMethod() === 'OPTIONS') {
            // Create a 200 OK response with CORS headers.
            $response = new SlimResponse(200);
            return $this->addCorsHeaders($response);
        }

        // For non-OPTIONS requests, let the route handler run first,
        // then add CORS headers to its response.
        $response = $handler->handle($request);
        return $this->addCorsHeaders($response);
    }


    // "addCorsHeaders" adds the required CORS headers to any response.
    private function addCorsHeaders(Response $response): Response
    {
        // Load allowed origins from config.
        $config = require __DIR__ . '/../../config/app.php';
        $allowedOrigins = $config['cors_origins'];

        // Join all allowed origins into a comma-separated string.
        // For maximum simplicity in development we use '*' (allow all).
        // In production, replace '*' with your actual frontend domain.
        $originHeader = implode(', ', $allowedOrigins);

        return $response
            // Allow these specific origins (or "*" for all — development only!).
            ->withHeader('Access-Control-Allow-Origin', '*')

            // Which HTTP methods the browser may use.
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

            // Which request headers the browser may send.
            ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client')

            // How long the browser may cache the preflight response (in seconds).
            // 86400 = 24 hours.
            ->withHeader('Access-Control-Max-Age', '86400')

            // Tell the browser to re-check the preflight every 24 hours.
            ->withHeader('Vary', 'Origin');
    }
}
