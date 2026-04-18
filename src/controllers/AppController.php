<?php

class AppController
{
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

        extract($variables);
        $showNavigation = true;
        $viewPath = file_exists($templatePath) ? $templatePath : 'public/views/404.html';

        ob_start();
        include 'public/views/partials/head.html';
        include 'public/views/partials/navi.html';
        include $viewPath;
        echo '</body></html>';
        $output = ob_get_clean();

        echo $output;
    }

    protected function renderAuth(string $view, array $variables = []): void
    {
        extract($variables);

        ob_start();
        include 'public/views/partials/head.html';
        require "public/views/$view.html";
        echo '</body></html>';
        $output = ob_get_clean();

        echo $output;
    }
}
