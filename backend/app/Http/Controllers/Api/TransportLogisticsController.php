<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\Bus;
use App\Models\Chauffeur;
use App\Models\ChauffeurBus;
use App\Support\SocieteContext;
use Illuminate\Http\Request;

class TransportLogisticsController extends Controller
{
    /* ---------------- Bus ---------------- */

    public function busIndex()
    {
        try {
            return response()->json(Bus::forTenant()->orderBy('immatriculation')->get()
                ->map(fn (Bus $b) => $b->toNormalized())->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function busStore(Request $request)
    {
        $d = $this->busRules($request);
        $b = new Bus();
        $this->fillBus($b, $d);
        $b->CODESOCIETE = SocieteContext::current();
        $b->save();

        return response()->json($b->toNormalized(), 201);
    }

    public function busUpdate(Request $request, string $bus)
    {
        $d = $this->busRules($request);
        $b = Bus::forTenant()->where('Num', $bus)->firstOrFail();
        $this->fillBus($b, $d);
        $b->save();

        return response()->json($b->toNormalized());
    }

    public function busDestroy(string $bus)
    {
        Bus::forTenant()->where('Num', $bus)->firstOrFail()->delete();

        return response()->json(['message' => 'Bus supprimé.']);
    }

    private function fillBus(Bus $b, array $d): void
    {
        $b->immatriculation = $d['immatriculation'];
        $b->Marque = $d['marque'] ?? null;
        $b->MODELE = $d['modele'] ?? null;
        $b->Conducteur = $d['conducteur'] ?? null;
        $b->Destination = $d['destination'] ?? null;
        $b->NbrPlace = $d['nb_places'] ?? null;
        $b->NbrPlaceOccup = $d['nb_places_occupees'] ?? null;
        $b->COULEUR = $d['couleur'] ?? null;
        $b->CARBURANT = $d['carburant'] ?? null;
        $b->NUM_SERIE = $d['num_serie'] ?? null;
    }

    private function busRules(Request $request): array
    {
        return $request->validate([
            'immatriculation' => ['required', 'string', 'max:50'],
            'marque' => ['nullable', 'string'],
            'modele' => ['nullable', 'string'],
            'conducteur' => ['nullable', 'string'],
            'destination' => ['nullable', 'string'],
            'nb_places' => ['nullable', 'integer'],
            'nb_places_occupees' => ['nullable', 'integer'],
            'couleur' => ['nullable', 'string'],
            'carburant' => ['nullable', 'string'],
            'num_serie' => ['nullable', 'string'],
        ]);
    }

    /* ---------------- Chauffeurs ---------------- */

    public function chauffeurIndex()
    {
        try {
            $extras = $this->allChauffeurExtras();
            return response()->json(Chauffeur::forTenant()->orderBy('NOM')->get()
                ->map(function (Chauffeur $c) use ($extras) {
                    $e = $extras[(string) $c->ID] ?? null;
                    return $this->mergeExtra($c->toNormalized(), $e);
                })->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function chauffeurStore(Request $request)
    {
        $d = $this->chauffeurRules($request);
        $c = new Chauffeur();
        $this->fillChauffeur($c, $d);
        $c->CODESOCIETE = SocieteContext::current();
        $c->save();
        $this->saveChauffeurExtra($c->ID, $d);

        return response()->json($this->withExtra($c->toNormalized()), 201);
    }

    public function chauffeurUpdate(Request $request, string $chauffeur)
    {
        $d = $this->chauffeurRules($request);
        $c = Chauffeur::forTenant()->where('ID', $chauffeur)->firstOrFail();
        $this->fillChauffeur($c, $d);
        $c->save();
        $this->saveChauffeurExtra($c->ID, $d);

        return response()->json($this->withExtra($c->toNormalized()));
    }

    public function chauffeurDestroy(string $chauffeur)
    {
        Chauffeur::forTenant()->where('ID', $chauffeur)->firstOrFail()->delete();

        return response()->json(['message' => 'Chauffeur supprimé.']);
    }

    private function ensureChauffeurExtra(): bool
    {
        try {
            $conn = Schema::connection('economat');
            if (! $conn->hasTable('ECO_CHAUFFEUR_EXTRA')) {
                $conn->create('ECO_CHAUFFEUR_EXTRA', function ($t) {
                    $t->increments('id');
                    $t->string('CHAUFFEUR_ID', 50);
                    $t->string('TYPE_PERMIS', 50)->nullable();
                    $t->text('PHOTO')->nullable();
                    $t->string('SEXE', 20)->nullable();
                    $t->string('DATE_DELIV', 30)->nullable();
                    $t->string('DATE_EXP', 30)->nullable();
                    $t->string('STATUT', 30)->nullable();
                    $t->dateTime('CREATED_AT')->nullable();
                });
                return true;
            }
            // Ajout tolérant des colonnes manquantes.
            $cols = array_map('strtoupper', $conn->getColumnListing('ECO_CHAUFFEUR_EXTRA'));
            $add = array_diff(['SEXE', 'DATE_DELIV', 'DATE_EXP', 'STATUT', 'CREATED_AT'], $cols);
            if (! empty($add)) {
                $conn->table('ECO_CHAUFFEUR_EXTRA', function ($t) use ($add) {
                    foreach ($add as $col) {
                        if ($col === 'CREATED_AT') { $t->dateTime($col)->nullable(); }
                        else { $t->string($col, 30)->nullable(); }
                    }
                });
            }
            return true;
        } catch (\Throwable $e) { return false; }
    }

    private function saveChauffeurExtra($id, array $d): void
    {
        if (! $this->ensureChauffeurExtra()) { return; }
        try {
            $table = DB::connection('economat')->table('ECO_CHAUFFEUR_EXTRA');
            // Préserve la date de création existante.
            $prev = $table->where('CHAUFFEUR_ID', (string) $id)->value('CREATED_AT');
            $table->where('CHAUFFEUR_ID', (string) $id)->delete();
            DB::connection('economat')->table('ECO_CHAUFFEUR_EXTRA')->insert([
                'CHAUFFEUR_ID' => (string) $id,
                'TYPE_PERMIS' => $d['type_permis'] ?? null,
                'PHOTO' => $d['photo'] ?? null,
                'SEXE' => $d['sexe'] ?? null,
                'DATE_DELIV' => $d['date_delivrance'] ?? null,
                'DATE_EXP' => $d['date_expiration'] ?? null,
                'STATUT' => $d['statut'] ?? null,
                'CREATED_AT' => $prev ?: now(),
            ]);
        } catch (\Throwable $e) {}
    }

    /** Fusionne les champs "extra" dans la représentation normalisée. */
    private function mergeExtra(array $n, $e): array
    {
        $n['type_permis'] = $e->TYPE_PERMIS ?? null;
        $n['photo'] = $e->PHOTO ?? null;
        $n['sexe'] = $e->SEXE ?? null;
        $n['date_delivrance'] = $e->DATE_DELIV ?? null;
        $n['date_expiration'] = $e->DATE_EXP ?? null;
        $n['statut'] = $e->STATUT ?? null;
        $n['created_at'] = $e->CREATED_AT ?? null;
        return $n;
    }

    private function allChauffeurExtras()
    {
        if (! $this->ensureChauffeurExtra()) { return collect(); }
        try {
            return DB::connection('economat')->table('ECO_CHAUFFEUR_EXTRA')->get()->keyBy(fn ($r) => (string) $r->CHAUFFEUR_ID);
        } catch (\Throwable $e) { return collect(); }
    }

    private function withExtra(array $n): array
    {
        $e = $this->allChauffeurExtras()[(string) ($n['id'] ?? '')] ?? null;
        return $this->mergeExtra($n, $e);
    }

    private function fillChauffeur(Chauffeur $c, array $d): void
    {
        $c->NOM = $d['nom'];
        $c->PRENOM = $d['prenom'] ?? null;
        $c->DATE_N_CH = $d['date_naissance'] ?? null;
        $c->ADR_CH = $d['adresse'] ?? null;
        $c->TEL_CH = $d['telephone'] ?? null;
        $c->NUM_CH = $d['code'] ?? null;
        $c->NUM_PERMIS = $d['num_permis'] ?? null;
    }

    private function chauffeurRules(Request $request): array
    {
        return $request->validate([
            'nom' => ['required', 'string', 'max:100'],
            'prenom' => ['nullable', 'string', 'max:100'],
            'date_naissance' => ['nullable', 'string', 'max:30'],
            'adresse' => ['nullable', 'string'],
            'telephone' => ['nullable', 'string', 'max:50'],
            'code' => ['nullable', 'string', 'max:50'],
            'num_permis' => ['nullable', 'string', 'max:50'],
            'type_permis' => ['nullable', 'string', 'max:50'],
            'photo' => ['nullable', 'string'],
            'sexe' => ['nullable', 'string', 'max:20'],
            'date_delivrance' => ['nullable', 'string', 'max:30'],
            'date_expiration' => ['nullable', 'string', 'max:30'],
            'statut' => ['nullable', 'string', 'max:30'],
        ]);
    }

    /* ---------------- Affectation chauffeur <-> bus ---------------- */

    public function affectationIndex()
    {
        try {
            return response()->json(ChauffeurBus::forTenant()->orderByDesc('ID')->get()
                ->map(fn (ChauffeurBus $a) => $a->toNormalized())->values());
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function affectationStore(Request $request)
    {
        $d = $request->validate([
            'code_chauffeur' => ['required', 'string'],
            'immatriculation' => ['required', 'string'],
            'date_debut' => ['nullable', 'date'],
            'date_fin' => ['nullable', 'date'],
        ]);
        $a = new ChauffeurBus();
        $a->CODE_CH = $d['code_chauffeur'];
        $a->IMMVEH = $d['immatriculation'];
        $a->DATE_D = $d['date_debut'] ?? now()->toDateString();
        $a->DATE_F = $d['date_fin'] ?? null;
        $a->CODESOCIETE = SocieteContext::current();
        $a->save();

        return response()->json($a->toNormalized(), 201);
    }

    public function affectationDestroy(string $affectation)
    {
        ChauffeurBus::forTenant()->where('ID', $affectation)->firstOrFail()->delete();

        return response()->json(['message' => 'Affectation supprimée.']);
    }
}
