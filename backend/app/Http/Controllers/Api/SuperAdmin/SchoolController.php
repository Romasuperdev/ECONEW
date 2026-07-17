<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class SchoolController extends Controller
{
    public function index(Request $request)
    {
        return School::query()
            ->with('currentSubscription.plan')
            ->withCount(['students', 'users'])
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%$s%")->orWhere('code', 'like', "%$s%"))
            ->when($request->status, fn ($q, $st) => $q->where('status', $st))
            ->latest()
            ->paginate($request->per_page ?? 15);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sigle' => ['nullable', 'string', 'max:50'],
            'code' => ['nullable', 'string', 'unique:schools,code'],
            'responsable_name' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'country' => ['nullable', 'string'],
            'language' => ['nullable', 'string', 'max:8'],
            'phone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'website' => ['nullable', 'string'],
            'timezone' => ['nullable', 'string'],
            'rccm' => ['nullable', 'string'],
            'tax_number' => ['nullable', 'string'],
            'currency' => ['nullable', 'string', 'max:8'],
            // Compte administrateur initial
            'admin_name' => ['required', 'string'],
            'admin_email' => ['required', 'email', 'unique:users,email'],
            'admin_password' => ['required', Password::defaults()],
            // Abonnement initial
            'subscription_plan_id' => ['nullable', 'exists:subscription_plans,id'],
            'trial_days' => ['nullable', 'integer', 'min:0'],
        ]);

        return DB::transaction(function () use ($data) {
            $school = School::create([
                'name' => $data['name'],
                'sigle' => $data['sigle'] ?? null,
                'code' => $data['code'] ?? strtoupper(Str::slug($data['name'], '')).'-'.strtoupper(Str::random(3)),
                'responsable_name' => $data['responsable_name'] ?? null,
                'address' => $data['address'] ?? null,
                'city' => $data['city'] ?? null,
                'country' => $data['country'] ?? null,
                'language' => $data['language'] ?? 'fr',
                'status' => 'active',
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'website' => $data['website'] ?? null,
                'timezone' => $data['timezone'] ?? 'Africa/Abidjan',
                'rccm' => $data['rccm'] ?? null,
                'tax_number' => $data['tax_number'] ?? null,
                'currency' => $data['currency'] ?? 'XOF',
            ]);

            $admin = User::create([
                'name' => $data['admin_name'],
                'email' => $data['admin_email'],
                'password' => Hash::make($data['admin_password']),
                'role' => 'admin',
                'school_id' => $school->id,
                'is_active' => true,
            ]);

            if (! empty($data['subscription_plan_id'])) {
                $plan = SubscriptionPlan::find($data['subscription_plan_id']);
                $days = $data['trial_days'] ?? 30;
                Subscription::create([
                    'school_id' => $school->id,
                    'subscription_plan_id' => $plan->id,
                    'starts_at' => Carbon::now()->toDateString(),
                    'ends_at' => Carbon::now()->addDays($days)->toDateString(),
                    'status' => $days > 0 && $plan->price == 0 ? 'trial' : 'active',
                    'amount' => $plan->price,
                    'auto_renew' => false,
                ]);
            }

            AuditLogger::log('create', "Création de l'établissement {$school->name}", $school);

            return response()->json($school->load('currentSubscription.plan', 'users'), 201);
        });
    }

    public function show(School $school)
    {
        return $school->load(['currentSubscription.plan', 'subscriptions.plan', 'users'])
            ->loadCount(['students', 'users']);
    }

    public function update(Request $request, School $school)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'sigle' => ['nullable', 'string', 'max:50'],
            'responsable_name' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'country' => ['nullable', 'string'],
            'language' => ['nullable', 'string', 'max:8'],
            'phone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'website' => ['nullable', 'string'],
            'timezone' => ['nullable', 'string'],
            'rccm' => ['nullable', 'string'],
            'tax_number' => ['nullable', 'string'],
            'currency' => ['nullable', 'string', 'max:8'],
        ]);
        $school->update($data);
        AuditLogger::log('update', "Modification de l'établissement {$school->name}", $school);

        return $school;
    }

    public function setStatus(Request $request, School $school)
    {
        $data = $request->validate(['status' => ['required', 'in:active,suspended,inactive']]);
        $school->update(['status' => $data['status']]);
        AuditLogger::log('update', "Statut de {$school->name} → {$data['status']}", $school);

        return $school;
    }

    public function destroy(School $school)
    {
        $name = $school->name;
        $school->delete();
        AuditLogger::log('delete', "Suppression de l'établissement {$name}");

        return response()->json(['message' => 'Établissement supprimé.']);
    }
}
