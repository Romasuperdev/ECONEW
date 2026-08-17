<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GrilleScolarite;
use App\Support\AnneeContext;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use App\Support\UidRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class GrilleScolariteController extends Controller
{
    private const EXTRA = 'ECO_GRILLE_SCO_EXTRA';

    private function ensureExtra(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::EXTRA)) {
                Schema::connection('economat')->create(self::EXTRA, function ($t) {
                    $t->increments('id');
                    $t->string('GRILLE_ID', 50);
                    $t->decimal('FRAIS_ANNEXES', 18, 2)->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) { return false; }
    }

    private function fraisOf($id): float
    {
        if (! $this->ensureExtra()) { return 0.0; }
        try {
            $v = DB::connection('economat')->table(self::EXTRA)->where('GRILLE_ID', (string) $id)->value('FRAIS_ANNEXES');
            return $v !== null ? (float) $v : 0.0;
        } catch (\Throwable $e) { return 0.0; }
    }

    private function saveFrais($id, $frais): void
    {
        if (! $this->ensureExtra()) { return; }
        try {
            DB::connection('economat')->table(self::EXTRA)->where('GRILLE_ID', (string) $id)->delete();
            DB::connection('economat')->table(self::EXTRA)->insert(['GRILLE_ID' => (string) $id, 'FRAIS_ANNEXES' => $frais ?? 0]);
        } catch (\Throwable $e) {}
    }

    public function index(Request $request)
    {
        try {
            return response()->json(
                GrilleScolarite::available()->map(function (GrilleScolarite $g) {
                    $n = $g->toNormalized();
                    $n['frais_annexes'] = $this->fraisOf($g->getKey());
                    return $n;
                })->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        $g = new GrilleScolarite();
        $this->fill($g, $data);
        $g->setAttribute('ANNEE', AnneeContext::current());
        $g->setAttribute('CODESOCIETE', SocieteContext::current());
        if (GrilleScolarite::col(['CODEETABLISSEMENT'])) {
            $g->setAttribute('CODEETABLISSEMENT', EtablissementContext::current());
        }
        if (GrilleScolarite::col(['STATUT']) && $g->getAttribute(GrilleScolarite::col(['STATUT'])) === null) {
            $g->setAttribute('STATUT', 1);
        }
        try {
            $g->save();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
        $this->saveFrais($g->getKey(), $data['frais_annexes'] ?? 0);
        UidRegistry::assign('GRILLE', (string) $g->getKey());

        $n = $g->toNormalized();
        $n['id'] = $g->getKey();
        $n['frais_annexes'] = (float) ($data['frais_annexes'] ?? 0);

        return response()->json($n, 201);
    }

    public function update(Request $request, string $grille)
    {
        if (! ctype_digit((string) $grille)) {
            return response()->json(['message' => 'Identifiant de grille invalide.'], 422);
        }
        $data = $this->rules($request);
        $g = GrilleScolarite::forTenant()->where((new GrilleScolarite)->getKeyName(), (int) $grille)->firstOrFail();
        $this->fill($g, $data);
        try {
            $g->save();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }
        $this->saveFrais($g->getKey(), $data['frais_annexes'] ?? 0);

        $n = $g->toNormalized();
        $n['frais_annexes'] = (float) ($data['frais_annexes'] ?? 0);

        return response()->json($n);
    }

    public function destroy(string $grille)
    {
        $key = (new GrilleScolarite)->getKeyName();
        if (! ctype_digit((string) $grille)) {
            GrilleScolarite::forTenant()->whereNull($key)->delete();
            return response()->json(['message' => 'Grille(s) sans identifiant supprimée(s).']);
        }
        GrilleScolarite::forTenant()->where($key, (int) $grille)->firstOrFail()->delete();

        return response()->json(['message' => 'Grille supprimée.']);
    }

    private function fill(GrilleScolarite $g, array $d): void
    {
        $set = function (array $cands, $val) use ($g) {
            $col = GrilleScolarite::col($cands);
            if ($col) { $g->setAttribute($col, $val); }
        };
        $get = function (array $cands) use ($g) {
            $col = GrilleScolarite::col($cands);
            return $col ? (float) ($g->getAttribute($col) ?? 0) : 0.0;
        };

        if (array_key_exists('code_grille', $d)) {
            $set(['CodeGrille', 'CODEGRILLE'], $d['code_grille']);
        }

        $sco = array_key_exists('scolarite', $d) ? (float) $d['scolarite'] : $get(['MontScolarite', 'MONTSCOLARITE']);
        $ins = array_key_exists('inscription', $d) ? (float) ($d['inscription'] ?? 0) : $get(['InscriScolarite', 'INSCRISCOLARITE']);
        $frais = (float) ($d['frais_annexes'] ?? 0);
        if (array_key_exists('scolarite', $d)) { $set(['MontScolarite', 'MONTSCOLARITE'], $sco); }
        if (array_key_exists('inscription', $d)) { $set(['InscriScolarite', 'INSCRISCOLARITE'], $ins); }

        // Total à payer = inscription + scolarité + frais annexes (automatique).
        $set(['TotalVersement', 'TOTALVERSEMENT'], $sco + $ins + $frais);

        if (array_key_exists('nb_versements', $d)) {
            $set(['NbrVersement', 'NbreVersement'], $d['nb_versements']);
        }
        if (array_key_exists('statut', $d) && GrilleScolarite::col(['STATUT'])) {
            $set(['STATUT'], ! empty($d['statut']) ? 1 : 0);
        }
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'code_grille' => ['required', 'string', 'max:50'],   // code du niveau
            'scolarite' => ['required', 'numeric', 'min:0'],
            'inscription' => ['nullable', 'numeric', 'min:0'],
            'frais_annexes' => ['nullable', 'numeric', 'min:0'],
            'nb_versements' => ['nullable', 'integer', 'min:0'],  // nombre de modalités
            'statut' => ['nullable', 'boolean'],
        ]);
    }
}
