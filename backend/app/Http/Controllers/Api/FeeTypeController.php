<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeType;
use Illuminate\Http\Request;

class FeeTypeController extends Controller
{
    public function index(Request $request)
    {
        try {
            return response()->json(
                FeeType::forTenant()->orderBy('Num')->get()
                    ->map(fn (FeeType $f) => $f->toNormalized())
                    ->unique('name')->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        $data['school_id'] = $request->user()->school_id;

        return response()->json(FeeType::create($data), 201);
    }

    public function show(FeeType $item)
    {
        return $item;
    }

    public function update(Request $request, FeeType $item)
    {
        $item->update($this->rules($request));

        return $item;
    }

    public function destroy(FeeType $item)
    {
        $item->delete();

        return response()->json(['message' => 'Supprimé.']);
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string'],
            'is_recurring' => ['nullable', 'boolean'],
            'description' => ['nullable', 'string'],
        ]);
    }
}
