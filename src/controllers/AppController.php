<?php

class AppController
{
    private bool $banStateSynchronized = false;

    public function enforceCsrfProtection(): void
    {
        if (!$this->isPost()) {
            return;
        }

        $token = (string) ($_POST['_csrf'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if ($token !== '' && hash_equals($this->getCsrfToken(), $token)) {
            return;
        }

        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Sesja formularza wygasła. Odśwież stronę i spróbuj ponownie.',
            ], 403);
        }

        $this->setFlash('error', 'Sesja formularza wygasła. Odśwież stronę i spróbuj ponownie.');
        $this->redirect($this->sanitizeBackRedirect((string) ($_SERVER['HTTP_REFERER'] ?? '/login')));
    }

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
        $this->synchronizeUserBanState();

        $templatePath = 'public/views/' . $template . '.html';
        $viewPath = file_exists($templatePath) ? $templatePath : 'public/views/404.html';
        $currentUserId = $this->getCurrentUserId();
        $currentUser = $this->resolveCurrentUser($currentUserId);
        if ($this->isAuthenticated()) {
            $noticeRepository = new UserRepository(Database::getConnection());
            $pendingAdminNotice = $noticeRepository->getPendingAdminUserNotice($currentUserId);
            if ($pendingAdminNotice !== null) {
                $currentUser['pending_admin_notice_id'] = (int) ($pendingAdminNotice['id'] ?? 0);
                $currentUser['pending_admin_notice_type'] = (string) ($pendingAdminNotice['notice_type'] ?? '');
                $currentUser['pending_admin_notice_title'] = (string) ($pendingAdminNotice['title'] ?? '');
                $currentUser['pending_admin_notice_message'] = (string) ($pendingAdminNotice['message'] ?? '');
                $currentUser['admin_warning_message'] = (string) ($pendingAdminNotice['message'] ?? '');
            }
        }
        $notificationUnreadCount = $this->isAuthenticated()
            ? $this->resolveNotificationUnreadCount($currentUserId)
            : 0;
        $csrfToken = $this->getCsrfToken();
        $requiresPseudonymSetup = $this->isAuthenticated()
            && trim((string) ($currentUser['pseudonym'] ?? '')) === '';
        $requiresAdminWarningLock = $this->isAuthenticated()
            && (
                trim((string) ($currentUser['pending_admin_notice_message'] ?? '')) !== ''
                || trim((string) ($currentUser['admin_warning_message'] ?? '')) !== ''
            );
        $requiresBanLock = $this->isAuthenticated()
            && !empty($currentUser['is_currently_banned'])
            && !$requiresAdminWarningLock;
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
        $this->synchronizeUserBanState();

        $templatePath = 'public/views/' . $view . '.html';
        $styleFiles = [
            'base.css',
            'auth.css',
        ];
        $flash = $this->consumeFlash();
        $csrfToken = $this->getCsrfToken();

        extract($variables);

        $scriptFiles = $variables['scriptFiles'] ?? [];

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
        $this->synchronizeUserBanState();

        if ($this->isAuthenticated()) {
            return;
        }

        $this->setFlash('error', 'Zaloguj się, aby przejść dalej.');
        $this->redirect('/login');
    }

    protected function isAdmin(): bool
    {
        $this->synchronizeUserBanState();

        if (!$this->isAuthenticated()) {
            return false;
        }

        $currentUser = $this->getCurrentUserState();
        return (string) ($currentUser['role'] ?? 'user') === 'admin';
    }

    protected function requireAdmin(): void
    {
        $this->guardAdminRoute();
    }

    public function guardAdminRoute(): void
    {
        if ($this->isAuthenticated() && $this->isAdmin()) {
            return;
        }

        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono strony.',
            ], 404);
        }

        http_response_code(404);
        $this->render('404', [
            'title' => '404 - Nie znaleziono strony',
        ]);
        exit;
    }

    public function guardBlockedUserMutationRoute(): void
    {
        if (!$this->isAuthenticated()) {
            return;
        }

        $currentUser = $this->getCurrentUserState();
        if (empty($currentUser['is_currently_banned'])) {
            return;
        }

        $message = 'Konto jest zablokowane. Ta akcja jest obecnie niedostępna.';
        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => false,
                'message' => $message,
            ], 423);
        }

        $this->setFlash('error', $message);
        $this->redirect('/dashboard');
    }

    public function guardAdminWarningMutationRoute(): void
    {
        if (!$this->isAuthenticated()) {
            return;
        }

        $repository = new UserRepository(Database::getConnection());
        $pendingNotice = $repository->getPendingAdminUserNotice($this->getCurrentUserId());
        $currentUser = $this->resolveCurrentUser($this->getCurrentUserId());
        if ($pendingNotice === null && trim((string) ($currentUser['admin_warning_message'] ?? '')) === '') {
            return;
        }

        $message = 'Masz aktywne ostrzeżenie administratora. Potwierdź komunikat, aby kontynuować.';
        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => false,
                'message' => $message,
            ], 423);
        }

        $this->setFlash('error', $message);
        $this->redirect('/dashboard');
    }

    public function handleAcknowledgeAdminWarningAction(): void
    {
        $this->requireAuthentication();

        $repository = new UserRepository(Database::getConnection());
        $repository->clearAdminWarning($this->getCurrentUserId());

        $redirectTo = $this->sanitizeBackRedirect((string) ($_POST['redirect_to'] ?? '/dashboard'));
        $this->redirect($redirectTo);
    }

    protected function redirectIfAuthenticated(string $path = '/dashboard'): void
    {
        $this->synchronizeUserBanState();

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

    protected function normalizeModerationReason(mixed $value): string
    {
        $normalized = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
        if ($normalized === '') {
            return '';
        }

        return mb_substr($normalized, 0, 800);
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

    protected function validatePasswordStrength(string $password, string $subject = 'Hasło'): ?string
    {
        if ($password === '') {
            return $subject . ' jest wymagane.';
        }

        if (strlen($password) < 8) {
            return $subject . ' musi mieć co najmniej 8 znaków.';
        }

        if (strlen($password) > 255) {
            return $subject . ' jest zbyt długie.';
        }

        $hasLowercase = preg_match('/\p{Ll}/u', $password) === 1;
        $hasUppercase = preg_match('/\p{Lu}/u', $password) === 1;
        $hasDigit = preg_match('/\d/u', $password) === 1;
        $hasSpecial = preg_match('/[^\p{L}\p{N}]/u', $password) === 1;

        if (!$hasLowercase || !$hasUppercase || !$hasDigit || !$hasSpecial) {
            return $subject . ' musi zawierać małe i wielkie litery, cyfrę oraz znak specjalny.';
        }

        return null;
    }

    protected function getCsrfToken(): string
    {
        $token = $_SESSION['csrf_token'] ?? null;
        if (is_string($token) && strlen($token) >= 32) {
            return $token;
        }

        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;

        return $token;
    }

    private function sanitizeBackRedirect(string $url): string
    {
        $path = (string) parse_url($url, PHP_URL_PATH);
        $query = (string) parse_url($url, PHP_URL_QUERY);

        if ($path === '' || !str_starts_with($path, '/')) {
            return '/login';
        }

        if (str_starts_with($path, '//')) {
            return '/login';
        }

        return $query !== '' ? $path . '?' . $query : $path;
    }

    private function resolveCurrentUser(int $userId): array
    {
        $fallbackUser = [
            'id' => $userId,
            'full_name' => 'Użytkownik testowy',
            'pseudonym' => null,
            'avatar_path' => null,
            'role' => 'user',
            'membership_tier' => 'free',
            'is_currently_banned' => false,
            'blocked_reason' => null,
            'blocked_until' => null,
            'blocked_until_label' => null,
            'blocked_is_permanent' => false,
            'is_community_blocked' => false,
            'community_block_reason' => null,
            'community_blocked_until' => null,
            'community_blocked_until_label' => null,
            'community_block_is_permanent' => false,
            'is_marketplace_blocked' => false,
            'marketplace_block_reason' => null,
            'marketplace_blocked_until' => null,
            'marketplace_blocked_until_label' => null,
            'marketplace_block_is_permanent' => false,
        ];

        try {
            $this->synchronizeUserBanState();
            $repository = new UserRepository(Database::getConnection());
            $user = $repository->getById($userId);
            if (!$user) {
                return $fallbackUser;
            }

            $isCurrentlyBanned = (bool) ($user['is_blocked'] ?? false)
                && $this->isTimedRestrictionActive(
                    $user['blocked_until'] ?? null,
                    (bool) ($user['blocked_is_permanent'] ?? false)
                );
            $isCommunityBlocked = $this->isTimedRestrictionActive(
                $user['community_blocked_until'] ?? null,
                (bool) ($user['community_block_is_permanent'] ?? false)
            );
            $isMarketplaceBlocked = $this->isTimedRestrictionActive(
                $user['marketplace_blocked_until'] ?? null,
                (bool) ($user['marketplace_block_is_permanent'] ?? false)
            );

            $user['is_currently_banned'] = $isCurrentlyBanned;
            $user['blocked_until_label'] = $isCurrentlyBanned
                ? $this->formatBanUntilLabel($user['blocked_until'] ?? null, (bool) ($user['blocked_is_permanent'] ?? false))
                : null;
            $user['is_community_blocked'] = $isCommunityBlocked;
            $user['community_blocked_until_label'] = $isCommunityBlocked
                ? $this->formatBanUntilLabel($user['community_blocked_until'] ?? null, (bool) ($user['community_block_is_permanent'] ?? false))
                : null;
            $user['is_marketplace_blocked'] = $isMarketplaceBlocked;
            $user['marketplace_blocked_until_label'] = $isMarketplaceBlocked
                ? $this->formatBanUntilLabel($user['marketplace_blocked_until'] ?? null, (bool) ($user['marketplace_block_is_permanent'] ?? false))
                : null;

            return $user;
        } catch (Throwable) {
            return $fallbackUser;
        }
    }

    protected function getCurrentUserState(): array
    {
        return $this->resolveCurrentUser($this->getCurrentUserId());
    }

    private function resolveNotificationUnreadCount(int $userId): int
    {
        try {
            $this->synchronizeUserBanState();
            $repository = new NotificationRepository(Database::getConnection());
            $repository->syncUserNotifications($userId);

            return $repository->getUnreadCount($userId);
        } catch (Throwable) {
            return 0;
        }
    }

    protected function synchronizeUserBanState(): void
    {
        if ($this->banStateSynchronized) {
            return;
        }

        $this->banStateSynchronized = true;

        try {
            $repository = new UserRepository(Database::getConnection());
            $repository->releaseExpiredBans();
            $carsRepository = new CarsRepository(Database::getConnection());
            $expiredVehicleImagePaths = $carsRepository->releaseExpiredRejectedVehicles();
            foreach ($expiredVehicleImagePaths as $imagePath) {
                $localPath = $this->resolvePublicPathToFilesystem((string) $imagePath);
                if ($localPath !== null && is_file($localPath)) {
                    @unlink($localPath);
                }
            }
        } catch (Throwable) {
        }
    }

    protected function resolvePublicPathToFilesystem(string $publicPath): ?string
    {
        $normalized = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($publicPath, '/\\'));
        if ($normalized === '') {
            return null;
        }

        return getcwd() . DIRECTORY_SEPARATOR . $normalized;
    }

    private function formatBanUntilLabel(mixed $blockedUntil, bool $isPermanent): string
    {
        if ($isPermanent) {
            return 'na stałe';
        }

        $blockedUntilValue = trim((string) $blockedUntil);
        if ($blockedUntilValue === '') {
            return 'na stałe';
        }

        $timestamp = strtotime($blockedUntilValue);
        if ($timestamp === false) {
            return 'na stałe';
        }

        return date('d.m.Y • H:i', $timestamp);
    }
    protected function isTimedRestrictionActive(mixed $blockedUntil, bool $isPermanent): bool
    {
        if ($isPermanent) {
            return true;
        }

        $blockedUntilValue = trim((string) $blockedUntil);
        if ($blockedUntilValue === '') {
            return false;
        }

        $timestamp = strtotime($blockedUntilValue);
        return $timestamp !== false && $timestamp > time();
    }

    protected function buildCommunityRestrictionMessage(array $user): string
    {
        $untilLabel = trim((string) ($user['community_blocked_until_label'] ?? ''));
        return $untilLabel === 'na stałe'
            ? 'Funkcje społeczności są ograniczone na stałe.'
            : 'Funkcje społeczności są ograniczone do ' . $untilLabel . '.';
    }

    protected function buildMarketplaceRestrictionMessage(array $user): string
    {
        $untilLabel = trim((string) ($user['marketplace_blocked_until_label'] ?? ''));
        return $untilLabel === 'na stałe'
            ? 'Funkcje marketplace są ograniczone na stałe.'
            : 'Funkcje marketplace są ograniczone do ' . $untilLabel . '.';
    }
}
