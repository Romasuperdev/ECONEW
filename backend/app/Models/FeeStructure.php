<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;

class FeeStructure extends Model
{
    use BelongsToSchool;

    protected $fillable = [
        'school_id', 'academic_year_id', 'school_class_id', 'fee_type_id', 'amount',
    ];

    protected $casts = ['amount' => 'decimal:2'];

    public function school() { return $this->belongsTo(School::class); }
    public function academicYear() { return $this->belongsTo(AcademicYear::class); }
    public function schoolClass() { return $this->belongsTo(SchoolClass::class); }
    public function feeType() { return $this->belongsTo(FeeType::class); }
}
