<?php
declare(strict_types=1);

/**
 * Sdílená implementace proxy Flexi API pro Figma plugin (CORS).
 * Načítá se jen z flexi-proxy*.php po definici konstanty FLEXI_PROXY_ENTRY.
 */

if (!defined('FLEXI_PROXY_ENTRY')) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Forbidden';
    exit;
}

/**
 * Přepošle požadavek na zadaný základ Flexi API a vypíše odpověď.
 *
 * @param string $flexiBase Kořen URL bez koncové lomky (např. https://flexiapi.prokoho.cz).
 */
function flexiProxyRun(string $flexiBase): void
{
    $flexiBase = rtrim($flexiBase, '/');

    header('Vary: Origin');

    $path = isset($_GET['path']) ? (string) $_GET['path'] : '';
    if ($path === '') {
        sendCorsHeaders();
        http_response_code(400);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Chybí parametr path']);
        exit;
    }

    if (!preg_match('#^/api/uxlog_#', $path)) {
        sendCorsHeaders();
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Nepovolená cesta']);
        exit;
    }

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    sendCorsHeaders();

    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    $url = $flexiBase . $path;

    $headers = [];
    $auth = flexiProxyGetAuthorizationHeader();
    if ($auth !== '') {
        $headers[] = 'Authorization: ' . $auth;
    }

    $body = null;
    if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
        $raw = file_get_contents('php://input');
        $body = $raw !== false ? $raw : '';
        $headers[] = 'Content-Type: application/json';
    }

    if (!function_exists('curl_init')) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Na serveru chybí rozšíření curl']);
        exit;
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 60);
    if ($body !== null && $body !== '') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($ch);
    if ($response === false) {
        $err = curl_error($ch);
        curl_close($ch);
        http_response_code(502);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Proxy selhalo', 'detail' => $err]);
        exit;
    }

    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    http_response_code($httpCode);
    if (is_string($contentType) && $contentType !== '') {
        header('Content-Type: ' . $contentType);
    } else {
        header('Content-Type: application/json; charset=utf-8');
    }
    echo $response;
}

/**
 * Nastaví hlavičky CORS (Figma sandbox, origin null, povolené domény).
 */
function sendCorsHeaders(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowed = [
        'https://uxlog.prokoho.cz',
        'https://www.figma.com',
        'https://figma.com',
    ];
    if ($origin === '' || $origin === 'null') {
        header('Access-Control-Allow-Origin: *');
    } elseif (in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        header('Access-Control-Allow-Origin: https://uxlog.prokoho.cz');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Max-Age: 86400');
}

/**
 * Načte Authorization z hlavičky (Apache často nepředává do PHP bez RewriteRule).
 */
function flexiProxyGetAuthorizationHeader(): string
{
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return (string) $_SERVER['HTTP_AUTHORIZATION'];
    }
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    return '';
}
