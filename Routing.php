<?php

class Routing {

    public static $routes = [
        "" => ["controller" => "SecurityController", "action" => "login"],
        "login" => ["controller" => "SecurityController", "action" => "login"],
        "logout" => ["controller" => "SecurityController", "action" => "logout"],
        "complete-pseudonym" => ["controller" => "SecurityController", "action" => "completePseudonym"],
        "register" => ["controller" => "SecurityController", "action" => "register"],
        "dashboard" => ["controller" => "DashboardController", "action" => "index"],
        "admin" => ["controller" => "AdminController", "action" => "index"],
        "admin/profile" => ["controller" => "ProfileController", "action" => "index"],
        "dashboard/set-primary-vehicle" => ["controller" => "DashboardController", "action" => "setPrimaryVehicle"],
        "my-cars" => ["controller" => "CarsController", "action" => "index"],
        "my-cars/details" => ["controller" => "CarsController", "action" => "details"],
        "marketplace" => ["controller" => "MarketplaceController", "action" => "index"],
        "community" => ["controller" => "CommunityController", "action" => "index"],
        "profile" => ["controller" => "ProfileController", "action" => "index"],
        "community/profile" => ["controller" => "ProfileController", "action" => "index"],
        "settings" => ["controller" => "SettingsController", "action" => "index"],
        "notifications" => ["controller" => "NotificationController", "action" => "index"],
    ];

    public static function run(string $path) {
        $normalizedPath = trim($path, '/');

        if (str_starts_with($normalizedPath, 'profile/')) {
            $_GET['pseudonym'] = rawurldecode(substr($normalizedPath, strlen('profile/')));
            $normalizedPath = 'profile';
        }

        if (str_starts_with($normalizedPath, 'admin/profile/')) {
            $_GET['pseudonym'] = rawurldecode(substr($normalizedPath, strlen('admin/profile/')));
            $_GET['admin_preview'] = '1';
            $normalizedPath = 'admin/profile';
        }

        if (str_starts_with($normalizedPath, 'my-cars/') && $normalizedPath !== 'my-cars/details') {
            $_GET['slug'] = rawurldecode(substr($normalizedPath, strlen('my-cars/')));
            $normalizedPath = 'my-cars/details';
        }

        if (!array_key_exists($normalizedPath, self::$routes)) {
            self::renderErrorPage(404, '404', '404 - Nie znaleziono strony');
            return;
        }

        try {
            $controller = self::$routes[$normalizedPath]["controller"];
            $action = self::$routes[$normalizedPath]["action"];

            $controllerObj = new $controller();
            if (
                $_SERVER['REQUEST_METHOD'] === 'POST'
                && $controllerObj instanceof AppController
                && (string) ($_POST['action'] ?? '') === 'acknowledge_admin_warning'
            ) {
                $controllerObj->enforceCsrfProtection();
                $controllerObj->handleAcknowledgeAdminWarningAction();
                return;
            }
            if (str_starts_with($normalizedPath, 'admin') && $controllerObj instanceof AppController) {
                $controllerObj->guardAdminRoute();
            }
            if ($_SERVER['REQUEST_METHOD'] === 'POST' && $controllerObj instanceof AppController) {
                $controllerObj->enforceCsrfProtection();
                $controllerObj->guardAdminWarningMutationRoute();
                $controllerObj->guardBlockedUserMutationRoute();
            }
            $controllerObj->$action();
        } catch (Throwable $exception) {
            error_log($exception->__toString());
            self::renderErrorPage(500, '500', '500 - Błąd serwera');
        }
    }

    public static function renderErrorPage(int $statusCode, string $view, string $title): void
    {
        http_response_code($statusCode);
        $styleFiles = ['base.css', 'auth.css'];
        $viewPath = 'public/views/' . $view . '.html';

        echo '<!DOCTYPE html><html lang="pl"><head>';
        include 'public/views/partials/head.php';
        echo '</head><body>';
        include $viewPath;
        echo '</body></html>';
    }
}
