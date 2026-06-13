<?php

require_once __DIR__ . '/../src/config/Database.php';

spl_autoload_register(static function (string $class): void {
    $directories = [
        __DIR__ . '/../src/config',
        __DIR__ . '/../src/controllers',
        __DIR__ . '/../src/repositories',
    ];

    foreach ($directories as $directory) {
        $path = $directory . DIRECTORY_SEPARATOR . $class . '.php';
        if (is_file($path)) {
            require_once $path;
            return;
        }
    }
});
