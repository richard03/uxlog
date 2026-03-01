<?php

/**
 * Model pro práci s projekty.
 * Pole last_worked_at je vyplňováno automaticky při vytvoření a při jakékoli změně projektu/tasků/členů.
 */
class ProjectModel
{
    /**
     * Vrátí všechny projekty uživatele seřazené podle poslední aktualizace.
     */
    public static function findAllByUser(int $userId): array
    {
        return Database::fetchAll(
            "SELECT * FROM `projects` WHERE `user_id` = ? ORDER BY `updated_at` DESC",
            [$userId]
        );
    }

    /**
     * Find a single project that belongs to the given user. Returns false if not found or not owned.
     */
    public static function findOne(int $projectId, int $userId): array|false
    {
        return Database::fetchOne(
            "SELECT * FROM `projects` WHERE `id` = ? AND `user_id` = ?",
            [$projectId, $userId]
        );
    }

    /**
     * Vytvoří nový projekt. Pole last_worked_at se nastaví automaticky na aktuální datum.
     */
    public static function create(int $userId, array $data): array
    {
        $today = date('Y-m-d');
        Database::execute(
            "INSERT INTO `projects` (`user_id`, `name`, `scope`, `priority`, `status`, `last_worked_at`)
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                $userId,
                $data['name'],
                $data['scope']    ?? 'small',
                $data['priority'] ?? 'medium',
                $data['status']   ?? 'research',
                $today,
            ]
        );
        $id = (int)Database::lastInsertId();
        return Database::fetchOne("SELECT * FROM `projects` WHERE `id` = ?", [$id]);
    }

    /**
     * Aktualizuje projekt. Pole last_worked_at se vždy nastaví automaticky na aktuální datum.
     */
    public static function update(int $projectId, int $userId, array $data): array|false
    {
        $fields = ["`last_worked_at` = ?"];
        $values = [date('Y-m-d')];

        $allowed = ['name', 'scope', 'priority', 'status'];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "`{$field}` = ?";
                $values[] = $data[$field];
            }
        }

        $values[] = $projectId;
        $values[] = $userId;

        Database::execute(
            "UPDATE `projects` SET " . implode(', ', $fields) . " WHERE `id` = ? AND `user_id` = ?",
            $values
        );

        return self::findOne($projectId, $userId);
    }

    /**
     * Nastaví last_worked_at na aktuální datum. Volá se při práci s tasky, členy, Figmou apod.
     */
    public static function touchLastWorked(int $projectId, int $userId): void
    {
        Database::execute(
            "UPDATE `projects` SET `last_worked_at` = ? WHERE `id` = ? AND `user_id` = ?",
            [date('Y-m-d'), $projectId, $userId]
        );
    }

    public static function delete(int $projectId, int $userId): bool
    {
        $rows = Database::execute(
            "DELETE FROM `projects` WHERE `id` = ? AND `user_id` = ?",
            [$projectId, $userId]
        );
        return $rows > 0;
    }
}
