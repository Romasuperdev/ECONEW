<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\RhUser;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RhUserController extends Controller
{
    public function index(Request $request)
    {
        try {
            return RhUser::query()
                ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w
                    ->where('Login', 'like', "%$s%")->orWhere('Email', 'like', "%$s%")
                    ->orWhere('Nom', 'like', "%$s%")->orWhere('Prenom', 'like', "%$s%")))
                ->orderBy('Nom')->limit(500)->get()
                ->map(fn ($u) => [
                    'id' => $u->Id, 'name' => $u->name, 'login' => $u->Login, 'email' => $u->Email,
                    'nom' => $u->Nom, 'prenom' => $u->Prenom, 'role' => $u->role,
                    'super_admin' => (bool) $u->SuperAdmin, 'superviseur' => (bool) $u->Superviseur,
                    'validateur' => (bool) $u->Validateur, 'supprime' => (bool) $u->Supprimer,
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
        ]);

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
        AuditLogger::log('create', "Création utilisateur {$u->Login}", $u);

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
        ]);
        if (array_key_exists('nom', $data)) $rhUser->Nom = $data['nom'];
        if (array_key_exists('prenom', $data)) $rhUser->Prenom = $data['prenom'];
        if (array_key_exists('email', $data)) $rhUser->Email = $data['email'];
        if (! empty($data['password'])) $rhUser->MotDePasse = Hash::make($data['password']);
        foreach (['super_admin' => 'SuperAdmin', 'superviseur' => 'Superviseur', 'validateur' => 'Validateur'] as $in => $col) {
            if (array_key_exists($in, $data)) $rhUser->{$col} = ! empty($data[$in]) ? 1 : 0;
        }
        $rhUser->save();

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
