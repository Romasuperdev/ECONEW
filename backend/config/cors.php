<?php

/*
 | Origines autorisées :
 |  - En production : uniquement FRONTEND_URL (+ CORS_EXTRA_ORIGINS éventuels).
 |  - Hors production : on ajoute les origines locales de développement (Vite).
 | Définir FRONTEND_URL sur le domaine réel du front avant la mise en production.
 */

$origins = array_filter(array_merge(
    [env('FRONTEND_URL')],
    array_map('trim', explode(',', (string) env('CORS_EXTRA_ORIGINS', '')))
));

if (env('APP_ENV') !== 'production') {
    $origins = array_merge($origins, [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
    ]);
}

// Repli de sécurité pour éviter une liste vide (bloquerait tout le front).
if (empty($origins)) {
    $origins = ['http://localhost:5173'];
}

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_unique($origins)),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    // Auth par jeton Bearer (stateless) : pas de cookies -> credentials inutiles.
    'supports_credentials' => false,
];
