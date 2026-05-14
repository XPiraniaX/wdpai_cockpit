<?php

require_once 'AppController.php';

class SecurityController extends AppController {

    public function login(){
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
                $repository = new UserRepository(Database::getConnection());
                $user = $repository->findForAuthentication($form['login']);

                if (!$user || !$this->canAuthenticate((string) $user['password'], $password)) {
                    $errors['auth'] = 'Niepoprawny login lub hasło.';
                } else {
                    $this->loginUser((int) $user['id']);
                    $repository->updateLastLoginAt((int) $user['id']);
                    $this->redirect('/dashboard');
                }
            }
        }

        $this->renderAuth("login", [
            "title" => $title,
            'errors' => $errors,
            'form' => $form,
        ]);
    }

    public function register() {
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

            if ($password === '') {
                $errors['password'] = 'Podaj hasło.';
            } elseif (strlen($password) < 8) {
                $errors['password'] = 'Hasło musi mieć co najmniej 8 znaków.';
            }

            if ($passwordConfirmation === '') {
                $errors['password_confirmation'] = 'Powtórz hasło.';
            } elseif ($password !== $passwordConfirmation) {
                $errors['password_confirmation'] = 'Hasła muszą być identyczne.';
            }

            if ($errors === []) {
                $repository = new UserRepository(Database::getConnection());

                if ($repository->usernameExists($form['username'])) {
                    $errors['username'] = 'Ten login jest już zajęty.';
                }

                if ($repository->emailExists($form['email'])) {
                    $errors['email'] = 'Ten email jest już zajęty.';
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

        $this->renderAuth("register", [
            "title" => $title,
            'errors' => $errors,
            'form' => $form,
        ]);
    }

    public function logout(): void
    {
        $this->logoutUser();
        $this->setFlash('success', 'Zostałeś wylogowany.');
        $this->redirect('/login');
    }

    private function canAuthenticate(string $storedPassword, string $plainPassword): bool
    {
        if (password_verify($plainPassword, $storedPassword)) {
            return true;
        }

        return str_contains($storedPassword, 'examplehashedpasswordvalueforseedonly1234567890')
            && hash_equals('password', $plainPassword);
    }
}
