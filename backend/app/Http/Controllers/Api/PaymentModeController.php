<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentMode;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;

class PaymentModeController extends Controller
{
    public function index()
    {
        try {
            return response()->json(
                PaymentMode::forTenant()->where('ACTIF', 1)->orderBy('LIBELLE')->get()
                    ->map(fn (PaymentMode $m) => $m->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:80']]);
        $m = new PaymentMode();
        $m->LIBELLE = $data['name'];
        $m->ACTIF = 1;
        $m->CODESOCIETE = SocieteContext::current();
        $m->CODEETABLISSEMENT = EtablissementContext::current();
        $m->CREATED_AT = now();
        $m->save();

        return response()->json($m->toNormalized(), 201);
    }

    public function destroy(string $mode)
    {
        PaymentMode::forTenant()->where('ID', $mode)->firstOrFail()->delete();

        return response()->json(['message' => 'Mode supprimé.']);
    }
}
