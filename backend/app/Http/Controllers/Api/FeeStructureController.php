<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeStructure;
use Illuminate\Http\Request;

class FeeStructureController extends Controller
{
    public function index(Request $request)
    {
        return FeeStructure::query()
            ->with(['academicYear:id,label', 'schoolClass', 'feeType:id,name'])
            ->when($request->user()->school_id, fn ($q, $id) => $q->where('school_id', $id))
            ->when($request->academic_year_id, fn ($q, $id) => $q->where('academic_year_id', $id))
            ->when($request->school_class_id, fn ($q, $id) => $q->where('school_class_id', $id))
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);
        $data['school_id'] = $request->user()->school_id;

        return response()->json(
            FeeStructure::updateOrCreate(
                [
                    'academic_year_id' => $data['academic_year_id'],
                    'school_class_id' => $data['school_class_id'],
                    'fee_type_id' => $data['fee_type_id'],
                ],
                $data
            )->load(['schoolClass', 'feeType']),
            201
        );
    }

    public function show(FeeStructure $feeStructure)
    {
        return $feeStructure->load(['academicYear', 'schoolClass', 'feeType']);
    }

    public function update(Request $request, FeeStructure $feeStructure)
    {
        $feeStructure->update($this->rules($request));

        return $feeStructure->load(['schoolClass', 'feeType']);
    }

    public function destroy(FeeStructure $feeStructure)
    {
        $feeStructure->delete();

        return response()->json(['message' => 'Grille supprimée.']);
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'academic_year_id' => ['required', 'exists:academic_years,id'],
            'school_class_id' => ['required', 'integer'],
            'fee_type_id' => ['required', 'exists:fee_types,id'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);
    }
}
