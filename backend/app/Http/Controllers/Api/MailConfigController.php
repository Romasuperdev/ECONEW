<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

/**
 * Configuration e-mail (SMTP) par établissement.
 * Table auxiliaire ECO_MAIL_CONFIG (créée / complétée automatiquement).
 */
class MailConfigController extends Controller
{
    private const TABLE = 'ECO_MAIL_CONFIG';

    private array $map = [
        'enabled' => 'ENABLED',
        'name' => 'NAME',
        'from_name' => 'FROM_NAME',
        'from_email' => 'FROM_EMAIL',
        'provider' => 'PROVIDER',
        'description' => 'DESCRIPTION',
        'is_default' => 'IS_DEFAULT',
        'host' => 'HOST',
        'port' => 'PORT',
        'security' => 'SECURITY',
        'auth' => 'AUTH',
        'username' => 'USERNAME',
        'password' => 'PASSWORD',
        'timeout' => 'TIMEOUT',
        'max_retries' => 'MAX_RETRIES',
        'log_all' => 'LOG_ALL',
        'allow_attachments' => 'ALLOW_ATTACHMENTS',
        'encrypt' => 'ENCRYPT',
        'bcc' => 'BCC',
        'bcc_address' => 'BCC_ADDRESS',
        'reply_to' => 'REPLY_TO',
        'reply_to_address' => 'REPLY_TO_ADDRESS',
        'max_attachments' => 'MAX_ATTACHMENTS',
        'max_attachment_size' => 'MAX_ATTACHMENT_SIZE',
        'retry_auto' => 'RETRY_AUTO',
    ];

    private array $bools = [
        'ENABLED', 'IS_DEFAULT', 'AUTH', 'LOG_ALL', 'ALLOW_ATTACHMENTS',
        'ENCRYPT', 'BCC', 'REPLY_TO', 'RETRY_AUTO',
    ];

    private array $ints = ['PORT', 'TIMEOUT', 'MAX_RETRIES', 'MAX_ATTACHMENTS', 'MAX_ATTACHMENT_SIZE'];

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
                    $t->string('FROM_NAME', 150)->nullable();
                    $t->string('FROM_EMAIL', 150)->nullable();
                    $t->string('PROVIDER', 60)->nullable();
                    $t->string('DESCRIPTION', 255)->nullable();
                    $t->boolean('IS_DEFAULT')->default(0);
                    $t->string('HOST', 150)->nullable();
                    $t->integer('PORT')->nullable();
                    $t->string('SECURITY', 20)->nullable();
                    $t->boolean('AUTH')->default(1);
                    $t->string('USERNAME', 150)->nullable();
                    $t->string('PASSWORD', 255)->nullable();
                    $t->integer('TIMEOUT')->nullable();
                    $t->integer('MAX_RETRIES')->nullable();
                    $t->boolean('LOG_ALL')->default(1);
                    $t->boolean('ALLOW_ATTACHMENTS')->default(1);
                    $t->boolean('ENCRYPT')->default(1);
                    $t->boolean('BCC')->default(0);
                    $t->string('BCC_ADDRESS', 150)->nullable();
                    $t->boolean('REPLY_TO')->default(0);
                    $t->string('REPLY_TO_ADDRESS', 150)->nullable();
                    $t->integer('MAX_ATTACHMENTS')->nullable();
                    $t->integer('MAX_ATTACHMENT_SIZE')->nullable();
                    $t->boolean('RETRY_AUTO')->default(0);
                    $t->dateTime('UPDATED_AT')->nullable();
                });
                return true;
            }
            $existing = array_map('strtoupper', $conn->getColumnListing(self::TABLE));
            $missing = array_diff(array_values($this->map), $existing);
            if (! empty($missing)) {
                $conn->table(self::TABLE, function ($t) use ($missing) {
                    foreach ($missing as $col) {
                        if (in_array($col, $this->bools, true)) {
                            $t->boolean($col)->default(0)->nullable();
                        } elseif (in_array($col, $this->ints, true)) {
                            $t->integer($col)->nullable();
                        } elseif (in_array($col, ['DESCRIPTION'], true)) {
                            $t->string($col, 255)->nullable();
                        } else {
                            $t->string($col, 150)->nullable();
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
        $g = fn ($c) => $r->$c ?? null;
        return [
            'enabled' => (bool) $g('ENABLED'),
            'name' => (string) ($g('NAME') ?? ''),
            'from_name' => (string) ($g('FROM_NAME') ?? ''),
            'from_email' => (string) ($g('FROM_EMAIL') ?? ''),
            'provider' => (string) ($g('PROVIDER') ?? ''),
            'description' => (string) ($g('DESCRIPTION') ?? ''),
            'is_default' => (bool) $g('IS_DEFAULT'),
            'host' => (string) ($g('HOST') ?? ''),
            'port' => (int) ($g('PORT') ?? 587),
            'security' => (string) ($g('SECURITY') ?? 'tls'),
            'auth' => $g('AUTH') === null ? true : (bool) $g('AUTH'),
            'username' => (string) ($g('USERNAME') ?? ''),
            'password' => (string) ($g('PASSWORD') ?? ''),
            'timeout' => (int) ($g('TIMEOUT') ?? 30),
            'max_retries' => (int) ($g('MAX_RETRIES') ?? 3),
            'log_all' => $g('LOG_ALL') === null ? true : (bool) $g('LOG_ALL'),
            'allow_attachments' => $g('ALLOW_ATTACHMENTS') === null ? true : (bool) $g('ALLOW_ATTACHMENTS'),
            'encrypt' => $g('ENCRYPT') === null ? true : (bool) $g('ENCRYPT'),
            'bcc' => (bool) $g('BCC'),
            'bcc_address' => (string) ($g('BCC_ADDRESS') ?? ''),
            'reply_to' => (bool) $g('REPLY_TO'),
            'reply_to_address' => (string) ($g('REPLY_TO_ADDRESS') ?? ''),
            'max_attachments' => (int) ($g('MAX_ATTACHMENTS') ?? 5),
            'max_attachment_size' => (int) ($g('MAX_ATTACHMENT_SIZE') ?? 10),
            'retry_auto' => (bool) $g('RETRY_AUTO'),
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
            'from_name' => ['nullable', 'string', 'max:150'],
            'from_email' => ['nullable', 'string', 'max:150'],
            'provider' => ['nullable', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:255'],
            'is_default' => ['nullable', 'boolean'],
            'host' => ['nullable', 'string', 'max:150'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'security' => ['nullable', 'string', 'max:20'],
            'auth' => ['nullable', 'boolean'],
            'username' => ['nullable', 'string', 'max:150'],
            'password' => ['nullable', 'string', 'max:255'],
            'timeout' => ['nullable', 'integer', 'min:1', 'max:300'],
            'max_retries' => ['nullable', 'integer', 'min:0', 'max:10'],
            'log_all' => ['nullable', 'boolean'],
            'allow_attachments' => ['nullable', 'boolean'],
            'encrypt' => ['nullable', 'boolean'],
            'bcc' => ['nullable', 'boolean'],
            'bcc_address' => ['nullable', 'string', 'max:150'],
            'reply_to' => ['nullable', 'boolean'],
            'reply_to_address' => ['nullable', 'string', 'max:150'],
            'max_attachments' => ['nullable', 'integer', 'min:0', 'max:50'],
            'max_attachment_size' => ['nullable', 'integer', 'min:1', 'max:100'],
            'retry_auto' => ['nullable', 'boolean'],
        ];
    }

    public function update(Request $request)
    {
        $data = $request->validate($this->rules());

        if (! $this->ensure()) {
            return response()->json(['message' => 'La configuration e-mail est momentanément indisponible. Réessayez dans un instant.'], 422);
        }

        $cols = $this->cols();
        $payload = [
            'CODESOCIETE' => SocieteContext::current(),
            'CODEETABLISSEMENT' => EtablissementContext::current(),
        ];
        foreach ($this->map as $key => $col) {
            if (! in_array($col, $cols, true)) {
                continue;
            }
            $val = $data[$key] ?? null;
            if (in_array($col, $this->bools, true)) {
                $payload[$col] = ! empty($val) ? 1 : 0;
            } elseif (in_array($col, $this->ints, true)) {
                $payload[$col] = ($val !== null && $val !== '') ? (int) $val : null;
            } else {
                $payload[$col] = ($val !== '') ? $val : null;
            }
        }
        if (in_array('UPDATED_AT', $cols, true)) {
            $payload['UPDATED_AT'] = now();
        }

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

        AuditLogger::log('update', 'Configuration e-mail (SMTP) mise à jour');

        return $this->show();
    }

    /** Test de connexion au serveur SMTP (ouverture de socket). */
    public function test(Request $request)
    {
        $data = $request->validate($this->rules());
        $host = trim((string) ($data['host'] ?? ''));
        $port = (int) ($data['port'] ?? 0);

        if ($host === '' || $port <= 0) {
            return response()->json([
                'ok' => false,
                'title' => 'Paramètres incomplets',
                'message' => "Renseignez le serveur SMTP et le port avant de tester la connexion.",
            ]);
        }

        $timeout = max(3, min((int) ($data['timeout'] ?? 15), 30));
        $security = strtolower((string) ($data['security'] ?? ''));
        $target = ($security === 'ssl') ? "ssl://{$host}" : $host;

        $errno = 0; $errstr = '';
        $fp = @fsockopen($target, $port, $errno, $errstr, $timeout);
        if ($fp) {
            fclose($fp);
            return response()->json([
                'ok' => true,
                'title' => 'Connexion réussie',
                'message' => "Le serveur {$host} répond sur le port {$port}. Vos paramètres réseau sont corrects.",
            ]);
        }

        return response()->json([
            'ok' => false,
            'title' => 'Impossible de se connecter',
            'message' => "Le serveur {$host} n'a pas répondu sur le port {$port}. Vérifiez le serveur, le port et le type de sécurité.",
        ]);
    }

    /** Envoi d'un e-mail de test avec les paramètres saisis. */
    public function sendTest(Request $request)
    {
        $data = $request->validate($this->rules() + [
            'recipient' => ['required', 'email'],
        ]);

        $host = trim((string) ($data['host'] ?? ''));
        $port = (int) ($data['port'] ?? 0);
        $from = trim((string) ($data['from_email'] ?? ''));

        if ($host === '' || $port <= 0 || $from === '') {
            return response()->json([
                'ok' => false,
                'title' => 'Configuration incomplète',
                'message' => "Renseignez le serveur, le port et l'adresse d'envoi avant d'envoyer un e-mail de test.",
            ]);
        }

        $security = strtolower((string) ($data['security'] ?? 'tls'));
        $scheme = in_array($security, ['ssl', 'tls', 'starttls'], true)
            ? ($security === 'ssl' ? 'smtps' : 'smtp')
            : 'smtp';
        $encryption = $security === 'none' ? null : ($security === 'ssl' ? 'ssl' : 'tls');

        // Mailer transitoire construit à partir des paramètres saisis.
        config([
            'mail.mailers.eco_test' => [
                'transport' => 'smtp',
                'scheme' => $scheme,
                'host' => $host,
                'port' => $port,
                'encryption' => $encryption,
                'username' => ! empty($data['auth']) ? ($data['username'] ?? null) : null,
                'password' => ! empty($data['auth']) ? ($data['password'] ?? null) : null,
                'timeout' => max(3, min((int) ($data['timeout'] ?? 30), 60)),
            ],
        ]);

        try {
            Mail::mailer('eco_test')->raw(
                "Ceci est un e-mail de test envoyé depuis Nexora Economat.\n\n"
                ."Si vous recevez ce message, votre configuration SMTP fonctionne correctement.",
                function ($m) use ($data) {
                    $m->from($data['from_email'], $data['from_name'] ?? null);
                    $m->to($data['recipient']);
                    $m->subject('Test de configuration e-mail — Nexora Economat');
                    if (! empty($data['reply_to']) && ! empty($data['reply_to_address'])) {
                        $m->replyTo($data['reply_to_address']);
                    }
                    if (! empty($data['bcc']) && ! empty($data['bcc_address'])) {
                        $m->bcc($data['bcc_address']);
                    }
                }
            );
        } catch (\Throwable $e) {
            $msg = "L'e-mail n'a pas pu être envoyé. Vérifiez l'adresse d'envoi, l'identifiant et le mot de passe.";
            $low = strtolower($e->getMessage());
            if (str_contains($low, 'auth')) {
                $msg = "Authentification refusée. Vérifiez l'identifiant et le mot de passe du compte d'envoi.";
            } elseif (str_contains($low, 'connect') || str_contains($low, 'timed out') || str_contains($low, 'timeout')) {
                $msg = "Le serveur n'a pas répondu. Vérifiez le serveur SMTP, le port et le type de sécurité.";
            }
            return response()->json(['ok' => false, 'title' => "Échec de l'envoi", 'message' => $msg]);
        }

        AuditLogger::log('create', "Envoi e-mail de test vers {$data['recipient']}");

        return response()->json([
            'ok' => true,
            'title' => 'E-mail envoyé avec succès',
            'message' => "Un message de test a été envoyé à {$data['recipient']}. Vérifiez la boîte de réception.",
        ]);
    }
}
