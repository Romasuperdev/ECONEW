<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request)
    {
        return User::query()
            ->when($request->user()->school_id, fn ($q, $id) => $q->where('school_id', $id))
            ->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'in:admin,directeur,comptable,caissier'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        $data['school_id'] = $request->user()->school_id;

        return response()->json(User::create($data), 201);
    }

    public function show(User $user) { return $user; }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$user->id],
            'password' => ['nullable', Password::defaults()],
            'role' => ['sometimes', 'in:admin,directeur,comptable,caissier'],
            'is_active' => ['nullable', 'boolean'],
        ]);
        if (empty($data['password'])) unset($data['password']);
        $user->update($data);

        return $user;
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }
}
