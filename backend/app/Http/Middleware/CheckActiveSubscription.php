<?php

namespace App\Http\Middleware;

use App\Models\Subscription;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque l'accès aux données de l'école si l'établissement est suspendu
 * ou si son abonnement a expiré. Les Super Admins ne sont pas concernés.
 */
class CheckActiveSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isSuperAdmin()) {
            return $next($request);
        }

        $school = $user->school;

        if ($school && $school->status !== 'active') {
            return response()->json([
                'message' => 'Établissement suspendu. Contactez l\'administrateur de la plateforme.',
                'code' => 'school_suspended',
            ], 403);
        }

        if ($school) {
            $sub = Subscription::where('school_id', $school->id)->latest('ends_at')->first();
            if ($sub && ! $sub->isActive()) {
                return response()->json([
                    'message' => 'Abonnement expiré. Veuillez le renouveler pour continuer.',
                    'code' => 'subscription_expired',
                ], 402);
            }
        }

        return $next($request);
    }
}
