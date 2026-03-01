<?php
/**
 * Migrace databáze – spusťte jednou pro aktualizaci existujících tabulek.
 * Např. po změně ENUM v projects.status (odebrání publication, operation).
 *
 * Spustit: https://uxlog.prokoho.cz/api/migrate.php
 */

require_once __DIR__ . '/config.php';

header('Content-Type: text/html; charset=utf-8');

$pdo = new PDO(
    'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
    DB_USER,
    DB_PASS,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$done = [];

// Migrace: projects.status – pouze Research, Design, Development
try {
    $pdo->exec("UPDATE `projects` SET `status` = 'development' WHERE `status` IN ('publication', 'operation')");
    $pdo->exec("ALTER TABLE `projects` MODIFY `status` ENUM('research','design','development') NOT NULL DEFAULT 'research'");
    $done[] = 'projects.status: limited to research, design, development';
} catch (PDOException $e) {
    // Možná již migrováno
    if (strpos($e->getMessage(), 'Duplicate column name') === false) {
        $done[] = 'projects.status: ' . $e->getMessage();
    }
}

// Vytvoření tabulky competitions, pokud neexistuje
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `competitions` (
        `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `project_id` INT UNSIGNED NOT NULL,
        `name`       VARCHAR(255) NOT NULL,
        `description` TEXT,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $done[] = 'competitions: table created or exists';
} catch (PDOException $e) {
    $done[] = 'competitions: ' . $e->getMessage();
}

?>
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>UXLog Migration</title></head>
<body>
<h1>UXLog – Migration</h1>
<ul><?php foreach ($done as $d): ?><li><?= htmlspecialchars($d) ?></li><?php endforeach; ?></ul>
<p><strong>Next step:</strong> Remove or password-protect this file on production.</p>
</body>
</html>
