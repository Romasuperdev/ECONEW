<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Subscription extends Model
{
    protected $fillable = [
        'school_id', 'subscription_plan_id', 'starts_at', 'ends_at',
        'status', 'amount', 'auto_renew',
    ];

    protected $casts = [
        'starts_at' => 'date',
        'ends_at' => 'date',
        'amount' => 'decimal:2',
        'auto_renew' => 'boolean',
    ];

    protected $appends = ['is_expired', 'days_left'];

    public function school() { return $this->belongsTo(School::class); }
    public function plan() { return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id'); }
    public function payments() { return $this->hasMany(SubscriptionPayment::class); }

    public function getIsExpiredAttribute(): bool
    {
        return $this->status === 'expired' || ($this->ends_at && $this->ends_at->isPast());
    }

    public function getDaysLeftAttribute(): int
    {
        return $this->ends_at ? (int) round(Carbon::now()->startOfDay()->diffInDays($this->ends_at, false)) : 0;
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['active', 'trial'], true) && ! $this->is_expired;
    }
}
