<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // API stateless par token Bearer (pas de CSRF / cookies)
        // Journalisation automatique de toutes les écritures -> JOURNAL_ACTIVITES.md
        $middleware->api(append: [
            \App\Http\Middleware\ActivityJournal::class,
            // Verrou global : aucune saisie sur une année scolaire clôturée.
            \App\Http\Middleware\ExerciceGuard::class,
        ]);
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
            'ability' => \App\Http\Middleware\EnsureUserHasAbility::class,
            'exercice' => \App\Http\Middleware\ExerciceGuard::class,
            'super_admin' => \App\Http\Middleware\EnsureSuperAdmin::class,
            'active_subscription' => \App\Http\Middleware\CheckActiveSubscription::class,
            'check.module' => \App\Http\Middleware\CheckModulePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Ressource introuvable -> 404 JSON propre (au lieu d'une page HTML).
        $exceptions->render(function (ModelNotFoundException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Ressource introuvable.'], 404);
            }
        });

        // Erreurs SQL (dont conversion nvarchar -> int sur une clé non numérique)
        // -> message clair au lieu de fuiter le SQLSTATE brut vers l'interface.
        $exceptions->render(function (QueryException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                $sqlstate = $e->errorInfo[0] ?? '';
                $raw = $e->getMessage();
                $isConversion = in_array($sqlstate, ['22018', '22003', '07006'], true)
                    || stripos($raw, 'Conversion failed') !== false;
                if ($isConversion) {
                    return response()->json([
                        'message' => "Référence invalide : l'identifiant attendu est numérique. L'enregistrement est peut-être absent ou d'un format non pris en charge.",
                    ], 422);
                }
                return response()->json([
                    'message' => "Une erreur de base de données est survenue. Veuillez réessayer ou contacter l'administrateur.",
                ], 500);
            }
        });
    })->create();
