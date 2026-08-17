<?php

namespace App\Http\Controllers\Api\AdminEtablissement;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Subscription;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;

/**
 * Abonnement / facturation de l'établissement — lecture seule.
 * La modification (changement de plan, paiement) reste du ressort du super_admin.
 */
class AbonnementController extends Controller
{
    public function show(Request $request)
    {
        $sub = null;
        try {
            // Résolution best-effort : l'école (schools) dont le code correspond
            // au code établissement / société courant.
            $codes = array_filter([EtablissementContext::current(), SocieteContext::current()]);
            $school = School::query()
                ->when(! empty($codes), fn ($q) => $q->whereIn('code', $codes))
                ->first();
            if ($school) {
                $sub = Subscription::with('plan')->where('school_id', $school->id)
                    ->orderByDesc('id')->first();
            }
        } catch (\Throwable $e) {}

        if (! $sub) {
            return response()->json([
                'abonnement' => null,
                'message' => "Aucun abonnement rattaché à cet établissement. Contactez l'administrateur de la plateforme.",
            ]);
        }

        return response()->json([
            'abonnement' => [
                'plan' => $sub->plan?->name ?? $sub->plan?->label,
                'statut' => $sub->status,
                'montant' => (float) ($sub->amount ?? 0),
                'date_debut' => $sub->starts_at ? $sub->starts_at->format('Y-m-d') : null,
                'date_fin' => $sub->ends_at ? $sub->ends_at->format('Y-m-d') : null,
                'jours_restants' => $sub->days_left ?? null,
                'expire' => (bool) ($sub->is_expired ?? false),
                'renouvellement_auto' => (bool) ($sub->auto_renew ?? false),
            ],
        ]);
    }
}
