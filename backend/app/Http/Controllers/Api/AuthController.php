<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RhUser;
use App\Models\Societe;
use App\Support\AuditLogger;
use App\Support\UserEtablissements;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Recherche publique (écran de connexion) : Login/Email -> société de
     * rattachement + établissement(s) affecté(s), pour orienter l'utilisateur.
     * Volontairement minimal : ni nom, ni coordonnées.
     */
    public function lookup(Request $request)
    {
        $data = $request->validate(['identifier' => ['required', 'string', 'max:150']]);

        $user = RhUser::where('Login', $data['identifier'])
            ->orWhere('Email', $data['identifier'])
            ->first();

        if (! $user || $user->Supprimer) {
            return response()->json(['found' => false]);
        }

        if ($user->isSuperAdmin()) {
            return response()->json(['found' => true, 'is_super_admin' => true, 'societes' => [], 'etablissements' => []]);
        }

        // Établissements affectés (ECO_USER_ETAB) et leur société (T_ETABLISSEMENT.CODESOCIETE).
        $etabs = collect();
        $codes = UserEtablissements::codesFor($user->Id);
        if (! empty($codes)) {
            try {
                $etabs = DB::connection('economat')->table('T_ETABLISSEMENT')
                    ->whereIn('CODE', $codes)->orderBy('RAISONSOCIALE')
                    ->get(['CODE', 'RAISONSOCIALE', 'CODESOCIETE']);
            } catch (\Throwable $e) {
            }
        }

        // Société : celle des établissements affectés, sinon celle(s) du compte.
        $socCodes = $etabs->pluck('CODESOCIETE')->filter()->unique()->values()->all();
        try {
            $societes = ! empty($socCodes)
                ? Societe::whereIn('CODESOCIETE', $socCodes)->get()
                : $user->societesResolved();
        } catch (\Throwable $e) {
            $societes = collect();
        }

        return response()->json([
            'found' => true,
            'is_super_admin' => false,
            'societes' => $societes->map(fn ($s) => ['code' => $s->CODESOCIETE, 'name' => $s->NOMSOCIETE])->values(),
            'etablissements' => $etabs->map(fn ($e) => ['code' => $e->CODE, 'name' => $e->RAISONSOCIALE ?: $e->CODE])->values(),
        ]);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'password' => ['required'],
        ]);

        $identifier = $data['email'];

        $user = RhUser::where('Login', $identifier)
            ->orWhere('Email', $identifier)
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->getAuthPassword())) {
            throw ValidationException::withMessages(['email' => ['Identifiants incorrects.']]);
        }

        if ($user->Supprimer) {
            throw ValidationException::withMessages(['email' => ['Ce compte est désactivé.']]);
        }

        // Double authentification (OTP email) si activee et email disponible
        if (config('economat.two_factor') && ! empty($user->Email)) {
            return $this->startTwoFactor($user, $identifier);
        }

        return $this->issueToken($user);
    }

    /** Verifie le code OTP et delivre le token. */
    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $user = RhUser::where('Login', $data['email'])
            ->orWhere('Email', $data['email'])
            ->first();

        if (! $user) {
            throw ValidationException::withMessages(['code' => ['Session invalide, reconnectez-vous.']]);
        }

        $key = $this->otpKey($user);
        $expected = Cache::get($key);

        if (! $expected || ! hash_equals((string) $expected, (string) $data['code'])) {
            throw ValidationException::withMessages(['code' => ['Code incorrect ou expiré.']]);
        }

        Cache::forget($key);

        return $this->issueToken($user);
    }

    private function startTwoFactor(RhUser $user, string $identifier)
    {
        $code = (string) random_int(100000, 999999);
        Cache::put($this->otpKey($user), $code, now()->addMinutes(10));

        try {
            Mail::raw(
                "Votre code de connexion Economat est : {$code}\n\nCe code expire dans 10 minutes.",
                function ($m) use ($user) {
                    $m->to($user->Email)->subject('Code de connexion Economat');
                }
            );
        } catch (\Throwable $e) {
            return response()->json([
                'message' => "Impossible d'envoyer le code. Vérifiez la configuration SMTP (.env).",
                'detail' => $e->getMessage(),
            ], 502);
        }

        // Masque partiellement l'email
        $masked = preg_replace_callback('/^(.).*(@.*)$/', fn ($m) => $m[1].'****'.$m[2], (string) $user->Email);

        return response()->json([
            'two_factor_required' => true,
            'email' => $identifier,
            'sent_to' => $masked,
            'message' => "Un code de vérification a été envoyé à {$masked}.",
        ]);
    }

    private function issueToken(RhUser $user)
    {
        // Blocage si la (les) société(s) de l'utilisateur sont suspendues.
        // Le super administrateur n'est jamais bloqué.
        if (! $user->isSuperAdmin()) {
            $codes = $user->allowedSocieteCodes();
            if (! empty($codes)) {
                $suspendues = \App\Models\Societe::suspendedCodes();
                $actives = array_values(array_diff($codes, $suspendues));
                if (empty($actives)) {
                    return response()->json([
                        'message' => "Accès suspendu : votre établissement est temporairement suspendu. Merci de contacter l'administrateur de la plateforme.",
                    ], 403);
                }
            }
        }

        $token = $user->createToken('api')->plainTextToken;

        Auth::setUser($user);
        AuditLogger::log('login', "Connexion de {$user->Login}", $user);

        $payload = $user->toAuthPayload();
        $payload['societes'] = $user->societesResolved()->map->toNormalized()->values();

        return response()->json(['user' => $payload, 'token' => $token]);
    }

    private function otpKey(RhUser $user): string
    {
        return '2fa:'.$user->getKey();
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $payload = $user->toAuthPayload();
        $payload['societes'] = $user->societesResolved()->map->toNormalized()->values();

        return response()->json($payload);
    }

    public function logout(Request $request)
    {
        AuditLogger::log('logout', "Déconnexion de {$request->user()->Login}", $request->user());
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }
}
