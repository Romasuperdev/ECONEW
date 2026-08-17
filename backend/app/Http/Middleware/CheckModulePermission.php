<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Contrôle d'accès à un module de la console admin d'établissement.
 * Usage : ->middleware('check.module:gestion_utilisateurs')
 *
 * Règle : le super_admin passe toujours ; un admin_etablissement doit avoir
 * le module accordé ; tout autre rôle est refusé (ces routes lui sont étrangères).
 */
class CheckModulePermission
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        // Le super administrateur n'est jamais bloqué.
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $next($request);
        }

        $role = method_exists($user, 'effectiveRole') ? $user->effectiveRole() : ($user->role ?? null);
        if ($role !== 'admin_etablissement') {
            return response()->json(['message' => "Accès réservé à l'administrateur d'établissement."], 403);
        }

        if (! (method_exists($user, 'hasModuleAccess') && $user->hasModuleAccess($module))) {
            return response()->json([
                'message' => "Accès non autorisé à ce module.",
                'module' => $module,
            ], 403);
        }

        return $next($request);
    }
}
