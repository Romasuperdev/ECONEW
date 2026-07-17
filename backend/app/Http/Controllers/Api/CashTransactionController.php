<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MvtCaisse;
use Illuminate\Http\Request;

/**
 * Mouvements de caisse : lecture de la table ECONOMAT T_MVTCAISSE,
 * isolee par societe / annee, avec filtres optionnels (caisse, type, dates).
 */
class CashTransactionController extends Controller
{
    public function index(Request $request)
    {
        $codeCol = MvtCaisse::col(['CODECAISSE', 'CodeCaisse']);
        $dateCol = MvtCaisse::dateCol();

        try {
            $q = MvtCaisse::forTenant();

            if ($request->cash_account_id && $codeCol) {
                $q->where($codeCol, $request->cash_account_id);
            }
            if ($request->from && $dateCol) {
                $q->whereDate($dateCol, '>=', $request->from);
            }
            if ($request->to && $dateCol) {
                $q->whereDate($dateCol, '<=', $request->to);
            }
            if ($dateCol) {
                $q->orderByDesc($dateCol);
            }

            $rows = $q->limit(500)->get()
                ->map(fn (MvtCaisse $m) => $m->toNormalized());

            // Filtre type applique apres normalisation (heuristique entree/sortie).
            if ($request->type) {
                $rows = $rows->where('type', $request->type)->values();
            }

            $perPage = (int) ($request->per_page ?? 30);
            $page = (int) ($request->page ?? 1);

            return response()->json([
                'data' => $rows->forPage($page, $perPage)->values(),
                'total' => $rows->count(),
                'per_page' => $perPage,
                'current_page' => $page,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['data' => [], 'total' => 0, 'per_page' => 30, 'current_page' => 1]);
        }
    }

    public function store(Request $request)
    {
        return response()->json([
            'message' => "Les mouvements de caisse sont saisis dans l'application ECONOMAT existante.",
        ], 422);
    }

    public function transfer(Request $request)
    {
        return response()->json([
            'message' => "Les virements internes se font dans l'application ECONOMAT existante.",
        ], 422);
    }

    public function destroy(string $cashTransaction)
    {
        return response()->json([
            'message' => "La suppression des mouvements se fait dans l'application ECONOMAT existante.",
        ], 422);
    }
}
