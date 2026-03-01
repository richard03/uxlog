<?php

class GoogleVerifier
{
    private const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo?id_token=';

    /**
     * Verify a Google ID token and return the user info payload.
     * Returns null if the token is invalid or the audience doesn't match.
     */
    public static function verify(string $idToken): ?array
    {
        $url = self::TOKENINFO_URL . urlencode($idToken);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            return null;
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            return null;
        }

        // Validate audience
        if (($data['aud'] ?? '') !== GOOGLE_CLIENT_ID) {
            return null;
        }

        return $data;
    }
}
