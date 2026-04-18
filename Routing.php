<?php

require_once 'src/controllers/AppController.php';
require_once 'src/controllers/SecurityController.php';
require_once 'src/controllers/DashboardController.php';
require_once 'src/controllers/CarsController.php';
require_once 'src/controllers/MarketplaceController.php';
require_once 'src/controllers/CommunityController.php';
require_once 'src/controllers/SettingsController.php';

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
            include 'public/views/partials/head.html';
            include 'public/views/partials/navi.html';
            include 'public/views/404.html';
            echo '</body></html>';
            return;
        }

        $controller = self::$routes[$normalizedPath]["controller"];
        $action = self::$routes[$normalizedPath]["action"];

        $controllerObj = new $controller();
        $controllerObj->$action();
    }
}
