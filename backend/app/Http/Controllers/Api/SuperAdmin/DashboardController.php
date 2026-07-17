<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\RhUser;
use App\Models\Societe;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    private function safe(callable $fn, $default = 0)
    {
        try { return $fn(); } catch (\Throwable $e) { return $default; }
    }

    public function index()
    {
        $societes = $this->safe(fn () => Societe::count(), 0);
        $users = $this->safe(fn () => RhUser::where(fn ($q) => $q->whereNull('Supprimer')->orWhere('Supprimer', 0))->count(), 0);
        $usersTotal = $this->safe(fn () => RhUser::count(), 0);
        $eleves = $this->safe(fn () => Student::count(), 0);
        $apps = $this->safe(fn () => Application::count(), 0);
        $affectations = $this->safe(fn () => DB::connection('master')->table('societe_utilisateur')->count(), 0);

        $recentes = $this->safe(fn () => Societe::orderByDesc('NUMAUTO')->limit(6)->get()->map->toNormalized(), collect());

        return response()->json([
            'kpis' => [
                'total_societes' => $societes,
                'total_utilisateurs' => $users,
                'total_utilisateurs_all' => $usersTotal,
                'total_eleves' => $eleves,
                'total_applications' => $apps,
                'total_affectations' => $affectations,
            ],
            'societes_recentes' => $recentes,
        ]);
    }
}
