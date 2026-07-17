<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

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
        ]);
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureUserHasRole::class,
            'ability' => \App\Http\Middleware\EnsureUserHasAbility::class,
            'exercice' => \App\Http\Middleware\ExerciceGuard::class,
            'super_admin' => \App\Http\Middleware\EnsureSuperAdmin::class,
            'active_subscription' => \App\Http\Middleware\CheckActiveSubscription::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
