<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class ApplicationController extends Controller
{
    private array $nameCols = ['Libelle', 'LibelleApp', 'NomApp', 'Nom', 'Designation', 'LIBELLE', 'Description', 'LibelleApplication'];

    public function index()
    {
        try {
            return Application::orderBy('CodeApp')->get()->map->toNormalized();
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['nullable', 'string'],
        ]);
        try {
            $cols = Schema::connection('master')->getColumnListing('US_APPLICATIONS');
            $app = new Application();
            $app->CodeApp = $data['code'];
            if (! empty($data['name'])) {
                foreach ($this->nameCols as $c) {
                    if (in_array($c, $cols, true)) { $app->{$c} = $data['name']; break; }
                }
            }
            $app->save();
            AuditLogger::log('create', "Création application {$data['code']}");
            return response()->json($app->toNormalized(), 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
    }

    public function update(Request $request, Application $application)
    {
        $data = $request->validate(['name' => ['nullable', 'string']]);
        try {
            $cols = Schema::connection('master')->getColumnListing('US_APPLICATIONS');
            foreach ($this->nameCols as $c) {
                if (in_array($c, $cols, true)) { $application->{$c} = $data['name'] ?? null; break; }
            }
            $application->save();
            return $application->toNormalized();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible.'], 422);
        }
    }

    public function destroy(Application $application)
    {
        try {
            $application->delete();
            return response()->json(['message' => 'Application supprimée.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible.'], 422);
        }
    }
}
