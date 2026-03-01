<?php

/**
 * Send a JSON response and exit.
 */
function json_response(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Send a JSON error response and exit.
 */
function http_error(int $status, string $message): never
{
    json_response(['error' => $message], $status);
}

/**
 * Require a valid JWT and return the decoded payload.
 * Calls http_error(401) on failure.
 */
function require_auth(): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!str_starts_with($header, 'Bearer ')) {
        http_error(401, 'Missing or invalid Authorization header');
    }
    $token = substr($header, 7);
    $payload = JwtService::decode($token);
    if ($payload === null) {
        http_error(401, 'Invalid or expired token');
    }
    return $payload;
}

/**
 * Parse and validate request body as JSON.
 * Returns the decoded array. Calls http_error(400) on invalid JSON.
 */
function request_json(): array
{
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_error(400, 'Invalid JSON body');
    }
    return $data ?? [];
}

/**
 * Validate that required fields are present and non-empty in $data.
 * Calls http_error(422) listing missing fields.
 */
function validate(array $data, array $required): void
{
    $missing = [];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            $missing[] = $field;
        }
    }
    if ($missing) {
        http_error(422, 'Missing required fields: ' . implode(', ', $missing));
    }
}

/**
 * Return the client IP address (proxied or direct).
 */
function client_ip(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'] as $key) {
        if (!empty($_SERVER[$key])) {
            return trim(explode(',', $_SERVER[$key])[0]);
        }
    }
    return '0.0.0.0';
}
