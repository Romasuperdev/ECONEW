<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Caisse;
use App\Models\MvtCaisse;
use App\Models\RhUser;
use App\Models\Versement;
use App\Support\AnneeContext;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Vue d'ensemble tresorerie d'un etablissement :
 *  - caissiers rattaches a l'etablissement (ECO_USER_ROLE role=caissier)
 *  - chiffres reels : total encaisse (T_VERSEMENT) + solde des caisses (T_CAISSES)
 */
class TreasuryOverviewController extends Controller
{
    public function index()
    {
        $soc = SocieteContext::current();
        $etab = EtablissementContext::current();

        return response()->json([
            'etablissement' => $etab,
            'total_encaisse' => $this->totalEncaisse($etab),
            'total_solde' => $this->totalSolde(),
            'nb_caisses' => $this->nbCaisses(),
            'caissiers' => $this->caissiers($soc, $etab),
        ]);
    }

    private function totalEncaisse(?string $etab): float
    {
        try {
            $cols = Schema::connection('economat')->getColumnListing('T_VERSEMENT');
            $montant = collect(['Montant', 'MONTANT', 'MONTANT_CFA', 'MontantVerse'])->first(fn ($c) => in_array($c, $cols, true));
            if (! $montant) {
                return 0.0;
            }
            $etabCol = collect(['CODEETABLISSEMENT', 'CodeEtablissement'])->first(fn ($c) => in_array($c, $cols, true));
            return (float) Versement::forTenant()
                ->when($etab && $etabCol, fn ($q) => $q->where($etabCol, $etab))
                ->sum($montant);
        } catch (\Throwable $e) {
            return 0.0;
        }
    }

    private function totalSolde(): float
    {
        try {
            $total = 0.0;
            $needMvt = false;
            foreach (Caisse::forTenant()->get() as $c) {
                $n = $c->toNormalized();
                if ($n['balance'] !== null) {
                    $total += (float) $n['balance'];
                } else {
                    $needMvt = true;
                }
            }
            // Soldes calculés depuis les mouvements : une seule requête (au lieu d'une par caisse).
            if ($needMvt && MvtCaisse::col(['CODECAISSE', 'CodeCaisse'])) {
                foreach (MvtCaisse::forTenant()->get() as $m) {
                    $amt = (float) str_replace(',', '.', (string) ($m->toNormalized()['amount'] ?? 0));
                    $total += $m->direction() === 'entree' ? $amt : -$amt;
                }
            }
            return $total;
        } catch (\Throwable $e) {
            return 0.0;
        }
    }

    private function nbCaisses(): int
    {
        try {
            return Caisse::forTenant()->count();
        } catch (\Throwable $e) {
            return 0;
        }
    }

    private function caissiers(?string $soc, ?string $etab): array
    {
        try {
            if (! Schema::connection('economat')->hasTable('ECO_USER_ROLE')) {
                return [];
            }
            $ids = DB::connection('economat')->table('ECO_USER_ROLE')
                ->where('ROLE', 'caissier')
                ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                ->pluck('USER_ID')->unique()->all();
            if (empty($ids)) {
                return [];
            }
            return RhUser::whereIn('Id', $ids)->get()->map(fn ($u) => [
                'id' => $u->Id,
                'name' => $u->name,
                'login' => $u->Login,
                'email' => $u->Email,
                'active' => ! (bool) $u->Supprimer,
            ])->values()->all();
        } catch (\Throwable $e) {
            return [];
        }
    }
}
