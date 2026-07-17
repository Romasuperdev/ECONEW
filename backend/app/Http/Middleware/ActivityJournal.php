<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Journalise automatiquement chaque écriture réussie (POST/PUT/PATCH/DELETE)
 * dans le fichier JOURNAL_ACTIVITES.md à la racine du projet.
 * N'interrompt jamais la requête en cas d'erreur d'écriture.
 */
class ActivityJournal
{
    private const ACTIONS = [
        'POST' => 'Création',
        'PUT' => 'Modification',
        'PATCH' => 'Modification',
        'DELETE' => 'Suppression',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        try {
            $method = strtoupper($request->getMethod());
            if (! isset(self::ACTIONS[$method])) {
                return $response;
            }
            $status = $response->getStatusCode();
            if ($status < 200 || $status >= 300) {
                return $response; // on ne journalise que les actions réussies
            }
            $this->append($request, $method, $status);
        } catch (\Throwable $e) {
            // journalisation best-effort : ne bloque jamais la réponse
        }

        return $response;
    }

    private function append(Request $request, string $method, int $status): void
    {
        $user = $request->user();
        $name = $user ? ($user->name ?? 'Utilisateur') : 'Anonyme';
        $role = $user ? ($user->role ?? '-') : '-';
        $soc = $request->header('X-Societe') ?: '-';
        $etab = $request->header('X-Etablissement') ?: '-';
        $path = '/'.ltrim($request->path(), '/');
        $action = self::ACTIONS[$method];
        $when = now()->format('Y-m-d H:i:s');

        // Échappe les barres verticales pour ne pas casser le tableau Markdown.
        $clean = fn ($v) => str_replace(['|', "\n", "\r"], [' ', ' ', ' '], (string) $v);

        $line = sprintf(
            "| %s | %s | %s | %s / %s | %s | %s %s | %d |\n",
            $when, $clean($name), $clean($role), $clean($soc), $clean($etab),
            $action, $method, $clean($path), $status
        );

        $file = dirname(base_path()).DIRECTORY_SEPARATOR.'JOURNAL_ACTIVITES.md';
        if (! is_file($file)) {
            file_put_contents($file, $this->header(), LOCK_EX);
        }
        file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
    }

    private function header(): string
    {
        return "# Journal des activités — Economat\n\n"
            ."Enregistrement automatique de toutes les écritures effectuées dans l'application "
            ."(création, modification, suppression). Ne pas modifier manuellement.\n\n"
            ."| Date & heure | Utilisateur | Rôle | Société / Établissement | Action | Requête | Statut |\n"
            ."|---|---|---|---|---|---|---|\n";
    }
}
