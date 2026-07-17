<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use BelongsToSchool;

    protected $fillable = [
        'school_id', 'matricule', 'first_name', 'last_name', 'position',
        'base_salary', 'phone', 'email', 'hire_date', 'is_active',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'hire_date' => 'date',
        'is_active' => 'boolean',
    ];

    protected $appends = ['full_name'];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function payslips() { return $this->hasMany(Payslip::class); }
}
