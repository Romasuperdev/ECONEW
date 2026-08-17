<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use Illuminate\Http\Request;

/**
 * Facturation plateforme (console Super Admin) : abonnements impayés / en retard.
 * Le statut de paiement est dérivé des versements enregistrés vs. le montant dû.
 */
class FacturationController extends Controller
{
    /** Statut de paiement d'un abonnement : paye | impaye | en_retard. */
    private function statut(Subscription $s): array
    {
        $du = (float) ($s->amount ?? 0);
        $paye = 0.0;
        try {
            $paye = (float) $s->payments->where('status', 'paye')->sum('amount');
        } catch (\Throwable $e) {}

        $enRetard = false;
        try { $enRetard = $s->ends_at && $s->ends_at->isPast(); } catch (\Throwable $e) {}

        if ($du > 0 && $paye + 0.01 >= $du) {
            $statut = 'paye';
        } elseif ($enRetard) {
            $statut = 'en_retard';
        } else {
            $statut = 'impaye';
        }
        return ['statut' => $statut, 'paye' => $paye, 'reste' => max(0, $du - $paye)];
    }

    private function row(Subscription $s): array
    {
        $st = $this->statut($s);
        return [
            'id' => $s->id,
            'etablissement' => $s->school?->name,
            'plan' => $s->plan?->name ?? $s->plan?->label,
            'montant' => (float) ($s->amount ?? 0),
            'paye' => $st['paye'],
            'reste' => $st['reste'],
            'date_debut' => $s->starts_at ? $s->starts_at->format('Y-m-d') : null,
            'date_fin' => $s->ends_at ? $s->ends_at->format('Y-m-d') : null,
            'statut_paiement' => $st['statut'],
        ];
    }

    /** Liste des abonnements non soldés (impayés + en retard). */
    public function impayes(Request $request)
    {
        try {
            $subs = Subscription::with(['school', 'plan', 'payments'])->get();
            $rows = $subs->map(fn (Subscription $s) => $this->row($s))
                ->filter(fn ($r) => $r['statut_paiement'] !== 'paye')
                ->values();

            // Filtre optionnel : ?statut=impaye|en_retard
            if ($f = $request->query('statut')) {
                $rows = $rows->filter(fn ($r) => $r['statut_paiement'] === $f)->values();
            }

            $totalReste = $rows->sum('reste');
            return response()->json([
                'data' => $rows,
                'total' => $rows->count(),
                'total_reste' => $totalReste,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['data' => [], 'total' => 0, 'total_reste' => 0]);
        }
    }
}
