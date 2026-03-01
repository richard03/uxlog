<?php

class RequirementModel
{
    public static function findByProject(int $projectId): array
    {
        return Database::fetchAll(
            "SELECT * FROM `requirements` WHERE `project_id` = ? ORDER BY `id` ASC",
            [$projectId]
        );
    }

    public static function replaceAllForProject(int $projectId, array $items, \PDO $pdo): void
    {
        $pdo->prepare("DELETE FROM `requirements` WHERE `project_id` = ?")->execute([$projectId]);

        if (!$items) {
            return;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO `requirements`
             (`project_id`, `figma_node_id`, `name`, `description`, `severity`, `impact_if_not_met`, `moscow_rating`, `wont_have_reason`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($items as $item) {
            $stmt->execute([
                $projectId,
                $item['figma_node_id']    ?? null,
                $item['name']             ?? '',
                $item['description']      ?? null,
                $item['severity']         ?? 3,
                $item['impact_if_not_met'] ?? null,
                $item['moscow_rating']    ?? 'Should',
                $item['wont_have_reason'] ?? null,
            ]);
        }
    }
}
