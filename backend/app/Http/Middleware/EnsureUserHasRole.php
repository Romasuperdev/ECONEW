<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Restreint l'accès aux utilisateurs possédant l'un des rôles listés.
     * Usage: ->middleware('role:admin,comptable')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => "Accès refusé : privilèges insuffisants.",
            ], 403);
        }

        return $next($request);
    }
}
