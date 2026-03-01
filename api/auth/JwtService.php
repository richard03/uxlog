<?php

class JwtService
{
    private const ALGO    = 'sha256';
    private const EXPIRY  = 7 * 24 * 3600; // 7 days

    public static function encode(array $payload): string
    {
        $header = self::b64url(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload['iat'] = time();
        $payload['exp'] = time() + self::EXPIRY;
        $body      = self::b64url(json_encode($payload));
        $signature = self::sign($header . '.' . $body);
        return $header . '.' . $body . '.' . $signature;
    }

    /**
     * Decode and verify a JWT. Returns payload array or null on failure.
     */
    public static function decode(string $token): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$header, $body, $sig] = $parts;

        // Verify signature
        if (!hash_equals(self::sign($header . '.' . $body), $sig)) {
            return null;
        }

        $payload = json_decode(self::b64urldecode($body), true);
        if (!is_array($payload)) {
            return null;
        }

        // Check expiry
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    private static function sign(string $data): string
    {
        return self::b64url(hash_hmac(self::ALGO, $data, JWT_SECRET, true));
    }

    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64urldecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}
