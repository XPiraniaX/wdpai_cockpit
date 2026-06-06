<?php

class AppController
{
    protected function getCurrentUserId(): int
    {
        $sessionUserId = $_SESSION['auth_user_id'] ?? null;

        if (filter_var($sessionUserId, FILTER_VALIDATE_INT) !== false && (int) $sessionUserId > 0) {
            return (int) $sessionUserId;
        }

        $requestedUserId = $_GET['user'] ?? $_POST['user'] ?? 1;

        if (filter_var($requestedUserId, FILTER_VALIDATE_INT) === false) {
            return 1;
        }

        return max(1, (int) $requestedUserId);
    }

    protected function redirect(string $path): void
    {
        header('Location: ' . $path);
        exit;
    }

    protected function jsonResponse(array $payload, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    protected function isGet(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'GET';
    }

    protected function isPost(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'POST';
    }

    protected function isAjaxRequest(): bool
    {
        return strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) === 'xmlhttprequest';
    }

    protected function render(string $template, array $variables = []): void
    {
        $templatePath = 'public/views/' . $template . '.html';
        $viewPath = file_exists($templatePath) ? $templatePath : 'public/views/404.html';
        $currentUserId = $this->getCurrentUserId();
        $currentUser = $this->resolveCurrentUser($currentUserId);
        $notificationUnreadCount = $this->isAuthenticated()
            ? $this->resolveNotificationUnreadCount($currentUserId)
            : 0;
        $requiresPseudonymSetup = $this->isAuthenticated()
            && trim((string) ($currentUser['pseudonym'] ?? '')) === '';
        $flash = $this->consumeFlash();
        $styleFiles = [
            'base.css',
            'layout.css',
            'navi.css',
            'header.css',
            'dashboard.css',
            'community.css',
            'my_cars.css',
            'settings.css',
            'vehicle_details.css',
        ];
        extract($variables);

        $scriptFiles = $variables['scriptFiles'] ?? [];
        if ($this->isAuthenticated()) {
            $scriptFiles[] = 'notifications.js';
            $scriptFiles = array_values(array_unique($scriptFiles));
        }

        ob_start();
        include $viewPath;
        $content = ob_get_clean();

        include 'public/views/partials/layout.php';
    }

    protected function renderAuth(string $view, array $variables = []): void
    {
        $templatePath = 'public/views/' . $view . '.html';
        $styleFiles = [
            'base.css',
            'auth.css',
        ];
        $flash = $this->consumeFlash();

        extract($variables);

        ob_start();
        include $templatePath;
        $content = ob_get_clean();

        include 'public/views/partials/auth_layout.php';
    }

    protected function isAuthenticated(): bool
    {
        return filter_var($_SESSION['auth_user_id'] ?? null, FILTER_VALIDATE_INT) !== false
            && (int) $_SESSION['auth_user_id'] > 0;
    }

    protected function requireAuthentication(): void
    {
        if ($this->isAuthenticated()) {
            return;
        }

        $this->setFlash('error', 'Zaloguj się, aby przejść dalej.');
        $this->redirect('/login');
    }

    protected function redirectIfAuthenticated(string $path = '/dashboard'): void
    {
        if ($this->isAuthenticated()) {
            $this->redirect($path);
        }
    }

    protected function loginUser(int $userId): void
    {
        session_regenerate_id(true);
        $_SESSION['auth_user_id'] = $userId;
    }

    protected function logoutUser(): void
    {
        unset($_SESSION['auth_user_id']);
        session_regenerate_id(true);
    }

    protected function setFlash(string $type, string $message): void
    {
        $_SESSION['flash'] = [
            'type' => $type,
            'message' => $message,
        ];
    }

    protected function consumeFlash(): ?array
    {
        $flash = $_SESSION['flash'] ?? null;
        unset($_SESSION['flash']);

        return $flash;
    }

    protected function getBodyTypeOptions(): array
    {
        return [
            'hatchback' => 'Hatchback',
            'sedan' => 'Sedan',
            'kombi' => 'Kombi',
            'suv' => 'SUV',
            'coupe' => 'Coupe',
            'cabrio' => 'Cabrio',
            'liftback' => 'Liftback',
            'van' => 'Van',
            'pickup' => 'Pickup',
            'other' => 'Inny',
        ];
    }

    protected function getVehicleFuelTypeOptions(): array
    {
        return [
            'petrol' => 'Benzyna',
            'diesel' => 'Diesel',
            'hybrid' => 'Hybryda',
            'plug_in_hybrid' => 'Plug-in Hybrid',
            'electric' => 'Elektryczny',
            'lpg' => 'LPG',
            'cng' => 'CNG',
            'other' => 'Inne',
        ];
    }

    protected function getTransmissionOptions(): array
    {
        return [
            'manual' => 'Manualna',
            'automatic' => 'Automatyczna',
            'semi_automatic' => 'Półautomatyczna',
        ];
    }

    protected function getDrivetrainOptions(): array
    {
        return [
            'fwd' => 'FWD',
            'rwd' => 'RWD',
            'awd' => 'AWD',
            '4x4' => '4x4',
        ];
    }

    protected function slugify(string $value): string
    {
        $normalized = trim($value);
        if ($normalized === '') {
            return '';
        }

        $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        if ($transliterated !== false && $transliterated !== '') {
            $normalized = $transliterated;
        }

        $normalized = strtolower($normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';
        $normalized = trim($normalized, '-');

        return $normalized;
    }

    protected function buildVehicleDetailsPath(int|string|null $vehicleId, ?string $displayName, ?string $modal = null): ?string
    {
        if (filter_var($vehicleId, FILTER_VALIDATE_INT) === false || (int) $vehicleId <= 0) {
            return null;
        }

        $slug = $this->slugify((string) ($displayName ?? ''));
        if ($slug === '') {
            $slug = 'pojazd-' . (int) $vehicleId;
        }

        $path = '/my-cars/' . (int) $vehicleId . rawurlencode($slug);
        if ($modal !== null && $modal !== '') {
            $path .= '?open_modal=' . rawurlencode($modal);
        }

        return $path;
    }

    private function resolveCurrentUser(int $userId): array
    {
        $fallbackUser = [
            'id' => $userId,
            'full_name' => 'Użytkownik testowy',
            'pseudonym' => null,
            'avatar_path' => null,
            'membership_tier' => 'free',
        ];

        try {
            $repository = new UserRepository(Database::getConnection());
            $user = $repository->getById($userId);

            return $user ?: $fallbackUser;
        } catch (Throwable) {
            return $fallbackUser;
        }
    }

    private function resolveNotificationUnreadCount(int $userId): int
    {
        try {
            $repository = new NotificationRepository(Database::getConnection());
            $repository->syncUserNotifications($userId);

            return $repository->getUnreadCount($userId);
        } catch (Throwable) {
            return 0;
        }
    }
}
