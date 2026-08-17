<?php

namespace App\Http\Middleware;

use App\Models\AcademicYear;
use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque toute saisie (écriture) lorsque l'année scolaire courante est clôturée.
 * Appliqué globalement aux routes API.
 * - Les lectures (GET/HEAD/OPTIONS) restent TOUJOURS autorisées.
 * - Clôture définitive : toute écriture est bloquée.
 * - Clôture partielle : seuls les encaissements (versements / caisse) restent permis.
 *
 * Exceptions (jamais bloquées) : authentification, console super_admin,
 * gestion des années scolaires (pour pouvoir rouvrir/gérer la clôture), et le
 * super administrateur lui-même.
 */
class ExerciceGuard
{
    /** Préfixes de chemins jamais soumis au verrou de clôture. */
    private const EXEMPT_PREFIXES = [
        'api/login', 'api/logout', 'api/lookup', 'api/me',
        'api/super',                    // console plateforme
        'api/admin-etablissement',      // console admin d'établissement (comptes, paramètres…)
        'api/academic-years',           // gestion / réouverture des années
        'api/establishment-users',      // gestion des comptes de l'établissement
        'api/sms-config', 'api/mail-config', // paramètres de l'établissement (non comptables)
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Lectures toujours autorisées.
        if (in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        // Chemins exemptés.
        $path = $request->path(); // ex: api/students
        foreach (self::EXEMPT_PREFIXES as $p) {
            if ($path === $p || str_starts_with($path, $p.'/')) {
                return $next($request);
            }
        }

        // Le super administrateur n'est jamais bloqué.
        $user = $request->user();
        if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $next($request);
        }

        $annee = AnneeContext::current();
        if ($annee) {
            try {
                $ay = AcademicYear::where('CodeAnnee', $annee)
                    ->when(SocieteContext::current(), fn ($q, $s) => $q->where('CODESOCIETE', $s))
                    ->first();
                if ($ay) {
                    if ((int) $ay->ClotureDefinitive === 1) {
                        return response()->json([
                            'message' => "Année scolaire clôturée : aucune saisie n'est possible. Passez sur une année active pour effectuer des opérations.",
                            'annee_cloturee' => true,
                        ], 423);
                    }
                    if ((int) $ay->CloturePartielle === 1) {
                        // Clôture partielle : on n'autorise que les encaissements.
                        $encaissement = str_contains($path, 'versements')
                            || str_contains($path, 'caisse-session')
                            || str_contains($path, '/encaisser')
                            || str_contains($path, 'paiements-dossiers');
                        if (! $encaissement) {
                            return response()->json([
                                'message' => "Année en clôture partielle : seuls les encaissements d'impayés sont autorisés.",
                                'annee_cloturee' => true,
                            ], 423);
                        }
                    }
                }
            } catch (\Throwable $e) {
            }
        }
        return $next($request);
    }
}
