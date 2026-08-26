@echo off
REM Lance le serveur de dev Laravel avec PHP 8.2 (celui du projet), sans dependre du PHP par defaut du PATH.
"C:\wamp64\bin\php\php8.2.29\php.exe" "%~dp0artisan" serve --host=127.0.0.1 --port=8000
