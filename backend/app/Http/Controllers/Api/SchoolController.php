<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Gestion par l'école de son propre établissement (profil).
 */
class SchoolController extends Controller
{
    public function mine(Request $request)
    {
        return $request->user()->school;
    }

    public function updateMine(Request $request)
    {
        $school = $request->user()->school;
        abort_if(! $school, 404, 'Aucun établissement associé.');

        $school->update($request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'responsable_name' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'currency' => ['nullable', 'string', 'max:8'],
        ]));

        return $school;
    }
}
