<?php

class Routing {

    public static $routes = [
        "" => ["controller" => "SecurityController", "action" => "login"],
        "login" => ["controller" => "SecurityController", "action" => "login"],
        "register" => ["controller" => "SecurityController", "action" => "register"],
        "dashboard" => ["controller" => "DashboardController", "action" => "index"],
        "my-cars" => ["controller" => "CarsController", "action" => "index"],
        "marketplace" => ["controller" => "MarketplaceController", "action" => "index"],
        "community" => ["controller" => "CommunityController", "action" => "index"],
        "settings" => ["controller" => "SettingsController", "action" => "index"],
    ];

    public static function run(string $path) {
        $normalizedPath = trim($path, '/');

        if (!array_key_exists($normalizedPath, self::$routes)) {
            http_response_code(404);
            $title = '404 - Not Found';
            ob_start();
            include 'public/views/404.html';
            $content = ob_get_clean();
            include 'public/views/partials/layout.php';
            return;
        }

        $controller = self::$routes[$normalizedPath]["controller"];
        $action = self::$routes[$normalizedPath]["action"];

        $controllerObj = new $controller();
        $controllerObj->$action();
    }
}
