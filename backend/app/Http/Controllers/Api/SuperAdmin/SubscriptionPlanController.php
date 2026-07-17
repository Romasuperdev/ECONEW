<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SubscriptionPlanController extends Controller
{
    public function index()
    {
        return SubscriptionPlan::withCount('subscriptions')->orderBy('price')->get();
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        $data['slug'] = Str::slug($data['name']);

        return response()->json(SubscriptionPlan::create($data), 201);
    }

    public function show(SubscriptionPlan $subscriptionPlan) { return $subscriptionPlan; }

    public function update(Request $request, SubscriptionPlan $subscriptionPlan)
    {
        $subscriptionPlan->update($this->rules($request));

        return $subscriptionPlan;
    }

    public function destroy(SubscriptionPlan $subscriptionPlan)
    {
        $subscriptionPlan->delete();

        return response()->json(['message' => 'Formule supprimée.']);
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'billing_period' => ['required', 'in:mensuel,annuel'],
            'max_students' => ['nullable', 'integer', 'min:0'],
            'max_users' => ['nullable', 'integer', 'min:0'],
            'storage_mb' => ['nullable', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
