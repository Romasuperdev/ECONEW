<?php

namespace App\Http\Middleware;

use App\Support\EtablissementContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Défense en profondeur multi-tenant (cf. schéma « shared database »).
 *
 * Valide que les en-têtes de contexte (X-Societe / X-Etablissement) demandés
 * par un utilisateur NON super-admin appartiennent bien à son périmètre. En cas
 * de tentative d'usurpation (en-tête pointant une autre société / un autre
 * établissement), la requête est REJETÉE (403) — on échoue en mode fermé plutôt
 * que de « clamper » silencieusement.
 *
 * Le super administrateur (console plateforme) n'est pas contraint : il pilote
 * l'ensemble des sociétés.
 */
class EnforceTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Pas d'utilisateur (login / routes publiques) ou super admin : on laisse passer.
        if (! $user) {
            return $next($request);
        }
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $next($request);
        }

        // 1) Société demandée : doit faire partie des sociétés autorisées.
        $socHeader = $request->header('X-Societe');
        if ($socHeader !== null && $socHeader !== '') {
            $allowedSoc = method_exists($user, 'allowedSocieteCodes') ? $user->allowedSocieteCodes() : [];
            if (! empty($allowedSoc) && ! in_array((string) $socHeader, $allowedSoc, true)) {
                return $this->deny('société');
            }
        }

        // 2) Établissement demandé : doit appartenir à la société courante.
        $etabHeader = $request->header('X-Etablissement');
        if ($etabHeader !== null && $etabHeader !== '') {
            $allowedEtab = EtablissementContext::allowedCodes();
            if (! empty($allowedEtab) && ! in_array((string) $etabHeader, $allowedEtab, true)) {
                return $this->deny('établissement');
            }
        }

        return $next($request);
    }

    private function deny(string $dimension): Response
    {
        return response()->json([
            'message' => "Accès refusé : le contexte {$dimension} demandé ne fait pas partie de votre périmètre.",
            'tenant_violation' => true,
        ], 403);
    }
}
