<?php

class ScenarioModel
{
    public static function findByProject(int $projectId): array
    {
        return Database::fetchAll(
            "SELECT * FROM `scenarios` WHERE `project_id` = ? ORDER BY `id` ASC",
            [$projectId]
        );
    }

    public static function replaceAllForProject(int $projectId, array $items, \PDO $pdo): void
    {
        $pdo->prepare("DELETE FROM `scenarios` WHERE `project_id` = ?")->execute([$projectId]);

        if (!$items) {
            return;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO `scenarios` (`project_id`, `figma_node_id`, `name`, `description`, `moscow_rating`)
             VALUES (?, ?, ?, ?, ?)"
        );
        foreach ($items as $item) {
            $stmt->execute([
                $projectId,
                $item['figma_node_id'] ?? null,
                $item['name']          ?? '',
                $item['description']   ?? null,
                $item['moscow_rating'] ?? 'Should',
            ]);
        }
    }
}
