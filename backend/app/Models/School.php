<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class School extends Model
{
    protected $fillable = [
        'name', 'sigle', 'responsable_name', 'code', 'address', 'city', 'country',
        'language', 'status', 'phone', 'email', 'website', 'timezone', 'rccm',
        'tax_number', 'currency', 'logo_path',
    ];

    public function users() { return $this->hasMany(User::class); }
    public function academicYears() { return $this->hasMany(AcademicYear::class); }
    public function cycles() { return $this->hasMany(Cycle::class); }
    public function levels() { return $this->hasMany(Level::class); }
    public function classes() { return $this->hasMany(SchoolClass::class); }
    public function students() { return $this->hasMany(Student::class); }
    public function feeTypes() { return $this->hasMany(FeeType::class); }
    public function invoices() { return $this->hasMany(Invoice::class); }
    public function payments() { return $this->hasMany(Payment::class); }
    public function expenses() { return $this->hasMany(Expense::class); }
    public function suppliers() { return $this->hasMany(Supplier::class); }
    public function subscriptions() { return $this->hasMany(Subscription::class); }
    public function subscriptionPayments() { return $this->hasMany(SubscriptionPayment::class); }

    public function currentSubscription()
    {
        return $this->hasOne(Subscription::class)->latestOfMany('ends_at');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
