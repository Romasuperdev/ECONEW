<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

/**
 * Configuration de la passerelle SMS par établissement.
 * Stockée dans une table auxiliaire ECO_SMS_CONFIG (créée / complétée automatiquement).
 */
class SmsConfigController extends Controller
{
    private const TABLE = 'ECO_SMS_CONFIG';

    /** Correspondance clé front -> colonne SQL. */
    private array $map = [
        'enabled' => 'ENABLED',
        'name' => 'NAME',
        'provider' => 'PROVIDER',
        'description' => 'DESCRIPTION',
        'country' => 'COUNTRY',
        'timezone' => 'TIMEZONE',
        'environment' => 'ENVIRONMENT',
        'is_default' => 'IS_DEFAULT',
        'api_url' => 'API_URL',
        'login' => 'LOGIN',
        'password' => 'PASSWORD',
        'api_key' => 'API_KEY',
        'secret_key' => 'SECRET_KEY',
        'sender_id' => 'SENDER_ID',
        'timeout' => 'TIMEOUT',
        'encoding' => 'ENCODING',
        'api_version' => 'API_VERSION',
        'delivery_reports' => 'DELIVERY_REPORTS',
        'unicode' => 'UNICODE',
        'long_sms' => 'LONG_SMS',
        'split_auto' => 'SPLIT_AUTO',
        'retry' => 'RETRY',
        'log_all' => 'LOG_ALL',
        'campaigns' => 'CAMPAIGNS',
    ];

    /** Colonnes booléennes (0/1). */
    private array $bools = [
        'ENABLED', 'IS_DEFAULT', 'DELIVERY_REPORTS', 'UNICODE', 'LONG_SMS',
        'SPLIT_AUTO', 'RETRY', 'LOG_ALL', 'CAMPAIGNS',
    ];

    private function ensure(): bool
    {
        try {
            $conn = Schema::connection('economat');
            if (! $conn->hasTable(self::TABLE)) {
                $conn->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                    $t->boolean('ENABLED')->default(0);
                    $t->string('NAME', 150)->nullable();
                    $t->string('PROVIDER', 100)->nullable();
                    $t->string('DESCRIPTION', 255)->nullable();
                    $t->string('COUNTRY', 80)->nullable();
                    $t->string('TIMEZONE', 80)->nullable();
                    $t->string('ENVIRONMENT', 20)->default('test');
                    $t->boolean('IS_DEFAULT')->default(0);
                    $t->string('API_URL', 255)->nullable();
                    $t->string('LOGIN', 150)->nullable();
                    $t->string('PASSWORD', 255)->nullable();
                    $t->string('API_KEY', 255)->nullable();
                    $t->string('SECRET_KEY', 255)->nullable();
                    $t->string('SENDER_ID', 50)->nullable();
                    $t->integer('TIMEOUT')->nullable();
                    $t->string('ENCODING', 30)->nullable();
                    $t->string('API_VERSION', 30)->nullable();
                    $t->boolean('DELIVERY_REPORTS')->default(0);
                    $t->boolean('UNICODE')->default(0);
                    $t->boolean('LONG_SMS')->default(0);
                    $t->boolean('SPLIT_AUTO')->default(0);
                    $t->boolean('RETRY')->default(0);
                    $t->boolean('LOG_ALL')->default(0);
                    $t->boolean('CAMPAIGNS')->default(0);
                    $t->dateTime('UPDATED_AT')->nullable();
                });
                return true;
            }
            // Table déjà présente : on ajoute les colonnes manquantes (migration douce).
            $existing = array_map('strtoupper', $conn->getColumnListing(self::TABLE));
            $missing = array_diff(array_values($this->map), $existing);
            if (! empty($missing)) {
                $conn->table(self::TABLE, function ($t) use ($missing) {
                    foreach ($missing as $colUpper) {
                        if (in_array($colUpper, $this->bools, true)) {
                            $t->boolean($colUpper)->default(0)->nullable();
                        } elseif ($colUpper === 'TIMEOUT') {
                            $t->integer($colUpper)->nullable();
                        } elseif (in_array($colUpper, ['DESCRIPTION', 'API_URL'], true)) {
                            $t->string($colUpper, 255)->nullable();
                        } else {
                            $t->string($colUpper, 150)->nullable();
                        }
                    }
                });
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function cols(): array
    {
        try {
            return array_map('strtoupper', Schema::connection('economat')->getColumnListing(self::TABLE));
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function row()
    {
        if (! $this->ensure()) {
            return null;
        }
        try {
            return DB::connection('economat')->table(self::TABLE)
                ->where('CODESOCIETE', SocieteContext::current())
                ->where('CODEETABLISSEMENT', EtablissementContext::current())
                ->first();
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function normalize($r): array
    {
        $g = fn ($col) => $r->$col ?? null;
        return [
            'enabled' => (bool) ($g('ENABLED')),
            'name' => (string) ($g('NAME') ?? ''),
            'provider' => (string) ($g('PROVIDER') ?? ''),
            'description' => (string) ($g('DESCRIPTION') ?? ''),
            'country' => (string) ($g('COUNTRY') ?? ''),
            'timezone' => (string) ($g('TIMEZONE') ?? 'Africa/Abidjan'),
            'environment' => (string) ($g('ENVIRONMENT') ?? 'test'),
            'is_default' => (bool) ($g('IS_DEFAULT')),
            'api_url' => (string) ($g('API_URL') ?? ''),
            'login' => (string) ($g('LOGIN') ?? ''),
            'password' => (string) ($g('PASSWORD') ?? ''),
            'api_key' => (string) ($g('API_KEY') ?? ''),
            'secret_key' => (string) ($g('SECRET_KEY') ?? ''),
            'sender_id' => (string) ($g('SENDER_ID') ?? ''),
            'timeout' => (int) ($g('TIMEOUT') ?? 30),
            'encoding' => (string) ($g('ENCODING') ?? 'GSM7'),
            'api_version' => (string) ($g('API_VERSION') ?? 'v1'),
            'delivery_reports' => (bool) ($g('DELIVERY_REPORTS')),
            'unicode' => (bool) ($g('UNICODE')),
            'long_sms' => (bool) ($g('LONG_SMS')),
            'split_auto' => (bool) ($g('SPLIT_AUTO')),
            'retry' => (bool) ($g('RETRY')),
            'log_all' => (bool) ($g('LOG_ALL')),
            'campaigns' => (bool) ($g('CAMPAIGNS')),
        ];
    }

    public function show()
    {
        $r = $this->row();
        return response()->json($this->normalize($r ?: (object) []));
    }

    private function rules(): array
    {
        return [
            'enabled' => ['nullable', 'boolean'],
            'name' => ['nullable', 'string', 'max:150'],
            'provider' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:80'],
            'timezone' => ['nullable', 'string', 'max:80'],
            'environment' => ['nullable', 'string', 'max:20'],
            'is_default' => ['nullable', 'boolean'],
            'api_url' => ['nullable', 'string', 'max:255'],
            'login' => ['nullable', 'string', 'max:150'],
            'password' => ['nullable', 'string', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:255'],
            'secret_key' => ['nullable', 'string', 'max:255'],
            'sender_id' => ['nullable', 'string', 'max:50'],
            'timeout' => ['nullable', 'integer', 'min:1', 'max:300'],
            'encoding' => ['nullable', 'string', 'max:30'],
            'api_version' => ['nullable', 'string', 'max:30'],
            'delivery_reports' => ['nullable', 'boolean'],
            'unicode' => ['nullable', 'boolean'],
            'long_sms' => ['nullable', 'boolean'],
            'split_auto' => ['nullable', 'boolean'],
            'retry' => ['nullable', 'boolean'],
            'log_all' => ['nullable', 'boolean'],
            'campaigns' => ['nullable', 'boolean'],
        ];
    }

    public function update(Request $request)
    {
        $data = $request->validate($this->rules());

        if (! $this->ensure()) {
            return response()->json(['message' => 'La configuration SMS est momentanément indisponible. Réessayez dans un instant.'], 422);
        }

        $cols = $this->cols();
        $payload = [
            'CODESOCIETE' => SocieteContext::current(),
            'CODEETABLISSEMENT' => EtablissementContext::current(),
        ];
        foreach ($this->map as $key => $col) {
            if (! in_array($col, $cols, true)) {
                continue; // colonne absente : on ignore proprement
            }
            $val = $data[$key] ?? null;
            if (in_array($col, $this->bools, true)) {
                $payload[$col] = ! empty($val) ? 1 : 0;
            } elseif ($col === 'TIMEOUT') {
                $payload[$col] = $val !== null && $val !== '' ? (int) $val : null;
            } else {
                $payload[$col] = $val !== '' ? $val : null;
            }
        }
        if (in_array('UPDATED_AT', $cols, true)) {
            $payload['UPDATED_AT'] = now();
        }

        // Une seule configuration par défaut par établissement.
        try {
            if (in_array('IS_DEFAULT', $cols, true) && ! empty($data['is_default'])) {
                DB::connection('economat')->table(self::TABLE)
                    ->where('CODESOCIETE', $payload['CODESOCIETE'])
                    ->where('CODEETABLISSEMENT', $payload['CODEETABLISSEMENT'])
                    ->update(['IS_DEFAULT' => 0]);
            }
            $exists = DB::connection('economat')->table(self::TABLE)
                ->where('CODESOCIETE', $payload['CODESOCIETE'])
                ->where('CODEETABLISSEMENT', $payload['CODEETABLISSEMENT'])
                ->exists();
            if ($exists) {
                DB::connection('economat')->table(self::TABLE)
                    ->where('CODESOCIETE', $payload['CODESOCIETE'])
                    ->where('CODEETABLISSEMENT', $payload['CODEETABLISSEMENT'])
                    ->update($payload);
            } else {
                DB::connection('economat')->table(self::TABLE)->insert($payload);
            }
        } catch (\Throwable $e) {
            return response()->json(['message' => "L'enregistrement n'a pas abouti. Vérifiez les informations saisies puis réessayez."], 422);
        }

        AuditLogger::log('update', 'Configuration SMS mise à jour');

        return $this->show();
    }

    /**
     * Test de connexion à la passerelle SMS.
     * Renvoie des messages clairs, jamais d'erreur technique brute.
     */
    public function test(Request $request)
    {
        $data = $request->validate($this->rules());

        $url = trim((string) ($data['api_url'] ?? ''));
        if ($url === '') {
            return response()->json([
                'ok' => false,
                'title' => 'URL manquante',
                'message' => "Renseignez l'URL de l'API de votre fournisseur pour tester la connexion.",
            ], 200);
        }
        if (! preg_match('#^https?://#i', $url)) {
            return response()->json([
                'ok' => false,
                'title' => 'Adresse invalide',
                'message' => "L'URL doit commencer par http:// ou https://.",
            ], 200);
        }

        $timeout = (int) ($data['timeout'] ?? 15);
        $timeout = max(3, min($timeout, 30));

        try {
            $resp = Http::timeout($timeout)->connectTimeout(min($timeout, 10))
                ->withoutRedirecting()
                ->get($url);
            // Toute réponse HTTP prouve que la passerelle est joignable.
            return response()->json([
                'ok' => true,
                'title' => 'Connexion réussie',
                'message' => "La passerelle a répondu (code {$resp->status()}). Vos paramètres réseau sont corrects.",
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return response()->json([
                'ok' => false,
                'title' => 'Impossible de se connecter',
                'message' => "La passerelle n'a pas répondu à temps. Vérifiez l'URL et votre connexion Internet, puis réessayez.",
            ], 200);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'title' => 'Test impossible',
                'message' => "La connexion n'a pas pu être vérifiée. Contrôlez l'URL de l'API et les paramètres réseau.",
            ], 200);
        }
    }
}
