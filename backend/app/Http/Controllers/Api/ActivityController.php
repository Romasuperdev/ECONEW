<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    /** Historique de l'utilisateur connecte. */
    public function mine(Request $request)
    {
        try {
            return response()->json(
                ActivityLog::where('USER_ID', $request->user()->getKey())
                    ->orderByDesc('ID')->limit(200)->get()
                    ->map(fn (ActivityLog $a) => $a->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    /** Historique de l'etablissement (reserve users.manage). */
    public function index(Request $request)
    {
        try {
            return response()->json(
                ActivityLog::forTenant()
                    ->when($request->action, fn ($q, $a) => $q->where('ACTION', $a))
                    ->when($request->search, fn ($q, $s) => $q->where('DESCRIPTION', 'like', "%$s%"))
                    ->orderByDesc('ID')->limit(300)->get()
                    ->map(fn (ActivityLog $a) => $a->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }
}
