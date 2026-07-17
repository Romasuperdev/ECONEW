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
        try { return Schema::connection('economat')->hasTable('ECO_USER_CAISSE'); }
        catch (\Throwable $e) { return false; }
    }

    private function setCaisse($userId, ?string $code): void
    {
        if (! $this->hasCaisseTable()) return;
        try {
            DB::connection('economat')->table('ECO_USER_CAISSE')->where('USER_ID', $userId)->delete();
            if ($code) {
                DB::connection('economat')->table('ECO_USER_CAISSE')->insert([
                    'USER_ID' => $userId, 'CODECAISSE' => $code,
                    'CODESOCIETE' => SocieteContext::current(),
                    'CODEETABLISSEMENT' => EtablissementContext::current(),
                    'CREATED_AT' => now(),
                ]);
            }
        } catch (\Throwable $e) {
        }
    }

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
        $consoleIds = collect();
        try {
            $candidates = array_values(array_filter([$soc]));
            try {
                $numauto = \App\Models\Societe::where('CODESOCIETE', $soc)->value('NUMAUTO');
                if ($numauto) { $candidates[] = $numauto; }
            } catch (\Throwable $e) {}
            if (! empty($candidates) && Schema::connection('master')->hasTable('societe_utilisateur')) {
                $consoleIds = collect(DB::connection('master')->table('societe_utilisateur')
                    ->whereIn('societe_id', $candidates)->pluck('user_id'));
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
        $this->setCaisse($user, $data['caisse_code'] ?? null);
        AuditLogger::log('update', "Affectation caisse utilisateur #{$user} -> ".($data['caisse_code'] ?? 'aucune'));

        return response()->json([
            'message' => 'Affectation enregistrée.',
            'caisse_code' => $data['caisse_code'] ?? null,
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
            DB::connection('economat')->table('ECO_USER_ROLE')->where('USER_ID', $user)->update(['ROLE' => $role]);
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
