<?php
/**
 * Bootstrap – loaded by index.php before any routing.
 * Sets up config, autoloading, DB, and global exception handler.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db/Database.php';
require_once __DIR__ . '/helpers.php';

// Simple class autoloader
spl_autoload_register(function (string $class): void {
    $map = [
        // middleware
        'Cors'               => __DIR__ . '/middleware/Cors.php',
        'RateLimit'          => __DIR__ . '/middleware/RateLimit.php',
        // auth
        'JwtService'         => __DIR__ . '/auth/JwtService.php',
        'GoogleVerifier'     => __DIR__ . '/auth/GoogleVerifier.php',
        'AuthController'     => __DIR__ . '/auth/AuthController.php',
        // models
        'UserModel'          => __DIR__ . '/models/UserModel.php',
        'ProjectModel'       => __DIR__ . '/models/ProjectModel.php',
        'TaskModel'          => __DIR__ . '/models/TaskModel.php',
        'MemberModel'        => __DIR__ . '/models/MemberModel.php',
        'FigmaModel'         => __DIR__ . '/models/FigmaModel.php',
        'StakeholderModel'   => __DIR__ . '/models/StakeholderModel.php',
        'PersonaModel'       => __DIR__ . '/models/PersonaModel.php',
        'GoalModel'          => __DIR__ . '/models/GoalModel.php',
        'ScenarioModel'      => __DIR__ . '/models/ScenarioModel.php',
        'RequirementModel'   => __DIR__ . '/models/RequirementModel.php',
        'CompetitionModel'   => __DIR__ . '/models/CompetitionModel.php',
        // controllers
        'ProjectController'  => __DIR__ . '/controllers/ProjectController.php',
        'TaskController'     => __DIR__ . '/controllers/TaskController.php',
        'MemberController'   => __DIR__ . '/controllers/MemberController.php',
        'FigmaController'    => __DIR__ . '/controllers/FigmaController.php',
        'PersonaController'   => __DIR__ . '/controllers/PersonaController.php',
        'CompetitionController' => __DIR__ . '/controllers/CompetitionController.php',
        // figma
        'FigmaClient'        => __DIR__ . '/figma/FigmaClient.php',
        'FigmaParser'        => __DIR__ . '/figma/FigmaParser.php',
        'StakeholderParser'  => __DIR__ . '/figma/parsers/StakeholderParser.php',
        'PersonaParser'      => __DIR__ . '/figma/parsers/PersonaParser.php',
        'GoalParser'         => __DIR__ . '/figma/parsers/GoalParser.php',
        'ScenarioParser'     => __DIR__ . '/figma/parsers/ScenarioParser.php',
        'RequirementParser'  => __DIR__ . '/figma/parsers/RequirementParser.php',
    ];

    if (isset($map[$class])) {
        require_once $map[$class];
    }
});

// Global exception handler – converts uncaught exceptions to JSON error responses
set_exception_handler(function (Throwable $e): void {
    if (DEBUG) {
        http_error(500, $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    } else {
        http_error(500, 'Internal server error');
    }
});
