<?php

class UserModel
{
    public static function findByGoogleId(string $googleId): array|false
    {
        return Database::fetchOne(
            "SELECT * FROM `users` WHERE `google_id` = ?",
            [$googleId]
        );
    }

    /**
     * Insert or update user from Google profile data.
     * Returns the user row.
     */
    public static function createOrUpdate(
        string $googleId,
        string $email,
        string $name,
        ?string $avatarUrl
    ): array {
        Database::execute(
            "INSERT INTO `users` (`google_id`, `email`, `name`, `avatar_url`)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               `email`      = VALUES(`email`),
               `name`       = VALUES(`name`),
               `avatar_url` = VALUES(`avatar_url`)",
            [$googleId, $email, $name, $avatarUrl]
        );

        return self::findByGoogleId($googleId);
    }
}
