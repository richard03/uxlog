<?php

class MemberModel
{
    public static function findByProject(int $projectId): array
    {
        return Database::fetchAll(
            "SELECT * FROM `team_members` WHERE `project_id` = ? ORDER BY `id` ASC",
            [$projectId]
        );
    }

    public static function create(int $projectId, array $data): array
    {
        Database::execute(
            "INSERT INTO `team_members` (`project_id`, `name`, `contact`, `role`) VALUES (?, ?, ?, ?)",
            [$projectId, $data['name'], $data['contact'] ?? null, $data['role'] ?? null]
        );
        $id = (int)Database::lastInsertId();
        return Database::fetchOne("SELECT * FROM `team_members` WHERE `id` = ?", [$id]);
    }

    public static function update(int $memberId, int $projectId, array $data): array|false
    {
        $fields = [];
        $values = [];

        foreach (['name', 'contact', 'role'] as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "`{$field}` = ?";
                $values[] = $data[$field];
            }
        }

        if ($fields) {
            $values[] = $memberId;
            $values[] = $projectId;
            Database::execute(
                "UPDATE `team_members` SET " . implode(', ', $fields) . " WHERE `id` = ? AND `project_id` = ?",
                $values
            );
        }

        return Database::fetchOne(
            "SELECT * FROM `team_members` WHERE `id` = ? AND `project_id` = ?",
            [$memberId, $projectId]
        );
    }

    public static function delete(int $memberId, int $projectId): bool
    {
        return Database::execute(
            "DELETE FROM `team_members` WHERE `id` = ? AND `project_id` = ?",
            [$memberId, $projectId]
        ) > 0;
    }
}
