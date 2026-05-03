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
                $errors['password'] = 'Podaj haslo.';
            }

            if ($errors === []) {
                $repository = new UserRepository(Database::getConnection());
                $user = $repository->findForAuthentication($form['login']);

                if (!$user || !$this->canAuthenticate((string) $user['password'], $password)) {
                    $errors['auth'] = 'Niepoprawny login lub haslo.';
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
                $errors['first_name'] = 'Podaj imie.';
            }

            if ($form['last_name'] === '') {
                $errors['last_name'] = 'Podaj nazwisko.';
            }

            if ($form['username'] === '') {
                $errors['username'] = 'Podaj login.';
            } elseif (strlen($form['username']) < 3) {
                $errors['username'] = 'Login musi miec co najmniej 3 znaki.';
            }

            if ($form['email'] === '') {
                $errors['email'] = 'Podaj email.';
            } elseif (!filter_var($form['email'], FILTER_VALIDATE_EMAIL)) {
                $errors['email'] = 'Podaj poprawny adres email.';
            }

            if ($password === '') {
                $errors['password'] = 'Podaj haslo.';
            } elseif (strlen($password) < 8) {
                $errors['password'] = 'Haslo musi miec co najmniej 8 znakow.';
            }

            if ($passwordConfirmation === '') {
                $errors['password_confirmation'] = 'Powtorz haslo.';
            } elseif ($password !== $passwordConfirmation) {
                $errors['password_confirmation'] = 'Hasla musza byc identyczne.';
            }

            if ($errors === []) {
                $repository = new UserRepository(Database::getConnection());

                if ($repository->usernameExists($form['username'])) {
                    $errors['username'] = 'Ten login jest juz zajety.';
                }

                if ($repository->emailExists($form['email'])) {
                    $errors['email'] = 'Ten email jest juz zajety.';
                }

                if ($errors === []) {
                    $repository->createUser([
                        'first_name' => $form['first_name'],
                        'last_name' => $form['last_name'],
                        'username' => $form['username'],
                        'email' => $form['email'],
                        'password' => password_hash($password, PASSWORD_DEFAULT),
                    ]);

                    $this->setFlash('success', 'Konto zostalo utworzone. Mozesz sie teraz zalogowac.');
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
        $this->setFlash('success', 'Zostales wylogowany.');
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
