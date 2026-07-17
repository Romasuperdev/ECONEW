<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Échéancier générique des grilles (scolarité, transport, cantine, pension).
 * Une ligne = un versement/modalité (num, montant, date).
 * Table auxiliaire ECO_ECHEANCIER (créée au besoin).
 */
class EcheancierController extends Controller
{
    private const TABLE = 'ECO_ECHEANCIER';

    private function ensure(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->string('TYPE', 30);          // SCOLARITE / TRANSPORT / CANTINE / PENSION
                    $t->string('REF_ID', 50);        // id de la grille concernée
                    $t->integer('NUM');              // n° du versement
                    $t->decimal('MONTANT', 18, 2)->nullable();
                    $t->date('DATE_ECH')->nullable();
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function index(Request $request)
    {
        if (! $this->ensure()) {
            return response()->json([]);
        }
        try {
            return response()->json(DB::connection('economat')->table(self::TABLE)
                ->where('TYPE', (string) $request->type)
                ->where('REF_ID', (string) $request->ref_id)
                ->orderBy('NUM')
                ->get()->map(fn ($r) => [
                    'num' => (int) $r->NUM,
                    'montant' => $r->MONTANT !== null ? (float) $r->MONTANT : null,
                    'date' => $r->DATE_ECH,
                ])->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', 'string', 'max:30'],
            'ref_id' => ['required', 'string', 'max:50'],
            'lignes' => ['array'],
            'lignes.*.num' => ['nullable', 'integer'],
            'lignes.*.montant' => ['nullable', 'numeric'],
            'lignes.*.date' => ['nullable', 'string', 'max:20'],
        ]);
        if (! $this->ensure()) {
            return response()->json(['message' => 'Table indisponible.'], 422);
        }
        try {
            // Remplace l'échéancier existant.
            DB::connection('economat')->table(self::TABLE)
                ->where('TYPE', $data['type'])->where('REF_ID', $data['ref_id'])->delete();
            $rows = [];
            foreach (($data['lignes'] ?? []) as $i => $l) {
                $rows[] = [
                    'TYPE' => $data['type'], 'REF_ID' => $data['ref_id'],
                    'NUM' => $l['num'] ?? ($i + 1),
                    'MONTANT' => $l['montant'] ?? null,
                    'DATE_ECH' => ! empty($l['date']) ? $l['date'] : null,
                    'CODESOCIETE' => SocieteContext::current(),
                    'CODEETABLISSEMENT' => EtablissementContext::current(),
                ];
            }
            if ($rows) {
                DB::connection('economat')->table(self::TABLE)->insert($rows);
            }
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Enregistrement impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'Échéancier enregistré.', 'count' => count($rows)]);
    }
}
