<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\RhUser;
use App\Support\AuditLogger;
use App\Support\UserEtablissements;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class RhUserController extends Controller
{
    /** Rôles étendus assignables (stockés dans ECO_USER_ROLE). */
    private function assignableRoles(): array
    {
        return (array) config('permissions.assignable', []);
    }

    /** Définit le rôle étendu d'un utilisateur dans ECO_USER_ROLE (economat). */
    private function setExtendedRole($userId, ?string $role): void
    {
        if (! $role) { return; }
        try {
            if (! Schema::connection('economat')->hasTable('ECO_USER_ROLE')) {
                Schema::connection('economat')->create('ECO_USER_ROLE', function ($t) {
                    $t->increments('id');
                    $t->string('USER_ID', 50);
                    $t->string('ROLE', 50);
                });
            }
            DB::connection('economat')->table('ECO_USER_ROLE')->updateOrInsert(
                ['USER_ID' => (string) $userId],
                ['ROLE' => $role]
            );
        } catch (\Throwable $e) {}
    }
    /** Société (code) de chaque utilisateur d'après societe_utilisateur : [userId => code]. */
    private function societesOfUsers(array $ids): array
    {
        try {
            if (empty($ids) || ! Schema::connection('master')->hasTable('societe_utilisateur')) {
                return [];
            }
            return DB::connection('master')->table('societe_utilisateur')
                ->whereIn('user_id', $ids)->orderBy('id')->get()
                ->groupBy('user_id')->map(fn ($r) => (string) $r->first()->societe_id)->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** Enregistre la société + les établissements (hors super admin). */
    private function syncAffectations(RhUser $u, array $data): void
    {
        if ($u->SuperAdmin || ! (array_key_exists('code_societe', $data) || array_key_exists('etablissements', $data))) {
            return;
        }
        UserEtablissements::sync($u->Id, $data['code_societe'] ?? null, $data['etablissements'] ?? []);
    }

    private function affectationRules(): array
    {
        return [
            'code_societe' => ['nullable', 'string', 'max:50'],
            'etablissements' => ['nullable', 'array'],
            'etablissements.*' => ['string', 'max:50'],
        ];
    }

    public function index(Request $request)
    {
        try {
            $users = RhUser::query()
                ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w
                    ->where('Login', 'like', "%$s%")->orWhere('Email', 'like', "%$s%")
                    ->orWhere('Nom', 'like', "%$s%")->orWhere('Prenom', 'like', "%$s%")))
                ->orderBy('Nom')->limit(500)->get();
            $ids = $users->pluck('Id')->all();
            $etabs = UserEtablissements::codesForMany($ids);
            $socs = $this->societesOfUsers($ids);

            return $users->map(fn ($u) => [
                    'id' => $u->Id, 'name' => $u->name, 'login' => $u->Login, 'email' => $u->Email,
                    'nom' => $u->Nom, 'prenom' => $u->Prenom, 'role' => $u->role,
                    'super_admin' => (bool) $u->SuperAdmin, 'superviseur' => (bool) $u->Superviseur,
                    'validateur' => (bool) $u->Validateur, 'supprime' => (bool) $u->Supprimer,
                    'code_societe' => $socs[$u->Id] ?? null,
                    'etablissements' => $etabs[(string) $u->Id] ?? [],
                ]);
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'login' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string', 'min:4'],
            'nom' => ['required', 'string'],
            'prenom' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'contact' => ['nullable', 'string'],
            'super_admin' => ['nullable', 'boolean'],
            'superviseur' => ['nullable', 'boolean'],
            'validateur' => ['nullable', 'boolean'],
            'role' => ['nullable', 'string', 'max:50'],
        ] + $this->affectationRules());
        // Contrôle AVANT création : établissements tous dans la même société.
        UserEtablissements::assertSameSociete($data['etablissements'] ?? [], $data['code_societe'] ?? null);

        $u = new RhUser();
        $u->Login = $data['login'];
        $u->MotDePasse = Hash::make($data['password']); // bcrypt, compatible
        $u->Nom = $data['nom'];
        $u->Prenom = $data['prenom'] ?? null;
        $u->Email = $data['email'] ?? null;
        try { $u->Contact = $data['contact'] ?? null; } catch (\Throwable $e) {}
        $u->SuperAdmin = ! empty($data['super_admin']) ? 1 : 0;
        $u->Superviseur = ! empty($data['superviseur']) ? 1 : 0;
        $u->Validateur = ! empty($data['validateur']) ? 1 : 0;
        $u->Supprimer = 0;
        $u->save();
        $this->syncAffectations($u, $data);
        // Rôle étendu (admin_etablissement, directeur, comptable, …) si non super admin.
        if (empty($data['super_admin']) && ! empty($data['role']) && in_array($data['role'], $this->assignableRoles(), true)) {
            $this->setExtendedRole($u->Id, $data['role']);
        }
        AuditLogger::log('create', "Création utilisateur {$u->Login}".(! empty($data['role']) ? " (rôle {$data['role']})" : ''), $u);

        return response()->json(['id' => $u->Id, 'login' => $u->Login], 201);
    }

    public function update(Request $request, RhUser $rhUser)
    {
        $data = $request->validate([
            'nom' => ['sometimes', 'string'],
            'prenom' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'contact' => ['nullable', 'string'],
            'password' => ['nullable', 'string', 'min:4'],
            'super_admin' => ['nullable', 'boolean'],
            'superviseur' => ['nullable', 'boolean'],
            'validateur' => ['nullable', 'boolean'],
            'role' => ['nullable', 'string', 'max:50'],
        ] + $this->affectationRules());
        UserEtablissements::assertSameSociete($data['etablissements'] ?? [], $data['code_societe'] ?? null);
        if (array_key_exists('role', $data) && $data['role'] && in_array($data['role'], $this->assignableRoles(), true)) {
            $this->setExtendedRole($rhUser->Id, $data['role']);
        }
        if (array_key_exists('nom', $data)) $rhUser->Nom = $data['nom'];
        if (array_key_exists('prenom', $data)) $rhUser->Prenom = $data['prenom'];
        if (array_key_exists('email', $data)) $rhUser->Email = $data['email'];
        if (! empty($data['password'])) $rhUser->MotDePasse = Hash::make($data['password']);
        foreach (['super_admin' => 'SuperAdmin', 'superviseur' => 'Superviseur', 'validateur' => 'Validateur'] as $in => $col) {
            if (array_key_exists($in, $data)) $rhUser->{$col} = ! empty($data[$in]) ? 1 : 0;
        }
        $rhUser->save();
        $this->syncAffectations($rhUser, $data);

        return response()->json(['message' => 'Utilisateur mis à jour.']);
    }

    public function resetPassword(RhUser $rhUser)
    {
        $newPassword = Str::random(10);
        $rhUser->MotDePasse = Hash::make($newPassword);
        $rhUser->save();
        AuditLogger::log('update', "Réinitialisation mot de passe {$rhUser->Login}", $rhUser);

        return response()->json(['message' => 'Mot de passe réinitialisé.', 'password' => $newPassword]);
    }

    public function destroy(RhUser $rhUser)
    {
        // Suppression logique (Supprimer = 1)
        $rhUser->Supprimer = 1;
        $rhUser->save();
        AuditLogger::log('delete', "Désactivation utilisateur {$rhUser->Login}", $rhUser);

        return response()->json(['message' => 'Utilisateur désactivé.']);
    }
}
