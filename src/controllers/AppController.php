<?php

class AppController
{
    protected function getCurrentUserId(): int
    {
        // Temporary dashboard/auth context before real session handling is added.
        return 1;
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
}
