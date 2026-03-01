<?php

class FigmaClient
{
    private const BASE_URL = 'https://api.figma.com/v1';

    public function __construct(private string $accessToken) {}

    /**
     * Fetch the full document tree for a file.
     */
    public function getFile(string $fileId): array
    {
        return $this->request("/files/{$fileId}");
    }

    /**
     * Resolve image fill references to download URLs.
     * $imageRefs is an array of imageRef strings.
     * Returns ['imageRef' => 'https://...'] map.
     */
    public function getImages(string $fileId, array $imageRefs): array
    {
        if (!$imageRefs) {
            return [];
        }
        $ids  = implode(',', array_unique($imageRefs));
        $data = $this->request("/files/{$fileId}/images", ['ids' => $ids]);
        return $data['images'] ?? [];
    }

    private function request(string $endpoint, array $queryParams = []): array
    {
        $url = self::BASE_URL . $endpoint;
        if ($queryParams) {
            $url .= '?' . http_build_query($queryParams);
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => [
                'X-Figma-Token: ' . $this->accessToken,
            ],
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        curl_close($ch);

        if ($curlErr) {
            throw new RuntimeException('Figma cURL error: ' . $curlErr);
        }
        if ($httpCode !== 200) {
            $body = json_decode($response, true);
            $msg  = $body['err'] ?? $body['message'] ?? 'Unknown error';
            throw new RuntimeException("Figma API error {$httpCode}: {$msg}");
        }

        $data = json_decode($response, true);
        if (!is_array($data)) {
            throw new RuntimeException('Invalid JSON from Figma API');
        }
        return $data;
    }
}
