<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Student;
use App\Models\Versement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $vCols = $this->cols('T_VERSEMENT');
        $vMontant = $this->firstCol($vCols, ['Montant', 'MONTANT', 'MONTANT_CFA', 'MontantVerse']);
        $vDate = $this->firstCol($vCols, ['DateVers', 'DateVersement', 'DATEVERS', 'DateRecu', 'DateOperation']);
        $vMode = $this->firstCol($vCols, ['ModePaiement', 'TypeVers', 'ModeReglement']);

        $recettes = $vMontant ? $this->safe(fn () => (float) Versement::forTenant()->sum($vMontant), 0.0) : 0.0;
        $depenses = $this->safe(fn () => (float) Expense::forTenant()->where('STATUT', 'validee')->sum('MONTANT'), 0.0);

        $scolTotal = $this->safe(fn () => (float) Student::forTenant()->sum('Scolarite'), 0.0);
        $scolPaye = $this->safe(fn () => (float) Student::forTenant()->sum('TotalPaye'), 0.0);
        $impayes = max($scolTotal - $scolPaye, 0);

        $nbEleves = $this->safe(fn () => Student::forTenant()->count(), 0);
        $nbFacturesImpayees = $this->safe(fn () => Invoice::forTenant()->whereIn('STATUT', ['impayee', 'partielle'])->count(), 0);

        // Evolution 6 mois
        $evolution = collect(range(5, 0))->map(function ($i) use ($vMontant, $vDate) {
            $start = Carbon::now()->startOfMonth()->subMonths($i);
            $end = (clone $start)->endOfMonth();
            $rec = ($vMontant && $vDate)
                ? $this->safe(fn () => (float) Versement::forTenant()->whereBetween($vDate, [$start, $end])->sum($vMontant), 0.0)
                : 0.0;
            $dep = $this->safe(fn () => (float) Expense::forTenant()->where('STATUT', 'validee')
                ->whereBetween('DATE_DEPENSE', [$start, $end])->sum('MONTANT'), 0.0);
            return ['mois' => $start->translatedFormat('M Y'), 'recettes' => $rec, 'depenses' => $dep];
        });

        // Recettes par mode de versement
        $recettesParType = ($vMode && $vMontant) ? $this->safe(function () use ($vMode, $vMontant) {
            return Versement::forTenant()->selectRaw("$vMode as type, SUM($vMontant) as montant")
                ->groupBy($vMode)->get()
                ->map(fn ($r) => ['type' => $r->type ?: 'Autre', 'montant' => (float) $r->montant])->values();
        }, collect()) : collect();

        // Derniers versements
        $derniers = $this->safe(function () use ($vDate) {
            $q = Versement::forTenant()->with('eleve');
            $q = $vDate ? $q->orderByDesc($vDate) : $q->orderByDesc('NUM');
            return $q->limit(5)->get()->map(function (Versement $v) {
                $n = $v->toNormalized();
                return [
                    'id' => $n['id'],
                    'student' => [
                        'first_name' => $v->eleve?->Prenom,
                        'last_name' => $v->eleve?->Nom,
                        'matricule' => $n['matricule'],
                    ],
                    'paid_at' => $n['paid_at'],
                    'amount' => $n['amount'],
                ];
            })->values();
        }, collect());

        return response()->json([
            'kpis' => [
                'recettes' => $recettes,
                'depenses' => $depenses,
                'solde' => $recettes - $depenses,
                'impayes' => $impayes,
                'nb_eleves' => $nbEleves,
                'nb_factures_impayees' => $nbFacturesImpayees,
            ],
            'evolution' => $evolution,
            'recettes_par_type' => $recettesParType,
            'derniers_paiements' => $derniers,
        ]);
    }

    private function cols(string $table): array
    {
        try {
            return Schema::connection('economat')->getColumnListing($table);
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function firstCol(array $cols, array $candidates): ?string
    {
        foreach ($candidates as $c) {
            if (in_array($c, $cols, true)) {
                return $c;
            }
        }
        return null;
    }

    private function safe(callable $fn, $default)
    {
        try {
            return $fn();
        } catch (\Throwable $e) {
            return $default;
        }
    }
}
