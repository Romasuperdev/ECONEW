<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use BelongsToSchool;

    protected $fillable = [
        'school_id', 'invoice_id', 'student_id', 'user_id', 'receipt_number',
        'amount', 'paid_at', 'method', 'reference', 'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date',
    ];

    public function school() { return $this->belongsTo(School::class); }
    public function invoice() { return $this->belongsTo(Invoice::class); }
    public function student() { return $this->belongsTo(Student::class); }
    public function user() { return $this->belongsTo(User::class); }
}
