<?php
/**
 * Front controller – every request to the API passes through here.
 * Pipeline: Bootstrap → CORS → Rate Limit → Route → Dispatch
 */

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/router.php';

// 1. CORS headers (and exit on OPTIONS preflight)
Cors::handle();

// 2. Determine path (strip /api prefix if present)
$requestUri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptDir   = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$path        = substr($requestUri, strlen($scriptDir)) ?: '/';
$path        = '/' . trim($path, '/');

$method = $_SERVER['REQUEST_METHOD'];

// 3. Rate limiting on auth endpoint (by IP)
if (str_starts_with($path, '/auth')) {
    RateLimit::check('ip', client_ip(), 'auth', RATE_LIMIT_AUTH);
}

// 4. Route
$match = route($method, $path);
if ($match === null) {
    http_error(404, 'Not found');
}

[$controllerClass, $action, $params] = $match;

// 5. Rate limiting on API endpoints (by user token if present)
if (!str_starts_with($path, '/auth')) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (str_starts_with($authHeader, 'Bearer ')) {
        $token   = substr($authHeader, 7);
        $payload = JwtService::decode($token);
        $userId  = $payload ? (string)$payload['sub'] : client_ip();
        $keyType = $payload ? 'user' : 'ip';
    } else {
        $userId  = client_ip();
        $keyType = 'ip';
    }
    RateLimit::check($keyType, $userId, 'api', RATE_LIMIT_API);
}

// 6. Instantiate controller and call action
$controller = new $controllerClass();
$controller->$action($params);
