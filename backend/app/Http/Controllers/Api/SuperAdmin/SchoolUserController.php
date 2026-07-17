<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/**
 * Gestion par le Super Admin des comptes administrateurs des écoles.
 */
class SchoolUserController extends Controller
{
    public function index(Request $request)
    {
        return User::query()
            ->where('role', '!=', 'super_admin')
            ->with('school:id,name')
            ->when($request->school_id, fn ($q, $id) => $q->where('school_id', $id))
            ->latest()->paginate($request->per_page ?? 20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'in:admin,directeur,comptable,caissier,gestionnaire,secretaire,auditeur'],
            'school_id' => ['required', 'exists:schools,id'],
        ]);
        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);
        AuditLogger::log('create', "Création utilisateur {$user->email}", $user);

        return response()->json($user->load('school:id,name'), 201);
    }

    public function resetPassword(User $user)
    {
        $newPassword = Str::random(10);
        $user->update(['password' => Hash::make($newPassword)]);
        AuditLogger::log('update', "Réinitialisation du mot de passe de {$user->email}", $user);

        return response()->json(['message' => 'Mot de passe réinitialisé.', 'password' => $newPassword]);
    }

    public function setActive(Request $request, User $user)
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $user->update($data);

        return $user;
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }
}
