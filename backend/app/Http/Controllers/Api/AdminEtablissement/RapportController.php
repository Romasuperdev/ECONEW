<?php

namespace App\Http\Controllers\Api\AdminEtablissement;

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Rapports transversaux (lecture seule) pour l'admin d'établissement.
 * Réutilise l'agrégation du tableau de bord, scopée à l'établissement courant
 * via HasEtablissement / les contextes (aucune donnée cross-tenant).
 */
class RapportController extends Controller
{
    public function index(Request $request)
    {
        try {
            return app(DashboardController::class)->index($request);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Rapports indisponibles pour le moment.'], 200);
        }
    }
}
