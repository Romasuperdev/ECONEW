<?php

namespace App\Http\Controllers;

use App\Models\MailDiffusion;
use Illuminate\Http\Request;

class MailDiffusionController extends Controller
{
    public function index(Request $request)
    {
        $codeEtab = $request->header('X-Etablissement');

        return MailDiffusion::when($codeEtab, fn ($q) => $q->where('code_etab', $codeEtab))
            ->orderBy('ADRESS_MAIL')
            ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'ADRESS_MAIL'   => 'required|email|max:150',
            'MOT_PASS'      => 'required|string|max:150',
            'SERVEUR_SMTP'  => 'required|string|max:150',
            'PORT_SMTP'     => 'required|integer|min:1|max:65535',
        ]);

        $mail = MailDiffusion::create([
            'ADRESS_MAIL'  => $validated['ADRESS_MAIL'],
            'MOT_PASS'     => $validated['MOT_PASS'],
            'SERVEUR_SMTP' => $validated['SERVEUR_SMTP'],
            'PORT_SMTP'    => $validated['PORT_SMTP'],
            'code_etab'    => $request->header('X-Etablissement'),
            'CODESOCIETE'  => $request->header('X-Societe'),
        ]);

        return response()->json($mail, 201);
    }

    public function update(Request $request, MailDiffusion $mail)
    {
        $validated = $request->validate([
            'ADRESS_MAIL'   => 'required|email|max:150',
            'MOT_PASS'      => 'nullable|string|max:150',
            'SERVEUR_SMTP'  => 'required|string|max:150',
            'PORT_SMTP'     => 'required|integer|min:1|max:65535',
        ]);

        if (empty($validated['MOT_PASS'])) {
            unset($validated['MOT_PASS']);
        }

        $mail->update($validated);

        return response()->json($mail);
    }

    public function destroy(MailDiffusion $mail)
    {
        $mail->delete();
        return response()->json(null, 204);
    }
}