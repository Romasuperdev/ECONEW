<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

$hashedPwd = \Illuminate\Support\Facades\Hash::make('password');
$user = \App\Models\RhUser::where('Login', 'demo')->first();
if ($user) {
    $user->update(['MotDePasse' => $hashedPwd]);
    echo 'Updated demo user (demo@economat.app)' . PHP_EOL;
} else {
    \App\Models\RhUser::create([
        'Login' => 'demo',
        'Email' => 'demo@economat.app',
        'MotDePasse' => $hashedPwd,
        'Nom' => 'Demo',
        'Prenom' => 'User',
        'Supprimer' => false
    ]);
    echo 'Created demo user (demo@economat.app)' . PHP_EOL;
}

echo 'Password: password' . PHP_EOL;
