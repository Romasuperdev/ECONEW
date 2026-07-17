<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Etablissement;

class EtablissementController extends Controller
{
    /** Etablissements de la societe courante (pour le selecteur). */
    public function index()
    {
        try {
            return response()->json(
                Etablissement::available()
                    ->map(fn (Etablissement $e) => $e->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }
}
