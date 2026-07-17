<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        try {
            $rows = ActivityLog::query()
                ->when($request->action, fn ($q, $a) => $q->where('ACTION', $a))
                ->when($request->search, fn ($q, $s) => $q->where('DESCRIPTION', 'like', "%$s%"))
                ->orderByDesc('ID')->limit(500)->get()
                ->map(fn (ActivityLog $a) => $a->toNormalized());

            $perPage = (int) ($request->per_page ?? 30);
            $page = (int) ($request->page ?? 1);
            return response()->json([
                'data' => $rows->forPage($page, $perPage)->values(),
                'total' => $rows->count(),
                'per_page' => $perPage,
                'current_page' => $page,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['data' => [], 'total' => 0]);
        }
    }
}
