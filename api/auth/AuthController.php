<?php

class AuthController
{
    /**
     * POST /auth/google
     * Body: { "id_token": "<Google ID token>" }
     */
    public function googleLogin(array $params): void
    {
        $data = request_json();
        validate($data, ['id_token']);

        $googleData = GoogleVerifier::verify($data['id_token']);
        if ($googleData === null) {
            http_error(401, 'Invalid Google ID token');
        }

        $user = UserModel::createOrUpdate(
            $googleData['sub'],
            $googleData['email']          ?? '',
            $googleData['name']           ?? $googleData['email'],
            $googleData['picture']        ?? null
        );

        $token = JwtService::encode([
            'sub'   => $user['id'],
            'email' => $user['email'],
            'name'  => $user['name'],
        ]);

        json_response([
            'token' => $token,
            'user'  => [
                'id'         => $user['id'],
                'email'      => $user['email'],
                'name'       => $user['name'],
                'avatar_url' => $user['avatar_url'],
            ],
        ]);
    }

    /**
     * DELETE /auth/logout
     * JWT is stateless; logout is handled client-side by discarding the token.
     * This endpoint exists for logging / future token blacklisting.
     */
    public function logout(array $params): void
    {
        require_auth(); // verify token is valid before "logging out"
        json_response(['message' => 'Logged out']);
    }
}
