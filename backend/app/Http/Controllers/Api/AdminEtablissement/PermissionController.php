<?php

namespace App\Http\Controllers\Api\AdminEtablissement;

use App\Http\Controllers\Controller;
use App\Models\ModuleConsole;
use App\Models\RhUser;
use App\Support\AuditLogger;
use Illuminate\Http\Request;

/**
 * Attribution des modules console à un compte admin_etablissement.
 * Réservé au directeur / super_admin (déclaré côté routes).
 */
class PermissionController extends Controller
{
    /** Catalogue des modules activables. */
    public function catalogue()
    {
        return response()->json(['data' => ModuleConsole::catalogue()]);
    }

    /** Modules actuellement accordés à un utilisateur + catalogue. */
    public function show(string $user)
    {
        $u = RhUser::where('Id', $user)->first();
        if (! $u) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }
        return response()->json([
            'user' => ['id' => $u->Id, 'name' => $u->name, 'login' => $u->Login, 'role' => $u->role],
            'catalogue' => ModuleConsole::catalogue(),
            'accordes' => ModuleConsole::accordesPour($u->Id),
        ]);
    }

    /** Définit la liste des modules accordés à un utilisateur. */
    public function update(Request $request, string $user)
    {
        $data = $request->validate([
            'modules' => ['present', 'array'],
            'modules.*' => ['string'],
        ]);
        $u = RhUser::where('Id', $user)->first();
        if (! $u) {
            return response()->json(['message' => 'Utilisateur introuvable.'], 404);
        }

        ModuleConsole::definirPour($u->Id, array_values($data['modules']));
        AuditLogger::log('update', "Modules admin_etablissement de {$u->Login} : ".implode(', ', $data['modules']));

        return response()->json([
            'message' => 'Permissions de modules mises à jour.',
            'accordes' => ModuleConsole::accordesPour($u->Id),
        ]);
    }
}
