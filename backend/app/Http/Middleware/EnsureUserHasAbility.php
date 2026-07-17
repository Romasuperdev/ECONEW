<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasAbility
{
    /**
     * Restreint l'acces selon une permission fine.
     * Usage: ->middleware('ability:expenses.manage')
     */
    public function handle(Request $request, Closure $next, string ...$abilities): Response
    {
        $user = $request->user();

        $ok = $user && method_exists($user, 'hasAbility')
            && collect($abilities)->contains(fn ($a) => $user->hasAbility($a));

        if (! $ok) {
            return response()->json([
                'message' => "Accès refusé : permission insuffisante.",
            ], 403);
        }

        return $next($request);
    }
}
