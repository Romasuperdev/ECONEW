<?php

namespace App\Http\Middleware;

use App\Models\AcademicYear;
use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque les créations/modifications lorsque l'exercice courant est clôturé.
 * - Les lectures (GET/HEAD/OPTIONS) restent TOUJOURS autorisées.
 * - Clôture définitive : toute écriture est bloquée.
 * - Clôture partielle : les créations/modifications de configuration sont
 *   bloquées (les encaissements d'impayés passent par des routes non gardées).
 */
class ExerciceGuard
{
    public function handle(Request $request, Closure $next): Response
    {
        // Ne jamais bloquer une lecture.
        if (in_array($request->getMethod(), ['GET', 'HEAD', 'OPTIONS'], true)) {
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
                        return response()->json(['message' => "Exercice clôturé définitivement : aucune opération n'est possible."], 423);
                    }
                    if ((int) $ay->CloturePartielle === 1) {
                        return response()->json(['message' => "Exercice en clôture partielle : seuls les encaissements d'impayés sont autorisés."], 423);
                    }
                }
            } catch (\Throwable $e) {
            }
        }
        return $next($request);
    }
}
