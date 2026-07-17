<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Support\SocieteContext;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    public function index(Request $request)
    {
        try {
            return response()->json(
                ExpenseCategory::forTenant()->orderBy('LIBELLE')->get()
                    ->map(fn (ExpenseCategory $c) => $c->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        $c = new ExpenseCategory();
        $c->CODESOCIETE = SocieteContext::current();
        $c->LIBELLE = $data['name'];
        $c->CREATED_AT = now();
        $c->save();

        return response()->json($c->toNormalized(), 201);
    }

    public function show(string $item)
    {
        return response()->json($this->find($item)->toNormalized());
    }

    public function update(Request $request, string $item)
    {
        $data = $this->rules($request);
        $c = $this->find($item);
        $c->LIBELLE = $data['name'];
        $c->save();

        return response()->json($c->toNormalized());
    }

    public function destroy(string $item)
    {
        $this->find($item)->delete();

        return response()->json(['message' => 'Catégorie supprimée.']);
    }

    private function find(string $id): ExpenseCategory
    {
        return ExpenseCategory::forTenant()->where('ID', $id)->firstOrFail();
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);
    }
}
