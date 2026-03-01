<?php

class FigmaModel
{
    public static function getConnection(int $projectId): array|false
    {
        return Database::fetchOne(
            "SELECT `id`, `project_id`, `file_id`, `last_synced_at`, `sync_status`, `sync_error`
             FROM `figma_connections` WHERE `project_id` = ?",
            [$projectId]
        );
    }

    /** Returns the connection row including access_token (for internal use only). */
    public static function getConnectionWithToken(int $projectId): array|false
    {
        return Database::fetchOne(
            "SELECT * FROM `figma_connections` WHERE `project_id` = ?",
            [$projectId]
        );
    }

    public static function upsertConnection(int $projectId, string $accessToken, string $fileId): array
    {
        Database::execute(
            "INSERT INTO `figma_connections` (`project_id`, `access_token`, `file_id`)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
               `access_token` = VALUES(`access_token`),
               `file_id`      = VALUES(`file_id`),
               `sync_status`  = 'idle',
               `sync_error`   = NULL",
            [$projectId, $accessToken, $fileId]
        );
        return self::getConnection($projectId);
    }

    public static function setSyncStatus(int $projectId, string $status, ?string $error = null): void
    {
        Database::execute(
            "UPDATE `figma_connections`
             SET `sync_status` = ?, `sync_error` = ?
             WHERE `project_id` = ?",
            [$status, $error, $projectId]
        );
    }

    public static function markSynced(int $projectId): void
    {
        Database::execute(
            "UPDATE `figma_connections`
             SET `sync_status` = 'ok', `sync_error` = NULL, `last_synced_at` = NOW()
             WHERE `project_id` = ?",
            [$projectId]
        );
    }
}
