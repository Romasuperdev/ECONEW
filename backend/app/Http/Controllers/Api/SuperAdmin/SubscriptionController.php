<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\SubscriptionPlan;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        return Subscription::query()
            ->with(['school:id,name,code', 'plan:id,name,price'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->school_id, fn ($q, $id) => $q->where('school_id', $id))
            ->latest()
            ->paginate($request->per_page ?? 20);
    }

    /** Attribue ou renouvelle un abonnement pour une école. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'school_id' => ['required', 'exists:schools,id'],
            'subscription_plan_id' => ['required', 'exists:subscription_plans,id'],
            'starts_at' => ['required', 'date'],
            'duration_months' => ['required', 'integer', 'min:1'],
            'auto_renew' => ['nullable', 'boolean'],
            'mark_paid' => ['nullable', 'boolean'],
            'method' => ['nullable', 'in:mobile_money,carte,virement,especes'],
        ]);

        $plan = SubscriptionPlan::findOrFail($data['subscription_plan_id']);
        $start = Carbon::parse($data['starts_at']);
        $end = (clone $start)->addMonths($data['duration_months']);

        return DB::transaction(function () use ($data, $plan, $start, $end) {
            // Expire les anciens abonnements de l'école
            Subscription::where('school_id', $data['school_id'])
                ->whereIn('status', ['active', 'trial'])->update(['status' => 'expired']);

            $sub = Subscription::create([
                'school_id' => $data['school_id'],
                'subscription_plan_id' => $plan->id,
                'starts_at' => $start->toDateString(),
                'ends_at' => $end->toDateString(),
                'status' => 'active',
                'amount' => $plan->price,
                'auto_renew' => $data['auto_renew'] ?? false,
            ]);

            if (! empty($data['mark_paid'])) {
                SubscriptionPayment::create([
                    'subscription_id' => $sub->id,
                    'school_id' => $data['school_id'],
                    'reference' => 'ABN-'.now()->format('Y').'-'.str_pad((string) (SubscriptionPayment::count() + 1), 4, '0', STR_PAD_LEFT),
                    'amount' => $plan->price,
                    'paid_at' => now()->toDateString(),
                    'method' => $data['method'] ?? 'mobile_money',
                    'status' => 'paye',
                ]);
            }

            AuditLogger::log('create', "Abonnement {$plan->name} attribué (école #{$data['school_id']})", $sub);

            return response()->json($sub->load(['school:id,name', 'plan', 'payments']), 201);
        });
    }

    public function show(Subscription $subscription)
    {
        return $subscription->load(['school:id,name,code', 'plan', 'payments']);
    }

    public function destroy(Subscription $subscription)
    {
        $subscription->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Abonnement annulé.']);
    }
}
