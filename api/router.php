<?php

/**
 * Match the request path and method to a [controller, method, params] tuple.
 * Returns null if no route matches (results in 404).
 *
 * @param string $method  HTTP method (GET, POST, PUT, DELETE)
 * @param string $path    URL path, e.g. "/projects/42/tasks/7"
 * @return array{0:string,1:string,2:array}|null
 */
function route(string $method, string $path): ?array
{
    $routes = [
        // Auth
        ['POST',   '/auth/google',                         'AuthController',    'googleLogin'],
        ['DELETE', '/auth/logout',                         'AuthController',    'logout'],

        // Projects
        ['GET',    '/projects',                            'ProjectController', 'index'],
        ['POST',   '/projects',                            'ProjectController', 'create'],
        ['GET',    '/projects/{id}',                       'ProjectController', 'show'],
        ['PUT',    '/projects/{id}',                       'ProjectController', 'update'],
        ['DELETE', '/projects/{id}',                       'ProjectController', 'destroy'],

        // Tasks
        ['GET',    '/projects/{id}/tasks',                 'TaskController',    'index'],
        ['POST',   '/projects/{id}/tasks',                 'TaskController',    'create'],
        ['PUT',    '/projects/{id}/tasks/{tid}',           'TaskController',    'update'],
        ['DELETE', '/projects/{id}/tasks/{tid}',           'TaskController',    'destroy'],

        // Members
        ['GET',    '/projects/{id}/members',               'MemberController',  'index'],
        ['POST',   '/projects/{id}/members',               'MemberController',  'create'],
        ['PUT',    '/projects/{id}/members/{mid}',         'MemberController',  'update'],
        ['DELETE', '/projects/{id}/members/{mid}',         'MemberController',  'destroy'],

        // Figma
        ['GET',    '/projects/{id}/figma',                 'FigmaController',   'getConnection'],
        ['PUT',    '/projects/{id}/figma',                 'FigmaController',   'setConnection'],
        ['GET',    '/projects/{id}/figma/sync',            'FigmaController',   'sync'],

        // Personas
        ['POST',   '/projects/{id}/personas',              'PersonaController', 'create'],
        ['PUT',    '/projects/{id}/personas/{pid}',        'PersonaController', 'update'],
        ['DELETE', '/projects/{id}/personas/{pid}',        'PersonaController', 'destroy'],

        // Competitions
        ['POST',   '/projects/{id}/competitions',           'CompetitionController', 'create'],
        ['PUT',    '/projects/{id}/competitions/{cid}',     'CompetitionController', 'update'],
        ['DELETE', '/projects/{id}/competitions/{cid}',     'CompetitionController', 'destroy'],
    ];

    foreach ($routes as [$routeMethod, $routePath, $controller, $action]) {
        if ($routeMethod !== $method) {
            continue;
        }

        // Convert {param} placeholders to named capture groups
        $pattern = preg_replace('/\{(\w+)\}/', '(?P<$1>[^/]+)', $routePath);
        $pattern = '#^' . $pattern . '$#';

        if (preg_match($pattern, $path, $matches)) {
            // Keep only named captures
            $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
            return [$controller, $action, $params];
        }
    }

    return null;
}
