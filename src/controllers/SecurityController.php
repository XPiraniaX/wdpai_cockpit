<?php

require_once 'AppController.php';

class SecurityController extends AppController
{
    private const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 900;
    private const LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_LOGIN = 5;
    private const LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP = 20;

    public function login(): void
    {
        $this->synchronizeUserBanState();
        $this->redirectIfAuthenticated();

        $title = 'Login - Cockpit';
        $form = [
            'login' => '',
        ];
        $errors = [];

        if ($this->isPost()) {
            $form['login'] = trim((string) ($_POST['login'] ?? ''));
            $password = (string) ($_POST['password'] ?? '');

            if ($form['login'] === '') {
                $errors['login'] = 'Podaj email albo login.';
            }

            if ($password === '') {
                $errors['password'] = 'Podaj hasło.';
            }

            if ($errors === []) {
                $clientIp = $this->resolveClientIp();
                if ($this->isLoginRateLimited($clientIp, $form['login'])) {
                    $errors['auth'] = 'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za kilka minut.';
                    $this->registerFailedLoginAttempt($clientIp, $form['login']);
                }
            }

            if ($errors === []) {
                $repository = new UserRepository(Database::getConnection());
                $user = $repository->findForAuthentication($form['login']);

                if (!$user || !$this->canAuthenticate((string) $user['password'], $password)) {
                    $this->registerFailedLoginAttempt($this->resolveClientIp(), $form['login']);
                    $errors['auth'] = 'Niepoprawny login lub hasło.';
                } else {
                    $this->clearLoginRateLimit($this->resolveClientIp(), $form['login']);
                    $this->loginUser((int) $user['id']);
                    $repository->updateLastLoginAt((int) $user['id']);
                    $this->redirect('/dashboard');
                }
            }
        }

        $this->renderAuth('login', [
            'title' => $title,
            'errors' => $errors,
            'form' => $form,
        ]);
    }

    public function register(): void
    {
        $this->redirectIfAuthenticated();

        $title = 'Register - Cockpit';
        $form = [
            'first_name' => '',
            'last_name' => '',
            'username' => '',
            'email' => '',
        ];
        $errors = [];

        if ($this->isPost()) {
            $form['first_name'] = trim((string) ($_POST['first_name'] ?? ''));
            $form['last_name'] = trim((string) ($_POST['last_name'] ?? ''));
            $form['username'] = trim((string) ($_POST['username'] ?? ''));
            $form['email'] = trim((string) ($_POST['email'] ?? ''));
            $password = (string) ($_POST['password'] ?? '');
            $passwordConfirmation = (string) ($_POST['password_confirmation'] ?? '');

            if ($form['first_name'] === '') {
                $errors['first_name'] = 'Podaj imię.';
            }

            if ($form['last_name'] === '') {
                $errors['last_name'] = 'Podaj nazwisko.';
            }

            if ($form['username'] === '') {
                $errors['username'] = 'Podaj login.';
            } elseif (strlen($form['username']) < 3) {
                $errors['username'] = 'Login musi mieć co najmniej 3 znaki.';
            }

            if ($form['email'] === '') {
                $errors['email'] = 'Podaj email.';
            } elseif (!filter_var($form['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'Podaj poprawny adres email.';
            }

            $passwordError = $this->validatePasswordStrength($password, 'Hasło');
            if ($passwordError !== null) {
                $errors['password'] = $passwordError;
            }

            if ($passwordConfirmation === '') {
                $errors['password_confirmation'] = 'Powtórz hasło.';
            } elseif ($password !== $passwordConfirmation) {
                $errors['password_confirmation'] = 'Hasła muszą być identyczne.';
            }

            if ($errors === []) {
                $repository = new UserRepository(Database::getConnection());

                if ($repository->usernameExists($form['username'])) {
                    $errors['username'] = 'Wybrany login jest niedostępny.';
                }

                if ($repository->emailExists($form['email'])) {
                    $errors['email'] = 'Nie można użyć tego adresu email.';
                }

                if ($errors === []) {
                    $repository->createUser([
                        'first_name' => $form['first_name'],
                        'last_name' => $form['last_name'],
                        'username' => $form['username'],
                        'email' => $form['email'],
                        'password' => password_hash($password, PASSWORD_DEFAULT),
                    ]);

                    $this->setFlash('success', 'Konto zostało utworzone. Możesz się teraz zalogować.');
                    $this->redirect('/login');
                }
            }
        }

        $this->renderAuth('register', [
            'title' => $title,
            'errors' => $errors,
            'form' => $form,
            'scriptFiles' => ['auth.js'],
        ]);
    }

    public function logout(): void
    {
        $this->logoutUser();
        $this->setFlash('success', 'Zostałeś wylogowany.');
        $this->redirect('/login');
    }

    public function completePseudonym(): void
    {
        $this->requireAuthentication();

        if (!$this->isPost()) {
            $this->redirect('/dashboard');
        }

        $pseudonym = trim((string) ($_POST['pseudonym'] ?? ''));
        $redirectTo = $this->sanitizeRedirectPath((string) ($_POST['redirect_to'] ?? '/dashboard'));

        if ($pseudonym === '') {
            $this->setFlash('error', 'Wpisz swój pseudonim.');
            $this->redirect($redirectTo);
        }

        if (mb_strlen($pseudonym) < 3) {
            $this->setFlash('error', 'Pseudonim musi mieć co najmniej 3 znaki.');
            $this->redirect($redirectTo);
        }

        if (mb_strlen($pseudonym) > 80) {
            $this->setFlash('error', 'Pseudonim może mieć maksymalnie 80 znaków.');
            $this->redirect($redirectTo);
        }

        if (!preg_match('/^[\p{L}\p{N}._ -]+$/u', $pseudonym)) {
            $this->setFlash('error', 'Pseudonim może zawierać tylko litery, cyfry, spacje, kropki, myślniki i podkreślenia.');
            $this->redirect($redirectTo);
        }

        $repository = new UserRepository(Database::getConnection());
        if ($repository->pseudonymExistsForOtherUser($pseudonym, $this->getCurrentUserId())) {
            $this->setFlash('error', 'Ten pseudonim jest już zajęty.');
            $this->redirect($redirectTo);
        }

        $repository->updatePseudonym($this->getCurrentUserId(), $pseudonym);

        $this->setFlash('success', 'Pseudonim został zapisany.');
        $this->redirect($redirectTo);
    }

    private function canAuthenticate(string $storedPassword, string $plainPassword): bool
    {
        return password_verify($plainPassword, $storedPassword);
    }

    private function sanitizeRedirectPath(string $redirectTo): string
    {
        $path = trim($redirectTo);

        if ($path === '' || $path[0] !== '/') {
            return '/dashboard';
        }

        if (str_starts_with($path, '//')) {
            return '/dashboard';
        }

        return $path;
    }

    private function resolveClientIp(): string
    {
        $remoteAddr = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        return $remoteAddr !== '' ? $remoteAddr : 'unknown';
    }

    private function isLoginRateLimited(string $ip, string $login): bool
    {
        $ipAttempts = $this->readRecentLoginAttempts($this->buildLoginRateLimitKey('ip', strtolower($ip)));
        if (count($ipAttempts) >= self::LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP) {
            return true;
        }

        $loginAttempts = $this->readRecentLoginAttempts($this->buildLoginRateLimitKey('login', strtolower($login) . '|' . strtolower($ip)));
        return count($loginAttempts) >= self::LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_LOGIN;
    }

    private function registerFailedLoginAttempt(string $ip, string $login): void
    {
        $this->appendLoginAttempt($this->buildLoginRateLimitKey('ip', strtolower($ip)));
        $this->appendLoginAttempt($this->buildLoginRateLimitKey('login', strtolower($login) . '|' . strtolower($ip)));
    }

    private function clearLoginRateLimit(string $ip, string $login): void
    {
        $this->deleteLoginRateLimitFile($this->buildLoginRateLimitKey('login', strtolower($login) . '|' . strtolower($ip)));
    }

    private function appendLoginAttempt(string $key): void
    {
        $attempts = $this->readRecentLoginAttempts($key);
        $attempts[] = time();
        @file_put_contents($this->getLoginRateLimitFilePath($key), json_encode($attempts, JSON_UNESCAPED_SLASHES));
    }

    private function readRecentLoginAttempts(string $key): array
    {
        $path = $this->getLoginRateLimitFilePath($key);
        if (!is_file($path)) {
            return [];
        }

        $raw = @file_get_contents($path);
        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            return [];
        }

        $threshold = time() - self::LOGIN_RATE_LIMIT_WINDOW_SECONDS;
        $filtered = array_values(array_filter($decoded, static fn ($timestamp) => is_int($timestamp) && $timestamp >= $threshold));

        @file_put_contents($path, json_encode($filtered, JSON_UNESCAPED_SLASHES));
        return $filtered;
    }

    private function deleteLoginRateLimitFile(string $key): void
    {
        $path = $this->getLoginRateLimitFilePath($key);
        if (is_file($path)) {
            @unlink($path);
        }
    }

    private function getLoginRateLimitFilePath(string $key): string
    {
        $directory = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'cockpit_login_rate_limit';
        if (!is_dir($directory)) {
            @mkdir($directory, 0777, true);
        }

        return $directory . DIRECTORY_SEPARATOR . hash('sha256', $key) . '.json';
    }

    private function buildLoginRateLimitKey(string $scope, string $identifier): string
    {
        return 'cockpit:' . $scope . ':' . $identifier;
    }
}
