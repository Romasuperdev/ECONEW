<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sms;
use Illuminate\Http\Request;

/**
 * Paramétrage des SMS (table ECONOMAT T_SMS) : préparation avant envoi.
 */
class SmsController extends Controller
{
    public function index()
    {
        try {
            return Sms::orderByDesc('id')->limit(300)->get()->map->toNormalized()->values();
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'numero' => ['required', 'string', 'max:50'],
            'message' => ['required', 'string', 'max:1000'],
            'type' => ['nullable', 'string', 'max:50'],
            'date' => ['nullable', 'string', 'max:20'],
            'heure' => ['nullable', 'string', 'max:20'],
        ]);

        try {
            $sms = new Sms();
            $sms->Numero = $data['numero'];
            $sms->Message = $data['message'];
            $sms->Type = $data['type'] ?? null;
            $sms->Date = $data['date'] ?: now()->format('Y-m-d');
            $sms->Heure = $data['heure'] ?: now()->format('H:i');
            $sms->Users = $request->user()?->name ?? 'app';
            $sms->save();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Enregistrement impossible : '.$e->getMessage()], 422);
        }

        return response()->json($sms->toNormalized(), 201);
    }

    public function update(Request $request, string $sms)
    {
        $data = $request->validate([
            'numero' => ['required', 'string', 'max:50'],
            'message' => ['required', 'string', 'max:1000'],
            'type' => ['nullable', 'string', 'max:50'],
            'date' => ['nullable', 'string', 'max:20'],
            'heure' => ['nullable', 'string', 'max:20'],
        ]);

        try {
            $row = Sms::findOrFail($sms);
            $row->Numero = $data['numero'];
            $row->Message = $data['message'];
            $row->Type = $data['type'] ?? null;
            if (! empty($data['date'])) { $row->Date = $data['date']; }
            if (! empty($data['heure'])) { $row->Heure = $data['heure']; }
            $row->save();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }

        return response()->json($row->toNormalized());
    }

    public function destroy(string $sms)
    {
        try {
            Sms::findOrFail($sms)->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'SMS supprimé.']);
    }
}
