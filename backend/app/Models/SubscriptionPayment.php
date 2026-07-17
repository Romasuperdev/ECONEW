<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPayment extends Model
{
    protected $fillable = [
        'subscription_id', 'school_id', 'reference', 'amount', 'paid_at', 'method', 'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date',
    ];

    public function subscription() { return $this->belongsTo(Subscription::class); }
    public function school() { return $this->belongsTo(School::class); }
}
