<?php

class PersonaModel
{
    /** Načte všechny persony projektu seřazené podle ID. */
    public static function findByProject(int $projectId): array
    {
        return Database::fetchAll(
            "SELECT * FROM `personas` WHERE `project_id` = ? ORDER BY `id` ASC",
            [$projectId]
        );
    }

    /** Vytvoří novou personu v databázi (lokalně, bez figma_node_id). */
    public static function create(int $projectId, array $data): array
    {
        $stmt = Database::get()->prepare(
            "INSERT INTO `personas`
             (`project_id`, `figma_node_id`, `name`, `type`, `portrait_url`, `description`, `motivation`, `needs`, `problems`)
             VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $projectId,
            $data['name'] ?? '',
            $data['type'] ?? 'prototype',
            $data['portrait_url'] ?? null,
            $data['description'] ?? null,
            $data['motivation'] ?? null,
            $data['needs'] ?? null,
            $data['problems'] ?? null,
        ]);
        $id = (int)Database::lastInsertId();
        return Database::fetchOne("SELECT * FROM `personas` WHERE `id` = ?", [$id]);
    }

    /** Aktualizuje existující personu. */
    public static function update(int $personaId, int $projectId, array $data): array|false
    {
        $allowed = ['name', 'type', 'portrait_url', 'description', 'motivation', 'needs', 'problems'];
        $fields  = [];
        $values  = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "`{$field}` = ?";
                $values[] = $data[$field];
            }
        }

        if ($fields) {
            $values[] = $personaId;
            $values[] = $projectId;
            Database::execute(
                "UPDATE `personas` SET " . implode(', ', $fields) . " WHERE `id` = ? AND `project_id` = ?",
                $values
            );
        }

        return Database::fetchOne("SELECT * FROM `personas` WHERE `id` = ? AND `project_id` = ?", [$personaId, $projectId]);
    }

    /** Smaže personu. */
    public static function delete(int $personaId, int $projectId): bool
    {
        return Database::execute(
            "DELETE FROM `personas` WHERE `id` = ? AND `project_id` = ?",
            [$personaId, $projectId]
        ) > 0;
    }

    /**
     * Při Figma syncu nahradí pouze persony pocházející z Figma (mají figma_node_id).
     * Lokální persony (figma_node_id IS NULL) zůstávají zachovány.
     */
    public static function mergeAllForProject(int $projectId, array $items, \PDO $pdo): void
    {
        // Smaž pouze persony pocházející z Figma; lokální (figma_node_id IS NULL) ponech.
        $pdo->prepare("DELETE FROM `personas` WHERE `project_id` = ? AND `figma_node_id` IS NOT NULL")
            ->execute([$projectId]);

        if (!$items) {
            return;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO `personas`
             (`project_id`, `figma_node_id`, `name`, `type`, `portrait_url`, `description`, `motivation`, `needs`, `problems`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        foreach ($items as $item) {
            $stmt->execute([
                $projectId,
                $item['figma_node_id'] ?? null,
                $item['name']          ?? '',
                $item['type']          ?? 'prototype',
                $item['portrait_url']  ?? null,
                $item['description']   ?? null,
                $item['motivation']    ?? null,
                $item['needs']         ?? null,
                $item['problems']      ?? null,
            ]);
        }
    }
}
