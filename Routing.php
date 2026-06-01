<?php

class Routing {

    public static $routes = [
        "" => ["controller" => "SecurityController", "action" => "login"],
        "login" => ["controller" => "SecurityController", "action" => "login"],
        "logout" => ["controller" => "SecurityController", "action" => "logout"],
        "complete-pseudonym" => ["controller" => "SecurityController", "action" => "completePseudonym"],
        "register" => ["controller" => "SecurityController", "action" => "register"],
        "dashboard" => ["controller" => "DashboardController", "action" => "index"],
        "dashboard/set-primary-vehicle" => ["controller" => "DashboardController", "action" => "setPrimaryVehicle"],
        "my-cars" => ["controller" => "CarsController", "action" => "index"],
        "my-cars/details" => ["controller" => "CarsController", "action" => "details"],
        "marketplace" => ["controller" => "MarketplaceController", "action" => "index"],
        "community" => ["controller" => "CommunityController", "action" => "index"],
        "profile" => ["controller" => "CommunityController", "action" => "profile"],
        "community/profile" => ["controller" => "CommunityController", "action" => "profile"],
        "settings" => ["controller" => "SettingsController", "action" => "index"],
    ];

    public static function run(string $path) {
        $normalizedPath = trim($path, '/');

        if (str_starts_with($normalizedPath, 'profile/')) {
            $_GET['pseudonym'] = rawurldecode(substr($normalizedPath, strlen('profile/')));
            $normalizedPath = 'profile';
        }

        if (str_starts_with($normalizedPath, 'my-cars/') && $normalizedPath !== 'my-cars/details') {
            $_GET['slug'] = rawurldecode(substr($normalizedPath, strlen('my-cars/')));
            $normalizedPath = 'my-cars/details';
        }

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
