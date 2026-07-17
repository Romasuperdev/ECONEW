<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        return Employee::query()
            ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('first_name', 'like', "%$s%")
                ->orWhere('last_name', 'like', "%$s%")
                ->orWhere('matricule', 'like', "%$s%")))
            ->when($request->is_active !== null, fn ($q) => $q->where('is_active', (bool) $request->is_active))
            ->latest()->get();
    }

    public function store(Request $request)
    {
        return response()->json(Employee::create($this->rules($request)), 201);
    }

    public function show(Employee $employee)
    {
        return $employee->load(['payslips' => fn ($q) => $q->latest('period')]);
    }

    public function update(Request $request, Employee $employee)
    {
        $employee->update($this->rules($request));

        return $employee;
    }

    public function destroy(Employee $employee)
    {
        $employee->delete();

        return response()->json(['message' => 'Employé supprimé.']);
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'matricule' => ['nullable', 'string'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string'],
            'base_salary' => ['required', 'numeric', 'min:0'],
            'phone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'hire_date' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}
