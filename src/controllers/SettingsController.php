<?php

class SettingsController extends AppController
{
    public function index(): void
    {
        $this->requireAuthentication();

        $repository = new UserRepository(Database::getConnection());
        $currentUserId = $this->getCurrentUserId();
        $currentUser = $repository->getById($currentUserId);

        if ($currentUser === null) {
            $this->logoutUser();
            $this->redirect('/login');
        }

        $accountForm = [
            'pseudonym' => (string) ($currentUser['pseudonym'] ?? ''),
            'full_name' => trim((string) ($currentUser['full_name'] ?? '')),
            'email' => (string) ($currentUser['email'] ?? ''),
            'username' => (string) ($currentUser['username'] ?? ''),
        ];
        $accountErrors = [];

        $securityForm = [
            'current_password' => '',
            'new_password' => '',
            'new_password_confirmation' => '',
        ];
        $securityErrors = [];
        $privacyForm = $repository->getPrivacySettings($currentUserId);
        $privacyErrors = [];
        $applicationForm = $repository->getApplicationSettings($currentUserId);
        $applicationErrors = [];
        $communityForm = $repository->getCommunitySettings($currentUserId);
        $communityErrors = [];
        $marketplaceForm = $repository->getMarketplaceSettings($currentUserId);
        $marketplaceErrors = [];
        $notificationForm = $repository->getNotificationSettings($currentUserId);
        $notificationErrors = [];

        if ($this->isPost()) {
            $action = (string) ($_POST['action'] ?? '');

            if ($action === 'delete_account') {
                try {
                    $repository->deactivateAccount($currentUserId);
                    $this->logoutUser();
                    $this->setFlash('success', 'Konto zostało usunięte.');
                    $this->redirect('/login');
                } catch (Throwable) {
                    $this->setFlash('error', 'Nie udało się usunąć konta. Spróbuj ponownie za chwilę.');
                    $this->redirect('/settings');
                }
            }

            if ($action === 'save_account_settings') {
                $accountForm = [
                    'pseudonym' => trim((string) ($_POST['pseudonym'] ?? '')),
                    'full_name' => preg_replace('/\s+/u', ' ', trim((string) ($_POST['full_name'] ?? ''))) ?? '',
                    'email' => trim((string) ($_POST['email'] ?? '')),
                    'username' => trim((string) ($_POST['username'] ?? '')),
                ];

                $accountErrors = $this->validateAccountForm($accountForm, $repository, $currentUserId);

                if ($accountErrors === []) {
                    [$firstName, $lastName] = $this->splitFullName($accountForm['full_name']);

                    try {
                        $repository->updateAccountData(
                            $currentUserId,
                            $accountForm['username'],
                            mb_strtolower($accountForm['email']),
                            $firstName,
                            $lastName,
                            $accountForm['pseudonym']
                        );

                        $updatedUser = $repository->getById($currentUserId) ?: $currentUser;
                        $headerUserName = trim((string) ($updatedUser['pseudonym'] ?? '')) !== ''
                            ? (string) $updatedUser['pseudonym']
                            : (string) ($updatedUser['full_name'] ?? 'Użytkownik testowy');
                        $profilePath = trim((string) ($updatedUser['pseudonym'] ?? '')) !== ''
                            ? '/profile/' . rawurlencode((string) $updatedUser['pseudonym'])
                            : '/profile';

                        if ($this->isAjaxRequest()) {
                            $this->jsonResponse([
                                'success' => true,
                                'message' => 'Dane konta zostały zaktualizowane.',
                                'form' => [
                                    'pseudonym' => (string) ($updatedUser['pseudonym'] ?? ''),
                                    'full_name' => trim((string) ($updatedUser['full_name'] ?? '')),
                                    'email' => (string) ($updatedUser['email'] ?? ''),
                                    'username' => (string) ($updatedUser['username'] ?? ''),
                                ],
                                'header_user_name' => $headerUserName,
                                'profile_path' => $profilePath,
                            ]);
                        }

                        $this->setFlash('success', 'Dane konta zostały zaktualizowane.');
                        $this->redirect('/settings');
                    } catch (Throwable) {
                        $accountErrors['form'] = 'Nie udało się zapisać zmian. Spróbuj ponownie za chwilę.';
                    }
                }

                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => false,
                        'errors' => $accountErrors,
                    ], 422);
                }
            }

            if ($action === 'save_security_settings') {
                $securityForm = [
                    'current_password' => (string) ($_POST['current_password'] ?? ''),
                    'new_password' => (string) ($_POST['new_password'] ?? ''),
                    'new_password_confirmation' => (string) ($_POST['new_password_confirmation'] ?? ''),
                ];

                $securityErrors = $this->validateSecurityForm($securityForm, $repository, $currentUserId);

                if ($securityErrors === []) {
                    try {
                        $repository->updatePassword(
                            $currentUserId,
                            password_hash($securityForm['new_password'], PASSWORD_DEFAULT)
                        );

                        if ($this->isAjaxRequest()) {
                            $this->jsonResponse([
                                'success' => true,
                                'message' => 'Hasło zostało zmienione.',
                            ]);
                        }

                        $this->setFlash('success', 'Hasło zostało zmienione.');
                        $this->redirect('/settings');
                    } catch (Throwable) {
                        $securityErrors['form'] = 'Nie udało się zmienić hasła. Spróbuj ponownie za chwilę.';
                    }
                }

                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => false,
                        'errors' => $securityErrors,
                    ], 422);
                }
            }

            if ($action === 'save_privacy_settings') {
                $privacyForm = [
                    'privacy_full_name_visibility' => trim((string) ($_POST['privacy_full_name_visibility'] ?? 'public')),
                    'privacy_membership_visibility' => trim((string) ($_POST['privacy_membership_visibility'] ?? 'public')),
                    'privacy_profile_posts_visibility' => trim((string) ($_POST['privacy_profile_posts_visibility'] ?? 'public')),
                    'privacy_profile_listings_visibility' => trim((string) ($_POST['privacy_profile_listings_visibility'] ?? 'public')),
                ];

                $privacyErrors = $this->validatePrivacyForm($privacyForm);

                if ($privacyErrors === []) {
                    try {
                        $repository->updatePrivacySettings($currentUserId, $privacyForm);

                        if ($this->isAjaxRequest()) {
                            $this->jsonResponse([
                                'success' => true,
                                'message' => 'Ustawienia prywatności zostały zaktualizowane.',
                                'form' => $privacyForm,
                            ]);
                        }

                        $this->setFlash('success', 'Ustawienia prywatności zostały zaktualizowane.');
                        $this->redirect('/settings');
                    } catch (Throwable) {
                        $privacyErrors['form'] = 'Nie udało się zapisać ustawień prywatności. Spróbuj ponownie za chwilę.';
                    }
                }

                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => false,
                        'errors' => $privacyErrors,
                    ], 422);
                }
            }

            if ($action === 'save_application_settings') {
                $applicationForm = [
                    'app_distance_unit' => 'km',
                    'app_consumption_format' => trim((string) ($_POST['app_consumption_format'] ?? 'l_100km')),
                ];

                $applicationErrors = $this->validateApplicationForm($applicationForm);

                if ($applicationErrors === []) {
                    try {
                        $repository->updateApplicationSettings($currentUserId, $applicationForm);

                        if ($this->isAjaxRequest()) {
                            $this->jsonResponse([
                                'success' => true,
                                'message' => 'Ustawienia aplikacji zostały zaktualizowane.',
                                'form' => $applicationForm,
                            ]);
                        }

                        $this->setFlash('success', 'Ustawienia aplikacji zostały zaktualizowane.');
                        $this->redirect('/settings');
                    } catch (Throwable) {
                        $applicationErrors['form'] = 'Nie udało się zapisać ustawień aplikacji. Spróbuj ponownie za chwilę.';
                    }
                }

                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => false,
                        'errors' => $applicationErrors,
                    ], 422);
                }
            }

            if ($action === 'save_community_settings') {
                $communityForm = [
                    'community_default_scope' => trim((string) ($_POST['community_default_scope'] ?? 'all')),
                ];

                $communityErrors = $this->validateCommunityForm($communityForm);

                if ($communityErrors === []) {
                    try {
                        $repository->updateCommunitySettings($currentUserId, $communityForm);

                        if ($this->isAjaxRequest()) {
                            $this->jsonResponse([
                                'success' => true,
                                'message' => 'Ustawienia społeczności zostały zaktualizowane.',
                                'form' => $communityForm,
                            ]);
                        }

                        $this->setFlash('success', 'Ustawienia społeczności zostały zaktualizowane.');
                        $this->redirect('/settings');
                    } catch (Throwable) {
                        $communityErrors['form'] = 'Nie udało się zapisać ustawień społeczności. Spróbuj ponownie za chwilę.';
                    }
                }

                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => false,
                        'errors' => $communityErrors,
                    ], 422);
                }
            }

            if ($action === 'save_marketplace_settings') {
                $marketplaceForm = [
                    'marketplace_default_scope' => trim((string) ($_POST['marketplace_default_scope'] ?? 'all')),
                    'marketplace_default_sort' => trim((string) ($_POST['marketplace_default_sort'] ?? 'newest')),
                    'marketplace_preferred_contact_channel' => trim((string) ($_POST['marketplace_preferred_contact_channel'] ?? 'both')),
                ];

                $marketplaceErrors = $this->validateMarketplaceForm($marketplaceForm);

                if ($marketplaceErrors === []) {
                    try {
                        $repository->updateMarketplaceSettings($currentUserId, $marketplaceForm);

                        if ($this->isAjaxRequest()) {
                            $this->jsonResponse([
                                'success' => true,
                                'message' => 'Ustawienia marketplace zostały zaktualizowane.',
                                'form' => $marketplaceForm,
                            ]);
                        }

                        $this->setFlash('success', 'Ustawienia marketplace zostały zaktualizowane.');
                        $this->redirect('/settings');
                    } catch (Throwable) {
                        $marketplaceErrors['form'] = 'Nie udało się zapisać ustawień marketplace. Spróbuj ponownie za chwilę.';
                    }
                }

                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => false,
                        'errors' => $marketplaceErrors,
                    ], 422);
                }
            }

            if ($action === 'save_notification_settings') {
                $notificationForm = [
                    'notification_vehicle_acceptance' => isset($_POST['notification_vehicle_acceptance']),
                    'notification_vehicle_documents' => isset($_POST['notification_vehicle_documents']),
                    'notification_profile_membership' => isset($_POST['notification_profile_membership']),
                    'notification_post_likes' => isset($_POST['notification_post_likes']),
                    'notification_post_comments' => isset($_POST['notification_post_comments']),
                ];

                $notificationErrors = $this->validateNotificationForm($notificationForm);

                if ($notificationErrors === []) {
                    try {
                        $repository->updateNotificationSettings($currentUserId, $notificationForm);

                        if ($this->isAjaxRequest()) {
                            $this->jsonResponse([
                                'success' => true,
                                'message' => 'Ustawienia powiadomień zostały zaktualizowane.',
                                'form' => $notificationForm,
                            ]);
                        }

                        $this->setFlash('success', 'Ustawienia powiadomień zostały zaktualizowane.');
                        $this->redirect('/settings');
                    } catch (Throwable) {
                        $notificationErrors['form'] = 'Nie udało się zapisać ustawień powiadomień. Spróbuj ponownie za chwilę.';
                    }
                }

                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => false,
                        'errors' => $notificationErrors,
                    ], 422);
                }
            }
        }

        $this->render('settings', [
            'title' => 'Ustawienia',
            'scriptFiles' => ['settings.js'],
            'accountForm' => $accountForm,
            'accountErrors' => $accountErrors,
            'securityForm' => $securityForm,
            'securityErrors' => $securityErrors,
            'privacyForm' => $privacyForm,
            'privacyErrors' => $privacyErrors,
            'applicationForm' => $applicationForm,
            'applicationErrors' => $applicationErrors,
            'communityForm' => $communityForm,
            'communityErrors' => $communityErrors,
            'marketplaceForm' => $marketplaceForm,
            'marketplaceErrors' => $marketplaceErrors,
            'notificationForm' => $notificationForm,
            'notificationErrors' => $notificationErrors,
        ]);
    }

    private function validateAccountForm(array $form, UserRepository $repository, int $currentUserId): array
    {
        $errors = [];

        if ($form['pseudonym'] === '') {
            $errors['pseudonym'] = 'Wpisz pseudonim.';
        } elseif (mb_strlen($form['pseudonym']) < 3 || mb_strlen($form['pseudonym']) > 80) {
            $errors['pseudonym'] = 'Pseudonim musi mieć od 3 do 80 znaków.';
        } elseif (!preg_match('/^[\p{L}\p{N}._ -]+$/u', $form['pseudonym'])) {
            $errors['pseudonym'] = 'Pseudonim może zawierać tylko litery, cyfry, spacje, kropki, myślniki i podkreślenia.';
        } elseif ($repository->pseudonymExistsForOtherUser($form['pseudonym'], $currentUserId)) {
            $errors['pseudonym'] = 'Nie udało się zapisać tego pseudonimu. Wybierz inny albo sprawdź format.';
        }

        if ($form['full_name'] === '') {
            $errors['full_name'] = 'Wpisz imię i nazwisko.';
        } elseif (mb_strlen($form['full_name']) < 3 || mb_strlen($form['full_name']) > 120) {
            $errors['full_name'] = 'Imię i nazwisko musi mieć od 3 do 120 znaków.';
        }

        if ($form['email'] === '') {
            $errors['email'] = 'Wpisz adres e-mail.';
        } elseif (!filter_var($form['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Wpisz poprawny adres e-mail.';
        } elseif (mb_strlen($form['email']) > 190) {
            $errors['email'] = 'Adres e-mail jest zbyt długi.';
        } elseif ($repository->emailExistsForOtherUser($form['email'], $currentUserId)) {
            $errors['email'] = 'Nie udało się zapisać tego adresu e-mail. Użyj innego albo sprawdź format.';
        }

        if ($form['username'] === '') {
            $errors['username'] = 'Wpisz login.';
        } elseif (mb_strlen($form['username']) < 3 || mb_strlen($form['username']) > 40) {
            $errors['username'] = 'Login musi mieć od 3 do 40 znaków.';
        } elseif (!preg_match('/^[A-Za-z0-9._-]+$/', $form['username'])) {
            $errors['username'] = 'Login może zawierać tylko litery, cyfry, kropki, myślniki i podkreślenia.';
        } elseif ($repository->usernameExistsForOtherUser($form['username'], $currentUserId)) {
            $errors['username'] = 'Nie udało się zapisać tego loginu. Wybierz inny albo sprawdź format.';
        }

        return $errors;
    }

    private function validateSecurityForm(array $form, UserRepository $repository, int $currentUserId): array
    {
        $errors = [];

        if ($form['current_password'] === '') {
            $errors['current_password'] = 'Wpisz aktualne hasło.';
        }

        if ($form['new_password'] === '') {
            $errors['new_password'] = 'Wpisz nowe hasło.';
        } elseif (strlen($form['new_password']) < 8) {
            $errors['new_password'] = 'Nowe hasło musi mieć co najmniej 8 znaków.';
        } elseif (strlen($form['new_password']) > 255) {
            $errors['new_password'] = 'Nowe hasło jest zbyt długie.';
        }

        if ($form['new_password_confirmation'] === '') {
            $errors['new_password_confirmation'] = 'Powtórz nowe hasło.';
        } elseif ($form['new_password'] !== $form['new_password_confirmation']) {
            $errors['new_password_confirmation'] = 'Nowe hasła muszą być identyczne.';
        }

        if ($errors !== []) {
            return $errors;
        }

        $authData = $repository->getAuthenticationDataById($currentUserId);
        if (!$authData || !(bool) ($authData['is_active'] ?? false)) {
            $errors['form'] = 'Nie udało się zweryfikować konta. Zaloguj się ponownie.';
            return $errors;
        }

        if (!$this->canAuthenticate((string) $authData['password'], $form['current_password'])) {
            $errors['current_password'] = 'Nie udało się potwierdzić aktualnego hasła.';
        }

        if ($this->canAuthenticate((string) $authData['password'], $form['new_password'])) {
            $errors['new_password'] = 'Nowe hasło musi różnić się od aktualnego.';
        }

        return $errors;
    }

    private function validatePrivacyForm(array $form): array
    {
        $errors = [];
        $allowedValues = ['public', 'private'];

        foreach ([
            'privacy_full_name_visibility',
            'privacy_membership_visibility',
            'privacy_profile_posts_visibility',
            'privacy_profile_listings_visibility',
        ] as $field) {
            if (!in_array($form[$field] ?? '', $allowedValues, true)) {
                $errors[$field] = 'Wybierz poprawną wartość ustawienia.';
            }
        }

        return $errors;
    }

    private function validateApplicationForm(array $form): array
    {
        $errors = [];

        if (($form['app_distance_unit'] ?? 'km') !== 'km') {
            $errors['app_distance_unit'] = 'Jednostka przebiegu jest obecnie zablokowana na kilometry.';
        }

        if (!in_array(($form['app_consumption_format'] ?? ''), ['l_100km', 'km_l'], true)) {
            $errors['app_consumption_format'] = 'Wybierz poprawny format spalania.';
        }

        return $errors;
    }

    private function validateMarketplaceForm(array $form): array
    {
        $errors = [];

        if (!in_array(($form['marketplace_default_scope'] ?? ''), ['all', 'saved'], true)) {
            $errors['marketplace_default_scope'] = 'Wybierz poprawny domyślny zakres ogłoszeń.';
        }

        if (!in_array(($form['marketplace_default_sort'] ?? ''), ['newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc'], true)) {
            $errors['marketplace_default_sort'] = 'Wybierz poprawne domyślne sortowanie.';
        }

        if (!in_array(($form['marketplace_preferred_contact_channel'] ?? ''), ['both', 'phone', 'email'], true)) {
            $errors['marketplace_preferred_contact_channel'] = 'Wybierz poprawny preferowany kanał kontaktowy.';
        }

        return $errors;
    }

    private function validateCommunityForm(array $form): array
    {
        $errors = [];

        if (!in_array(($form['community_default_scope'] ?? ''), ['all', 'liked', 'saved', 'commented'], true)) {
            $errors['community_default_scope'] = 'Wybierz poprawny domyślny widok feedu.';
        }

        return $errors;
    }

    private function validateNotificationForm(array $form): array
    {
        $errors = [];

        foreach ([
            'notification_vehicle_acceptance',
            'notification_vehicle_documents',
            'notification_profile_membership',
            'notification_post_likes',
            'notification_post_comments',
        ] as $field) {
            if (!is_bool($form[$field] ?? null)) {
                $errors[$field] = 'Wybierz poprawną wartość ustawienia.';
            }
        }

        return $errors;
    }

    private function splitFullName(string $fullName): array
    {
        $normalized = preg_replace('/\s+/u', ' ', trim($fullName)) ?? '';
        if ($normalized === '') {
            return ['', ''];
        }

        $parts = preg_split('/\s+/u', $normalized) ?: [$normalized];
        $firstName = (string) array_shift($parts);
        $lastName = trim(implode(' ', $parts));

        return [$firstName, $lastName];
    }

    private function canAuthenticate(string $storedPassword, string $plainPassword): bool
    {
        return password_verify($plainPassword, $storedPassword);
    }
}
