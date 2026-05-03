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

    protected function isGet(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'GET';
    }

    protected function isPost(): bool
    {
        return $_SERVER['REQUEST_METHOD'] === 'POST';
    }

    protected function render(string $template, array $variables = []): void
    {
        $templatePath = 'public/views/' . $template . '.html';
        $viewPath = file_exists($templatePath) ? $templatePath : 'public/views/404.html';
        $currentUserId = $this->getCurrentUserId();
        $currentUser = $this->resolveCurrentUser($currentUserId);
        $styleFiles = [
            'base.css',
            'layout.css',
            'navi.css',
            'header.css',
            'dashboard.css',
        ];

        extract($variables);

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

        $this->setFlash('error', 'Zaloguj sie, aby przejsc dalej.');
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

    private function resolveCurrentUser(int $userId): array
    {
        $fallbackUser = [
            'id' => $userId,
            'full_name' => 'Uzytkownik testowy',
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
}
