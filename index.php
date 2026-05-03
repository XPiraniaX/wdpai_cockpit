<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

spl_autoload_register(function ($class) {
    $directories = [
        'src/config',
        'src/controllers',
        'src/repositories',
    ];

    foreach ($directories as $directory) {
        $path = $directory . '/' . $class . '.php';

        if (file_exists($path)) {
            require_once $path;
            return;
        }
    }
});

require_once 'Routing.php';

$path = trim($_SERVER['REQUEST_URI'], '/');
$path = parse_url($path, PHP_URL_PATH);

Routing::run($path);
