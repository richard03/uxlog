<?php

/**
 * Model pro práci s konkurenčními položkami projektu.
 * Konkurence se zadávají pouze ručně (bez Figma synchronizace).
 */
class CompetitionModel
{
    /**
     * Načte všechny konkurenční položky projektu seřazené podle ID.
     */
    public static function findByProject(int $projectId): array
    {
        return Database::fetchAll(
            "SELECT * FROM `competitions` WHERE `project_id` = ? ORDER BY `id` ASC",
            [$projectId]
        );
    }

    /**
     * Vytvoří novou konkurenční položku.
     */
    public static function create(int $projectId, array $data): array
    {
        $stmt = Database::get()->prepare(
            "INSERT INTO `competitions` (`project_id`, `name`, `description`)
             VALUES (?, ?, ?)"
        );
        $stmt->execute([
            $projectId,
            $data['name'] ?? '',
            $data['description'] ?? null,
        ]);
        $id = (int)Database::lastInsertId();
        return Database::fetchOne("SELECT * FROM `competitions` WHERE `id` = ?", [$id]);
    }

    /**
     * Aktualizuje existující konkurenční položku.
     */
    public static function update(int $competitionId, int $projectId, array $data): array|false
    {
        $allowed = ['name', 'description'];
        $fields  = [];
        $values  = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "`{$field}` = ?";
                $values[] = $data[$field];
            }
        }

        if ($fields) {
            $values[] = $competitionId;
            $values[] = $projectId;
            Database::execute(
                "UPDATE `competitions` SET " . implode(', ', $fields) . " WHERE `id` = ? AND `project_id` = ?",
                $values
            );
        }

        return Database::fetchOne("SELECT * FROM `competitions` WHERE `id` = ? AND `project_id` = ?", [$competitionId, $projectId]);
    }

    /**
     * Smaže konkurenční položku.
     */
    public static function delete(int $competitionId, int $projectId): bool
    {
        return Database::execute(
            "DELETE FROM `competitions` WHERE `id` = ? AND `project_id` = ?",
            [$competitionId, $projectId]
        ) > 0;
    }
}
