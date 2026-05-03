<?php

class AppController
{
    protected function getCurrentUserId(): int
    {
        $requestedUserId = $_GET['user'] ?? $_POST['user'] ?? 1;

        if (filter_var($requestedUserId, FILTER_VALIDATE_INT) === false) {
            return 1;
        }

        return max(1, (int) $requestedUserId);
    }

    protected function redirect(string $path): void
    {
        $location = $path;

        if (!str_contains($path, 'user=')) {
            $separator = str_contains($path, '?') ? '&' : '?';
            $location .= $separator . 'user=' . $this->getCurrentUserId();
        }

        header('Location: ' . $location);
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

        extract($variables);

        ob_start();
        include $viewPath;
        $content = ob_get_clean();

        include 'public/views/partials/layout.php';
    }

    protected function renderAuth(string $view, array $variables = []): void
    {
        $templatePath = 'public/views/' . $view . '.html';

        extract($variables);

        ob_start();
        include $templatePath;
        $content = ob_get_clean();

        include 'public/views/partials/auth_layout.php';
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
