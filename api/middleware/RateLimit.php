<?php

class RateLimit
{
    /**
     * Check rate limit; calls http_error(429) if exceeded.
     *
     * @param string $keyType   'ip' or 'user'
     * @param string $keyValue  IP address or user ID string
     * @param string $endpoint  endpoint identifier (e.g. 'auth', 'api')
     * @param int    $limit     max requests per minute
     */
    public static function check(string $keyType, string $keyValue, string $endpoint, int $limit): void
    {
        // Purge old entries older than 1 minute to keep table small
        Database::execute(
            "DELETE FROM `rate_limit_log`
             WHERE `key_type` = ? AND `key_value` = ? AND `endpoint` = ?
               AND `hit_at` < DATE_SUB(NOW(3), INTERVAL 1 MINUTE)",
            [$keyType, $keyValue, $endpoint]
        );

        // Count recent hits in the last minute
        $row = Database::fetchOne(
            "SELECT COUNT(*) AS cnt FROM `rate_limit_log`
             WHERE `key_type` = ? AND `key_value` = ? AND `endpoint` = ?
               AND `hit_at` >= DATE_SUB(NOW(3), INTERVAL 1 MINUTE)",
            [$keyType, $keyValue, $endpoint]
        );

        if ((int)($row['cnt'] ?? 0) >= $limit) {
            http_error(429, 'Rate limit exceeded. Try again in a minute.');
        }

        // Log this request
        Database::execute(
            "INSERT INTO `rate_limit_log` (`key_type`, `key_value`, `endpoint`) VALUES (?, ?, ?)",
            [$keyType, $keyValue, $endpoint]
        );
    }
}
