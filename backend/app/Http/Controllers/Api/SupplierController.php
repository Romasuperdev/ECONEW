<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use App\Support\UidRegistry;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        try {
            return response()->json(
                Supplier::forTenant()->orderByDesc('ID')->get()
                    ->map(fn (Supplier $s) => $s->toNormalized())->values()
            );
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        $s = new Supplier();
        $s->CODESOCIETE = SocieteContext::current();
        $s->NOM = $data['name'];
        $s->CONTACT = $data['contact_name'] ?? null;
        $s->TELEPHONE = $data['phone'] ?? null;
        $s->EMAIL = $data['email'] ?? null;
        $s->ADRESSE = $data['address'] ?? null;
        $s->CREATED_AT = now();
        $s->save();
        UidRegistry::assign('FOURNISSEUR', (string) $s->getKey());

        return response()->json($s->toNormalized(), 201);
    }

    public function show(string $item)
    {
        return response()->json($this->find($item)->toNormalized());
    }

    public function update(Request $request, string $item)
    {
        $data = $this->rules($request);
        $s = $this->find($item);
        $s->NOM = $data['name'];
        $s->CONTACT = $data['contact_name'] ?? null;
        $s->TELEPHONE = $data['phone'] ?? null;
        $s->EMAIL = $data['email'] ?? null;
        $s->ADRESSE = $data['address'] ?? null;
        $s->save();

        return response()->json($s->toNormalized());
    }

    public function destroy(string $item)
    {
        $this->find($item)->delete();

        return response()->json(['message' => 'Fournisseur supprimé.']);
    }

    // Recuperation scellee par societe (isolation).
    private function find(string $id): Supplier
    {
        return Supplier::forTenant()->where('ID', $id)->firstOrFail();
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);
    }
}
