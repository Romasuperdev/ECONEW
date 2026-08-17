<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RhUser;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EstablishmentUserController extends Controller
{
    private function roles(): array
    {
        return (array) config('permissions.assignable', []);
    }

    private function hasCaisseTable(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable('ECO_USER_CAISSE')) {
                Schema::connection('economat')->create('ECO_USER_CAISSE', function ($t) {
                    $t->increments('id');
                    $t->string('USER_ID', 50);
                    $t->string('CODECAISSE', 50)->nullable();
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

    /** Écrit l'affectation caisse en n'utilisant que les colonnes réellement présentes. Renvoie true si OK. */
    private function setCaisse($userId, ?string $code): bool
    {
        if (! $this->hasCaisseTable()) {
            return false;
        }
        try {
            $cols = Schema::connection('economat')->getColumnListing('ECO_USER_CAISSE');
            DB::connection('economat')->table('ECO_USER_CAISSE')->where('USER_ID', $userId)->delete();
            if ($code) {
                $row = ['USER_ID' => $userId, 'CODECAISSE' => $code];
                if (in_array('CODESOCIETE', $cols, true)) { $row['CODESOCIETE'] = SocieteContext::current(); }
                if (in_array('CODEETABLISSEMENT', $cols, true)) { $row['CODEETABLISSEMENT'] = EtablissementContext::current(); }
                if (in_array('CREATED_AT', $cols, true)) { $row['CREATED_AT'] = now(); }
                DB::connection('economat')->table('ECO_USER_CAISSE')->insert($row);
            }
            return true;
        } catch (\Throwable $e) {
            $this->caisseError = $e->getMessage();
            return false;
        }
    }
    private ?string $caisseError = null;

    private function caisseOf($userId): ?string
    {
        if (! $this->hasCaisseTable()) return null;
        try {
            return DB::connection('economat')->table('ECO_USER_CAISSE')->where('USER_ID', $userId)->value('CODECAISSE');
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function index()
    {
        $soc = SocieteContext::current();
        $etab = EtablissementContext::current();

        // 1) Utilisateurs affectés à la société via la console (societe_utilisateur).
        //    societe_id est numérique (= NUMAUTO) : on résout d'abord le NUMAUTO,
        //    puis on tolère un pivot stockant soit le NUMAUTO, soit le code société.
        $consoleIds = collect();
        try {
            $numauto = null;
            try { $numauto = \App\Models\Societe::where('CODESOCIETE', $soc)->value('NUMAUTO'); } catch (\Throwable $e) {}
            if (Schema::connection('master')->hasTable('societe_utilisateur')) {
                $q = DB::connection('master')->table('societe_utilisateur');
                if ($numauto !== null) {
                    $q->where('societe_id', $numauto);
                } elseif ($soc !== null) {
                    $q->where('societe_id', $soc); // repli si le pivot stocke le code
                } else {
                    $q->whereRaw('1 = 0');
                }
                $consoleIds = collect($q->pluck('user_id'));
            }
        } catch (\Throwable $e) {}

        // 1b) Utilisateurs affectés directement à l'établissement (console → ECO_USER_ETAB).
        try {
            if ($etab && Schema::connection('economat')->hasTable('ECO_USER_ETAB')) {
                $etabIds = DB::connection('economat')->table('ECO_USER_ETAB')
                    ->where('CODEETABLISSEMENT', $etab)->pluck('USER_ID');
                $consoleIds = $consoleIds->merge($etabIds);
            }
        } catch (\Throwable $e) {}

        // 2) Rôles définis localement pour l'établissement (ECO_USER_ROLE).
        $roleRows = collect();
        try {
            $roleRows = DB::connection('economat')->table('ECO_USER_ROLE')
                ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
                ->get();
        } catch (\Throwable $e) {}
        $roleById = $roleRows->keyBy('USER_ID');

        $allIds = $consoleIds->merge($roleRows->pluck('USER_ID'))->unique()->filter()->values()->all();
        if (empty($allIds)) {
            return response()->json([]);
        }

        try {
            $users = RhUser::whereIn('Id', $allIds)->get()->keyBy('Id');
        } catch (\Throwable $e) {
            return response()->json([]);
        }

        return response()->json(collect($allIds)->map(function ($id) use ($users, $roleById) {
            $u = $users->get($id);
            if (! $u) { return null; }
            $role = optional($roleById->get($id))->ROLE ?? $u->role;
            return [
                'id' => $id,
                'name' => $u->name,
                'login' => $u->Login,
                'email' => $u->Email,
                'role' => $role,
                'caisse_code' => $this->caisseOf($id),
                'active' => ! (bool) $u->Supprimer,
            ];
        })->filter()->values());
    }

    /** Affecte (ou retire) une caisse à un utilisateur. */
    public function assignCaisse(Request $request, string $user)
    {
        $data = $request->validate([
            'caisse_code' => ['nullable', 'string', 'max:50'],
        ]);
        $ok = $this->setCaisse($user, $data['caisse_code'] ?? null);
        if (! $ok) {
            return response()->json(['message' => 'Affectation impossible : '.($this->caisseError ?: 'table ECO_USER_CAISSE indisponible.')], 422);
        }
        AuditLogger::log('update', "Affectation caisse utilisateur #{$user} -> ".($data['caisse_code'] ?? 'aucune'));

        // Vérifie que l'affectation est bien lue (cohérence avec l'ouverture de caisse).
        return response()->json([
            'message' => 'Affectation enregistrée.',
            'caisse_code' => $this->caisseOf($user),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'min:4'],
            'nom' => ['required', 'string', 'max:100'],
            'prenom' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'role' => ['required', Rule::in($this->roles())],
            'caisse_code' => ['nullable', 'string', 'max:50'],
        ]);

        $soc = SocieteContext::current();
        $etab = EtablissementContext::current();

        $u = new RhUser();
        $u->Login = $data['login'];
        $u->MotDePasse = Hash::make($data['password']);
        $u->Nom = $data['nom'];
        $u->Prenom = $data['prenom'] ?? null;
        $u->Email = $data['email'] ?? null;
        $u->SuperAdmin = 0;
        $u->Superviseur = 0;
        $u->Validateur = 0;
        $u->Supprimer = 0;
        try { $u->CODESOCIETE = $soc; } catch (\Throwable $e) {}
        $u->save();

        DB::connection('economat')->table('ECO_USER_ROLE')->insert([
            'USER_ID' => $u->Id, 'ROLE' => $data['role'],
            'CODESOCIETE' => $soc, 'CODEETABLISSEMENT' => $etab, 'CREATED_AT' => now(),
        ]);
        if ($data['role'] === 'caissier') {
            $this->setCaisse($u->Id, $data['caisse_code'] ?? null);
        }

        AuditLogger::log('create', "Création utilisateur {$u->Login} (rôle {$data['role']})", $u);

        return response()->json(['id' => $u->Id, 'login' => $u->Login, 'role' => $data['role']], 201);
    }

    public function update(Request $request, string $user)
    {
        $data = $request->validate([
            'nom' => ['nullable', 'string', 'max:100'],
            'prenom' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'min:4'],
            'role' => ['nullable', Rule::in($this->roles())],
            'caisse_code' => ['nullable', 'string', 'max:50'],
        ]);

        $this->assertOwned($user);

        $u = RhUser::where('Id', $user)->firstOrFail();
        if (! empty($data['nom'])) $u->Nom = $data['nom'];
        if (array_key_exists('prenom', $data)) $u->Prenom = $data['prenom'];
        if (array_key_exists('email', $data)) $u->Email = $data['email'];
        if (! empty($data['password'])) $u->MotDePasse = Hash::make($data['password']);
        $u->save();

        $role = $data['role'] ?? null;
        if ($role) {
            DB::connection('economat')->table('ECO_USER_ROLE')->updateOrInsert(
                ['USER_ID' => $user], ['ROLE' => $role]
            );
        }
        if (array_key_exists('caisse_code', $data)) {
            $this->setCaisse($user, ($role ?? $this->roleOf($user)) === 'caissier' ? ($data['caisse_code'] ?: null) : null);
        }

        AuditLogger::log('update', "Modification utilisateur {$u->Login}", $u);

        return response()->json(['message' => 'Utilisateur mis à jour.']);
    }

    private function roleOf($userId): ?string
    {
        try { return DB::connection('economat')->table('ECO_USER_ROLE')->where('USER_ID', $userId)->value('ROLE'); }
        catch (\Throwable $e) { return null; }
    }

    public function resetPassword(string $user)
    {
        $this->assertOwned($user);
        $u = RhUser::where('Id', $user)->firstOrFail();
        $new = Str::random(8);
        $u->MotDePasse = Hash::make($new);
        $u->save();
        AuditLogger::log('update', "Réinitialisation mot de passe {$u->Login}", $u);

        return response()->json(['password' => $new]);
    }

    public function destroy(string $user)
    {
        $this->assertOwned($user);
        $u = RhUser::where('Id', $user)->firstOrFail();
        $u->Supprimer = 1;
        $u->save();
        AuditLogger::log('delete', "Désactivation utilisateur {$u->Login}", $u);

        return response()->json(['message' => 'Utilisateur désactivé.']);
    }

    private function assertOwned(string $userId): void
    {
        $soc = SocieteContext::current();
        $etab = EtablissementContext::current();
        $owned = DB::connection('economat')->table('ECO_USER_ROLE')
            ->where('USER_ID', $userId)
            ->when($soc, fn ($q) => $q->where('CODESOCIETE', $soc))
            ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))
            ->exists();
        abort_unless($owned, 403, 'Accès refusé : cet utilisateur ne dépend pas de votre établissement.');
    }
}
