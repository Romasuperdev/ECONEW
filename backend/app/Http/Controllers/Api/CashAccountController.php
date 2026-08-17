<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Caisse;
use App\Models\MvtCaisse;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Support\UidRegistry;

/**
 * Tresorerie : caisses (table ECONOMAT T_CAISSES), isolees par societe.
 * La "caisse principale" est stockee dans une colonne native si elle existe,
 * sinon dans une table auxiliaire ECO_CAISSE_PRINCIPALE (creee au besoin).
 */
class CashAccountController extends Controller
{
    private const META = 'ECO_CAISSE_PRINCIPALE';
    private const META2 = 'ECO_CAISSE_META';   // description / statut / date de création

    public function index()
    {
        try {
            $caisses = Caisse::available();
        } catch (\Throwable $e) {
            return response()->json([]);
        }

        $principal = $this->principalCode();
        $metaMap = $this->metaMap();
        // Les soldes ne sont calculés que si demandés (ex. la page Caisses n'affiche pas le solde).
        $skipBalances = request()->query('balances') === '0';
        $balMap = $skipBalances ? [] : $this->balancesMap();

        return response()->json($caisses->map(function (Caisse $c) use ($principal, $balMap, $skipBalances, $metaMap) {
            $data = $c->toNormalized();
            $data['is_principal'] = $principal !== null && (string) $data['code'] === (string) $principal;
            $meta = $metaMap[(string) $data['code']] ?? null;
            $data['description'] = $meta->DESCRIPTION ?? null;
            $data['statut'] = $meta->STATUT ?? 'actif';
            $data['created_at'] = isset($meta->CREATED_AT) ? (string) $meta->CREATED_AT : null;
            if (! $skipBalances && $data['balance'] === null && $data['code'] !== null) {
                $data['balance'] = number_format($balMap[(string) $data['code']] ?? 0, 2, '.', '');
            }
            return $data;
        })->values());
    }

    public function show(string $cashAccount)
    {
        $c = $this->findByCode($cashAccount);
        if (! $c) {
            return response()->json(['message' => 'Caisse introuvable.'], 404);
        }

        $data = $c->toNormalized();
        $data['is_principal'] = $this->principalCode() === (string) $data['code'];
        $mvtCode = MvtCaisse::col(['CODECAISSE', 'CodeCaisse']);
        $dateCol = MvtCaisse::dateCol();
        $data['transactions'] = [];
        if ($mvtCode) {
            try {
                $q = MvtCaisse::forTenant()->where($mvtCode, $cashAccount);
                if ($dateCol) {
                    $q->orderByDesc($dateCol);
                }
                $data['transactions'] = $q->limit(50)->get()->map(fn (MvtCaisse $m) => $m->toNormalized())->values();
            } catch (\Throwable $e) {
            }
        }

        return response()->json($data);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:50'],
            'is_principal' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
            'statut' => ['nullable', 'string', 'max:20'],
        ]);

        $codeCol = Caisse::col(['CODECAISSE', 'CodeCaisse']) ?? 'CODECAISSE';
        $code = $data['code'] ?: $this->genCode();

        if (Caisse::query()->where($codeCol, $code)->exists()) {
            return response()->json(['message' => 'Ce code caisse existe déjà.'], 422);
        }

        $c = new Caisse();
        $set = function (array $cands, $val) use ($c) {
            foreach ($cands as $col) {
                if (Caisse::col([$col])) { $c->setAttribute($col, $val); return; }
            }
        };
        $c->setAttribute($codeCol, $code);
        $set(['NOMCAISSE', 'NomCaisse', 'LIBELLE', 'Libelle'], $data['name']);
        $set(['SoldeCaisse', 'SOLDECAISSE', 'Solde'], 0);
        $set(['ReportSolde'], 0);
        $set(['CODESOCIETE'], SocieteContext::current());
        $set(['BASECAISSE'], EtablissementContext::current());

        try {
            $c->save();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
        if (! empty($data['is_principal'])) {
            $this->setPrincipal($code);
        }
        $this->writeMeta($code, [
            'DESCRIPTION' => $data['description'] ?? null,
            'STATUT' => $data['statut'] ?? 'actif',
        ], true);
        AuditLogger::log('create', "Création caisse {$data['name']} ({$code})");
        UidRegistry::assign('CAISSE', $code);

        $out = $c->toNormalized();
        $out['is_principal'] = $this->principalCode() === (string) $code;
        $meta = $this->metaMap()[(string) $code] ?? null;
        $out['description'] = $meta->DESCRIPTION ?? ($data['description'] ?? null);
        $out['statut'] = $meta->STATUT ?? 'actif';

        return response()->json($out, 201);
    }

    public function update(Request $request, string $cashAccount)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'is_principal' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
            'statut' => ['nullable', 'string', 'max:20'],
        ]);
        $c = $this->findByCode($cashAccount);
        if (! $c) {
            return response()->json(['message' => 'Caisse introuvable.'], 404);
        }
        foreach (['NOMCAISSE', 'NomCaisse', 'LIBELLE', 'Libelle'] as $col) {
            if (Caisse::col([$col])) { $c->setAttribute($col, $data['name']); break; }
        }
        $c->save();

        if ($request->has('is_principal')) {
            if ($request->boolean('is_principal')) {
                $this->setPrincipal($cashAccount);
            } else {
                $this->unsetPrincipal($cashAccount);
            }
        }

        $metaUpd = [];
        if ($request->has('description')) { $metaUpd['DESCRIPTION'] = $data['description'] ?? null; }
        if ($request->has('statut')) { $metaUpd['STATUT'] = $data['statut'] ?: 'actif'; }
        if (! empty($metaUpd)) { $this->writeMeta($cashAccount, $metaUpd, false); }

        $out = $c->toNormalized();
        $out['is_principal'] = $this->principalCode() === (string) $cashAccount;
        $meta = $this->metaMap()[(string) $cashAccount] ?? null;
        $out['description'] = $meta->DESCRIPTION ?? null;
        $out['statut'] = $meta->STATUT ?? 'actif';

        return response()->json($out);
    }

    public function destroy(string $cashAccount)
    {
        $c = $this->findByCode($cashAccount);
        if (! $c) {
            return response()->json(['message' => 'Caisse introuvable.'], 404);
        }
        $c->delete();
        $this->unsetPrincipal($cashAccount);
        AuditLogger::log('delete', "Suppression caisse {$cashAccount}");

        return response()->json(['message' => 'Caisse supprimée.']);
    }

    /* ----------------- Caisse principale ----------------- */

    /** Solde net de chaque caisse, calculé en une seule requête sur les mouvements. */
    private function balancesMap(): array
    {
        $codeCol = MvtCaisse::col(['CODECAISSE', 'CodeCaisse']);
        if (! $codeCol) {
            return [];
        }
        $map = [];
        try {
            MvtCaisse::forTenant()->get()->each(function (MvtCaisse $m) use (&$map) {
                $n = $m->toNormalized();
                $code = (string) ($n['cash_account_id'] ?? '');
                if ($code === '') {
                    return;
                }
                $amt = (float) str_replace(',', '.', (string) ($n['amount'] ?? 0));
                $map[$code] = ($map[$code] ?? 0) + ($m->direction() === 'entree' ? $amt : -$amt);
            });
        } catch (\Throwable $e) {
        }
        return $map;
    }

    /** Recherche tolérante : tenant d'abord, puis repli global par code (cohérent avec available()). */
    private function findByCode(string $code): ?Caisse
    {
        $codeCol = $this->codeCol();
        try {
            $c = Caisse::forTenant()->where($codeCol, $code)->first();
            if ($c) {
                return $c;
            }
        } catch (\Throwable $e) {
        }
        try {
            return Caisse::query()->where($codeCol, $code)->first();
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function principalCol(): ?string
    {
        return Caisse::col([
            'PRINCIPALE', 'Principale', 'CAISSEPRINCIPALE', 'CaissePrincipale',
            'PRINCIPAL', 'Principal', 'PARDEFAUT', 'ParDefaut', 'PAR_DEFAUT',
        ]);
    }

    private function codeCol(): string
    {
        return Caisse::col(['CODECAISSE', 'CodeCaisse']) ?? 'CODECAISSE';
    }

    private function ensureMeta(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::META)) {
                Schema::connection('economat')->create(self::META, function ($t) {
                    $t->increments('id');
                    $t->string('CODECAISSE', 50);
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /** Code de la caisse principale du tenant courant (ou null). */
    private function principalCode(): ?string
    {
        $col = $this->principalCol();
        if ($col) {
            try {
                $c = Caisse::forTenant()->where($col, 1)->first();
                return $c ? (string) $c->getAttribute($this->codeCol()) : null;
            } catch (\Throwable $e) {
                return null;
            }
        }
        if (! $this->ensureMeta()) {
            return null;
        }
        try {
            $soc = SocieteContext::current();
            $etab = EtablissementContext::current();
            $row = DB::connection('economat')->table(self::META)
                ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                ->first();
            return $row->CODECAISSE ?? null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function setPrincipal(string $code): void
    {
        $col = $this->principalCol();
        if ($col) {
            try {
                Caisse::forTenant()->update([$col => 0]);
                Caisse::query()->where($this->codeCol(), $code)->update([$col => 1]);
            } catch (\Throwable $e) {
            }
            return;
        }
        if (! $this->ensureMeta()) {
            return;
        }
        try {
            $soc = SocieteContext::current();
            $etab = EtablissementContext::current();
            DB::connection('economat')->table(self::META)
                ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                ->delete();
            DB::connection('economat')->table(self::META)->insert([
                'CODECAISSE' => $code,
                'CODESOCIETE' => $soc,
                'CODEETABLISSEMENT' => $etab,
            ]);
        } catch (\Throwable $e) {
        }
    }

    private function unsetPrincipal(string $code): void
    {
        $col = $this->principalCol();
        if ($col) {
            try {
                Caisse::query()->where($this->codeCol(), $code)->update([$col => 0]);
            } catch (\Throwable $e) {
            }
            return;
        }
        if (! $this->ensureMeta()) {
            return;
        }
        try {
            DB::connection('economat')->table(self::META)->where('CODECAISSE', $code)->delete();
        } catch (\Throwable $e) {
        }
    }

    /* ----------------- Métadonnées caisse (description / statut / date) ----------------- */

    private function ensureMeta2(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::META2)) {
                Schema::connection('economat')->create(self::META2, function ($t) {
                    $t->increments('id');
                    $t->string('CODECAISSE', 50);
                    $t->string('DESCRIPTION', 255)->nullable();
                    $t->string('STATUT', 20)->default('actif');
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                    $t->dateTime('CREATED_AT')->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function metaMap(): array
    {
        if (! $this->ensureMeta2()) {
            return [];
        }
        try {
            $soc = SocieteContext::current();
            $etab = EtablissementContext::current();
            return DB::connection('economat')->table(self::META2)
                ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                ->get()->keyBy(fn ($r) => (string) $r->CODECAISSE)->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function writeMeta(string $code, array $fields, bool $creating): void
    {
        if (! $this->ensureMeta2()) {
            return;
        }
        try {
            $soc = SocieteContext::current();
            $etab = EtablissementContext::current();
            $exists = DB::connection('economat')->table(self::META2)->where('CODECAISSE', $code)
                ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                ->exists();
            if ($exists) {
                DB::connection('economat')->table(self::META2)->where('CODECAISSE', $code)
                    ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
                    ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                    ->update($fields);
            } else {
                DB::connection('economat')->table(self::META2)->insert(array_merge([
                    'CODECAISSE' => $code,
                    'CODESOCIETE' => $soc,
                    'CODEETABLISSEMENT' => $etab,
                    'STATUT' => 'actif',
                    'CREATED_AT' => now(),
                ], $fields));
            }
        } catch (\Throwable $e) {
        }
    }

    private function genCode(): string
    {
        $etab = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) EtablissementContext::current())) ?: 'CAI';
        return $etab.now()->format('y').str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT);
    }
}
