<?php

class AdminController extends AppController
{
    private const CATALOG_USERS_PER_PAGE = 5;
    private const ADMIN_TIMEZONE = 'Europe/Warsaw';

    private UserRepository $userRepository;

    public function __construct()
    {
        $this->userRepository = new UserRepository(Database::getConnection());
    }

    public function index(): void
    {
        $this->requireAdmin();

        if ($this->isPost()) {
            $this->handleAdminAction();
            return;
        }

        if ($this->isAjaxRequest() && isset($_GET['catalog_page'])) {
            $this->handleCatalogUsersPage();
        }

        $catalog = $this->buildCatalogUsersPayload($this->normalizePositiveInt($_GET['catalog_page'] ?? 1));

        $this->render('admin_panel', [
            'title' => 'Panel zarządzania / Dashboard',
            'styleFiles' => [
                'base.css',
                'layout.css',
                'navi.css',
                'header.css',
                'dashboard.css',
                'community.css',
                'my_cars.css',
                'settings.css',
                'vehicle_details.css',
                'admin_panel.css',
            ],
            'scriptFiles' => ['admin_panel.js'],
            'adminCatalogUsers' => $catalog,
        ]);
    }

    private function handleCatalogUsersPage(): void
    {
        $page = $this->normalizePositiveInt($_GET['catalog_page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'catalog' => $this->buildCatalogUsersPayload($page),
        ]);
    }

    private function buildCatalogUsersPayload(int $page): array
    {
        $totalUsers = $this->userRepository->countAdminCatalogUsers();
        $totalPages = max(1, (int) ceil($totalUsers / self::CATALOG_USERS_PER_PAGE));
        $page = min(max(1, $page), $totalPages);
        $rows = array_map(
            fn (array $user): array => $this->mapCatalogUserRow($user),
            $this->userRepository->getAdminCatalogUsersPage($page, self::CATALOG_USERS_PER_PAGE)
        );

        return [
            'rows' => $rows,
            'page' => $page,
            'per_page' => self::CATALOG_USERS_PER_PAGE,
            'total_users' => $totalUsers,
            'total_pages' => $totalPages,
        ];
    }

    private function mapCatalogUserRow(array $user): array
    {
        $pseudonym = trim((string) ($user['pseudonym'] ?? ''));
        $username = trim((string) ($user['username'] ?? ''));
        $displayName = $pseudonym !== '' ? $pseudonym : $username;
        $profilePath = $pseudonym !== ''
            ? '/profile/' . rawurlencode($pseudonym)
            : '/profile';
        $adminProfilePath = $pseudonym !== ''
            ? '/admin/profile/' . rawurlencode($pseudonym)
            : '/admin/profile?id=' . (int) ($user['id'] ?? 0) . '&admin_preview=1';

        return [
            'id' => (int) ($user['id'] ?? 0),
            'pseudonym' => $displayName,
            'full_name' => (string) ($user['full_name'] ?? 'Użytkownik'),
            'email' => (string) ($user['email'] ?? ''),
            'avatar_path' => trim((string) ($user['avatar_path'] ?? '')),
            'membership_tier' => strtoupper((string) ($user['membership_tier'] ?? 'free')) . ' MEMBER',
            'vehicle_count' => (int) ($user['vehicle_count'] ?? 0),
            'listing_count' => (int) ($user['listing_count'] ?? 0),
            'post_count' => (int) ($user['post_count'] ?? 0),
            'admin_removed_listing_count' => (int) ($user['admin_removed_listing_count'] ?? 0),
            'admin_removed_post_count' => (int) ($user['admin_removed_post_count'] ?? 0),
            'is_blocked' => $this->isUserCurrentlyBlocked($user),
            'blocked_until_label' => $this->formatBanStatusLabel($user),
            'presence_label' => $this->formatPresenceStatusLabel($user),
            'blocked_reason' => (string) ($user['blocked_reason'] ?? ''),
            'last_ban_summary' => $this->formatLastBanSummary($user),
            'profile_path' => $profilePath,
            'admin_profile_path' => $adminProfilePath,
        ];
    }

    private function normalizePositiveInt(mixed $value, int $default = 1): int
    {
        if (filter_var($value, FILTER_VALIDATE_INT) === false) {
            return $default;
        }

        return max(1, (int) $value);
    }

    private function handleAdminAction(): void
    {
        $action = (string) ($_POST['action'] ?? '');

        if ($action === 'ban_user') {
            $this->handleBanUser();
            return;
        }

        if ($action === 'unban_user') {
            $this->handleUnbanUser();
            return;
        }

        if ($action === 'send_user_warning') {
            $this->handleSendUserWarning();
            return;
        }

        $this->jsonResponse([
            'success' => false,
            'message' => 'Nieprawidłowa akcja administratora.',
        ], 422);
    }

    private function handleBanUser(): void
    {
        $userId = (int) ($_POST['user_id'] ?? 0);
        $reason = trim((string) ($_POST['reason'] ?? ''));
        $durationCode = $this->normalizeBanDurationCode((string) ($_POST['duration_code'] ?? ''));

        if ($userId <= 0 || $reason === '' || $durationCode === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się zablokować użytkownika. Uzupełnij powód i czas blokady.',
            ], 422);
        }

        if ($userId === $this->getCurrentUserId()) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie możesz zablokować własnego konta administratora.',
            ], 422);
        }

        [$durationLabel, $blockedUntil, $isPermanent] = $this->resolveBanDuration($durationCode);

        $this->userRepository->banUserByAdmin(
            $userId,
            $reason,
            $durationCode,
            $durationLabel,
            $blockedUntil,
            $isPermanent
        );

        $user = $this->userRepository->getAdminCatalogUserById($userId);
        if ($user === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się odświeżyć danych użytkownika po blokadzie.',
            ], 500);
        }

        $this->jsonResponse([
            'success' => true,
            'message' => 'Użytkownik został zablokowany.',
            'user' => $this->mapCatalogUserRow($user),
        ]);
    }

    private function handleUnbanUser(): void
    {
        $userId = (int) ($_POST['user_id'] ?? 0);
        if ($userId <= 0) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się odblokować użytkownika.',
            ], 422);
        }

        $this->userRepository->unbanUserByAdmin($userId);
        $user = $this->userRepository->getAdminCatalogUserById($userId);
        if ($user === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się odświeżyć danych użytkownika po odblokowaniu.',
            ], 500);
        }

        $this->jsonResponse([
            'success' => true,
            'message' => 'Użytkownik został odblokowany.',
            'user' => $this->mapCatalogUserRow($user),
        ]);
    }

    private function handleSendUserWarning(): void
    {
        $userId = (int) ($_POST['user_id'] ?? 0);
        $message = $this->normalizeModerationReason($_POST['message'] ?? '');

        if ($userId <= 0 || $message === '') {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Wpisz treść ostrzeżenia przed wysłaniem.',
            ], 422);
        }

        if ($userId === $this->getCurrentUserId()) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie możesz wysłać ostrzeżenia do własnego konta administratora.',
            ], 422);
        }

        $this->userRepository->sendAdminWarning($userId, $message);

        $this->jsonResponse([
            'success' => true,
            'message' => 'Ostrzeżenie zostało wysłane.',
        ]);
    }

    private function normalizeBanDurationCode(string $durationCode): ?string
    {
        $durationCode = trim($durationCode);
        return in_array($durationCode, ['1h', '24h', '3d', '7d', '14d', '1m', '3m', 'permanent'], true)
            ? $durationCode
            : null;
    }

    private function resolveBanDuration(string $durationCode): array
    {
        $now = new DateTimeImmutable('now', new DateTimeZone(self::ADMIN_TIMEZONE));

        return match ($durationCode) {
            '1h' => ['1 godzina', $now->modify('+1 hour')->format('Y-m-d H:i:s'), false],
            '24h' => ['24 godziny', $now->modify('+24 hours')->format('Y-m-d H:i:s'), false],
            '3d' => ['3 dni', $now->modify('+3 days')->format('Y-m-d H:i:s'), false],
            '7d' => ['7 dni', $now->modify('+7 days')->format('Y-m-d H:i:s'), false],
            '14d' => ['14 dni', $now->modify('+14 days')->format('Y-m-d H:i:s'), false],
            '1m' => ['1 miesiąc', $now->modify('+1 month')->format('Y-m-d H:i:s'), false],
            '3m' => ['3 miesiące', $now->modify('+3 months')->format('Y-m-d H:i:s'), false],
            'permanent' => ['Na stałe', null, true],
            default => ['1 godzina', $now->modify('+1 hour')->format('Y-m-d H:i:s'), false],
        };
    }

    private function isUserCurrentlyBlocked(array $user): bool
    {
        if (!(bool) ($user['is_blocked'] ?? false)) {
            return false;
        }

        if ((bool) ($user['blocked_is_permanent'] ?? false)) {
            return true;
        }

        $blockedUntil = trim((string) ($user['blocked_until'] ?? ''));
        return $blockedUntil !== '' && strtotime($blockedUntil) !== false && strtotime($blockedUntil) > time();
    }

    private function formatBanStatusLabel(array $user): string
    {
        if (!$this->isUserCurrentlyBlocked($user)) {
            return '';
        }

        if ((bool) ($user['blocked_is_permanent'] ?? false)) {
            return 'Użytkownik zablokowany na stałe';
        }

        $blockedUntil = $this->createAdminDateTime((string) ($user['blocked_until'] ?? ''));
        if ($blockedUntil === null) {
            return 'Użytkownik zablokowany na stałe';
        }

        return 'Użytkownik zablokowany do: ' . $blockedUntil->format('d.m.Y • H:i');
    }

    private function formatLastBanSummary(array $user): string
    {
        $durationLabel = trim((string) ($user['last_ban_duration_label'] ?? ''));
        if ($durationLabel === '') {
            return 'Brak wcześniejszych blokad.';
        }

        if ((bool) ($user['last_ban_is_permanent'] ?? false)) {
            return 'Ostatnia kara: ' . $durationLabel . '.';
        }

        $lastBanUntil = $this->createAdminDateTime((string) ($user['last_ban_until'] ?? ''));
        if ($lastBanUntil === null) {
            return 'Ostatnia kara: ' . $durationLabel . '.';
        }

        return 'Ostatnia kara: ' . $durationLabel . ' (do ' . $lastBanUntil->format('d.m.Y • H:i') . ').';
    }

    private function formatPresenceStatusLabel(array $user): string
    {
        if ($this->isUserCurrentlyBlocked($user)) {
            return '';
        }

        $lastLoginAt = trim((string) ($user['last_login_at'] ?? ''));
        $timestamp = $lastLoginAt !== '' ? strtotime($lastLoginAt) : false;
        if ($timestamp === false) {
            return 'Offline';
        }

        return $timestamp >= (time() - 600) ? 'Online' : 'Offline';
    }

    private function createAdminDateTime(string $value): ?DateTimeImmutable
    {
        $trimmedValue = trim($value);
        if ($trimmedValue === '') {
            return null;
        }

        try {
            return new DateTimeImmutable($trimmedValue, new DateTimeZone(self::ADMIN_TIMEZONE));
        } catch (Throwable) {
            return null;
        }
    }
}
