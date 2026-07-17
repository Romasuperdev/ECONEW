<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make('Illuminate\Contracts\Console\Kernel');
$kernel->bootstrap();

$user = App\Models\RhUser::where('Login', 'demo')->first();
if ($user) {
    // Generate new token
    $token = $user->createToken('api')->plainTextToken;
    echo 'Token: ' . $token . PHP_EOL;
    
    // Test retrieving the user by token
    $currentToken = $user->currentAccessToken();
    echo 'Current Token ID: ' . ($currentToken ? $currentToken->id : 'null') . PHP_EOL;
    
    // Test /me endpoint
    echo 'User Auth Payload:' . PHP_EOL;
    echo json_encode($user->toAuthPayload(), JSON_PRETTY_PRINT) . PHP_EOL;
} else {
    echo 'Demo user not found' . PHP_EOL;
}
