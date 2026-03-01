<?php
/**
 * UXLog Database Installer
 * Idempotent – safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 * Run once at: https://uxlog.prokoho.cz/api/install.php
 */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

$errors  = [];
$created = [];

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $tables = [

        'users' => "CREATE TABLE IF NOT EXISTS `users` (
            `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `google_id`  VARCHAR(255) NOT NULL UNIQUE,
            `email`      VARCHAR(255) NOT NULL,
            `name`       VARCHAR(255) NOT NULL,
            `avatar_url` VARCHAR(500),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'projects' => "CREATE TABLE IF NOT EXISTS `projects` (
            `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `user_id`        INT UNSIGNED NOT NULL,
            `name`           VARCHAR(255) NOT NULL,
            `scope`          ENUM('small','medium','large') NOT NULL DEFAULT 'small',
            `priority`       ENUM('high','medium','low')    NOT NULL DEFAULT 'medium',
            `status`         ENUM('research','design','development') NOT NULL DEFAULT 'research',
            `last_worked_at` DATE,
            `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'tasks' => "CREATE TABLE IF NOT EXISTS `tasks` (
            `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id` INT UNSIGNED NOT NULL,
            `title`      TEXT NOT NULL,
            `completed`  TINYINT(1) NOT NULL DEFAULT 0,
            `sort_order` INT        NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'team_members' => "CREATE TABLE IF NOT EXISTS `team_members` (
            `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id` INT UNSIGNED NOT NULL,
            `name`       VARCHAR(255) NOT NULL,
            `contact`    VARCHAR(500),
            `role`       VARCHAR(255),
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'figma_connections' => "CREATE TABLE IF NOT EXISTS `figma_connections` (
            `id`             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id`     INT UNSIGNED NOT NULL UNIQUE,
            `access_token`   TEXT NOT NULL,
            `file_id`        VARCHAR(255) NOT NULL,
            `last_synced_at` TIMESTAMP NULL,
            `sync_status`    ENUM('idle','syncing','ok','error') NOT NULL DEFAULT 'idle',
            `sync_error`     TEXT,
            `created_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'stakeholders' => "CREATE TABLE IF NOT EXISTS `stakeholders` (
            `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id`      INT UNSIGNED NOT NULL,
            `figma_node_id`   VARCHAR(255),
            `name`            VARCHAR(255) NOT NULL,
            `type`            ENUM('person','group') NOT NULL DEFAULT 'person',
            `power_rating`    TINYINT UNSIGNED DEFAULT 5,
            `interest_rating` TINYINT UNSIGNED DEFAULT 5,
            `description`     TEXT,
            `color`           VARCHAR(7),
            `created_at`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'personas' => "CREATE TABLE IF NOT EXISTS `personas` (
            `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id`    INT UNSIGNED NOT NULL,
            `figma_node_id` VARCHAR(255),
            `name`          VARCHAR(255) NOT NULL,
            `type`          ENUM('prototype','persona') NOT NULL DEFAULT 'prototype',
            `portrait_url`  VARCHAR(500),
            `description`   TEXT,
            `motivation`    TEXT,
            `needs`         TEXT,
            `problems`      TEXT,
            `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'goals' => "CREATE TABLE IF NOT EXISTS `goals` (
            `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id`    INT UNSIGNED NOT NULL,
            `figma_node_id` VARCHAR(255),
            `name`          VARCHAR(255) NOT NULL,
            `description`   TEXT,
            `metrics`       JSON,
            `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'scenarios' => "CREATE TABLE IF NOT EXISTS `scenarios` (
            `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id`    INT UNSIGNED NOT NULL,
            `figma_node_id` VARCHAR(255),
            `name`          VARCHAR(255) NOT NULL,
            `description`   TEXT,
            `moscow_rating` ENUM('Must','Should','Could','Wont') DEFAULT 'Should',
            `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'requirements' => "CREATE TABLE IF NOT EXISTS `requirements` (
            `id`               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id`       INT UNSIGNED NOT NULL,
            `figma_node_id`    VARCHAR(255),
            `name`             VARCHAR(255) NOT NULL,
            `description`      TEXT,
            `severity`         TINYINT UNSIGNED DEFAULT 3,
            `impact_if_not_met` TEXT,
            `moscow_rating`    ENUM('Must','Should','Could','Wont') DEFAULT 'Should',
            `wont_have_reason` TEXT,
            `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'competitions' => "CREATE TABLE IF NOT EXISTS `competitions` (
            `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `project_id` INT UNSIGNED NOT NULL,
            `name`       VARCHAR(255) NOT NULL,
            `description` TEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        'rate_limit_log' => "CREATE TABLE IF NOT EXISTS `rate_limit_log` (
            `id`        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `key_type`  ENUM('ip','user') NOT NULL,
            `key_value` VARCHAR(255) NOT NULL,
            `endpoint`  VARCHAR(255) NOT NULL,
            `hit_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            INDEX `idx_rate_limit` (`key_type`, `key_value`, `endpoint`, `hit_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];

    foreach ($tables as $name => $sql) {
        $pdo->exec($sql);
        $created[] = $name;
    }

} catch (PDOException $e) {
    $errors[] = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>UXLog Installer</title>
<style>
  body { font-family: monospace; max-width: 700px; margin: 40px auto; padding: 0 20px; }
  .ok   { color: #16a34a; }
  .err  { color: #dc2626; }
  table { border-collapse: collapse; width: 100%; margin-top: 20px; }
  td,th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
  th    { background: #f3f4f6; }
</style>
</head>
<body>
<h1>UXLog – Database Installer</h1>

<?php if ($errors): ?>
  <h2 class="err">Errors</h2>
  <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e) ?></li><?php endforeach; ?></ul>
<?php else: ?>
  <h2 class="ok">Installation complete</h2>
  <table>
    <tr><th>Table</th><th>Status</th></tr>
    <?php foreach ($created as $t): ?>
      <tr><td><?= htmlspecialchars($t) ?></td><td class="ok">OK (created or already exists)</td></tr>
    <?php endforeach; ?>
  </table>
  <p style="margin-top:20px;color:#6b7280;">
    <strong>Next step:</strong> Remove or password-protect this file on production.
  </p>
<?php endif; ?>
</body>
</html>
