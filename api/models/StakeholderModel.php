<?php

class StakeholderModel
{
    public static function findByProject(int $projectId): array
    {
        return Database::fetchAll(
            "SELECT * FROM `stakeholders` WHERE `project_id` = ? ORDER BY `id` ASC",
            [$projectId]
        );
    }

    /**
     * Replace all stakeholders for a project in a single transaction.
     * Called from Figma sync.
     */
    public static function replaceAllForProject(int $projectId, array $items, \PDO $pdo): void
    {
        $pdo->prepare("DELETE FROM `stakeholders` WHERE `project_id` = ?")->execute([$projectId]);

        if (!$items) {
            return;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO `stakeholders`
             (`project_id`, `figma_node_id`, `name`, `type`, `power_rating`, `interest_rating`, `description`, `color`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($items as $item) {
            $stmt->execute([
                $projectId,
                $item['figma_node_id']   ?? null,
                $item['name']            ?? '',
                $item['type']            ?? 'person',
                $item['power_rating']    ?? 5,
                $item['interest_rating'] ?? 5,
                $item['description']     ?? null,
                $item['color']           ?? null,
            ]);
        }
    }
}
