<?php

class GoalModel
{
    public static function findByProject(int $projectId): array
    {
        $rows = Database::fetchAll(
            "SELECT * FROM `goals` WHERE `project_id` = ? ORDER BY `id` ASC",
            [$projectId]
        );
        foreach ($rows as &$row) {
            $row['metrics'] = $row['metrics'] ? json_decode($row['metrics'], true) : [];
        }
        return $rows;
    }

    public static function replaceAllForProject(int $projectId, array $items, \PDO $pdo): void
    {
        $pdo->prepare("DELETE FROM `goals` WHERE `project_id` = ?")->execute([$projectId]);

        if (!$items) {
            return;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO `goals` (`project_id`, `figma_node_id`, `name`, `description`, `metrics`)
             VALUES (?, ?, ?, ?, ?)"
        );
        foreach ($items as $item) {
            $stmt->execute([
                $projectId,
                $item['figma_node_id'] ?? null,
                $item['name']          ?? '',
                $item['description']   ?? null,
                isset($item['metrics']) ? json_encode($item['metrics']) : null,
            ]);
        }
    }
}
