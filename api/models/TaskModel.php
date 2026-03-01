<?php

class TaskModel
{
    public static function findByProject(int $projectId): array
    {
        return Database::fetchAll(
            "SELECT * FROM `tasks` WHERE `project_id` = ? ORDER BY `sort_order` ASC, `id` ASC",
            [$projectId]
        );
    }

    public static function create(int $projectId, array $data): array
    {
        // Place at end of list
        $maxOrder = Database::fetchOne(
            "SELECT COALESCE(MAX(`sort_order`), 0) AS m FROM `tasks` WHERE `project_id` = ?",
            [$projectId]
        );
        $nextOrder = ($maxOrder['m'] ?? 0) + 1;

        Database::execute(
            "INSERT INTO `tasks` (`project_id`, `title`, `completed`, `sort_order`) VALUES (?, ?, ?, ?)",
            [$projectId, $data['title'], 0, $nextOrder]
        );
        $id = (int)Database::lastInsertId();
        return Database::fetchOne("SELECT * FROM `tasks` WHERE `id` = ?", [$id]);
    }

    public static function update(int $taskId, int $projectId, array $data): array|false
    {
        $fields = [];
        $values = [];

        $allowed = ['title', 'completed', 'sort_order'];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "`{$field}` = ?";
                $values[] = $data[$field];
            }
        }

        if (!$fields) {
            return Database::fetchOne("SELECT * FROM `tasks` WHERE `id` = ? AND `project_id` = ?", [$taskId, $projectId]);
        }

        $values[] = $taskId;
        $values[] = $projectId;

        Database::execute(
            "UPDATE `tasks` SET " . implode(', ', $fields) . " WHERE `id` = ? AND `project_id` = ?",
            $values
        );

        return Database::fetchOne("SELECT * FROM `tasks` WHERE `id` = ? AND `project_id` = ?", [$taskId, $projectId]);
    }

    public static function delete(int $taskId, int $projectId): bool
    {
        return Database::execute(
            "DELETE FROM `tasks` WHERE `id` = ? AND `project_id` = ?",
            [$taskId, $projectId]
        ) > 0;
    }
}
