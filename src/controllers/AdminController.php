<?php

class AdminController extends AppController
{
    private const CATALOG_USERS_PER_PAGE = 7;
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

        if ($this->isAjaxRequest() && isset($_GET['catalog_search'])) {
            $this->handleCatalogUserSearch();
        }

        $openUserId = $this->normalizeOptionalPositiveInt($_GET['open_user'] ?? null);
        $initialCatalogPage = $openUserId !== null && $openUserId > 0
            ? $this->userRepository->getAdminCatalogPageForUser($openUserId, self::CATALOG_USERS_PER_PAGE)
            : $this->normalizePositiveInt($_GET['catalog_page'] ?? 1);
        $catalog = $this->buildCatalogUsersPayload($initialCatalogPage);
        $globalStats = $this->userRepository->getAdminGlobalStats();

        $this->render('admin_panel', [
            'title' => 'Panel zarządzania / Użytkownicy',
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
            'adminCatalogOpenUserId' => $openUserId,
            'adminGlobalStats' => $globalStats,
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

    private function handleCatalogUserSearch(): void
    {
        $query = trim((string) ($_GET['catalog_search'] ?? ''));
        if ($query === '') {
            $this->jsonResponse([
                'success' => true,
                'suggestions' => [],
            ]);
        }

        $rows = $this->userRepository->searchAdminCatalogUsers($query, 6);
        $suggestions = array_map(function (array $user): array {
            $mapped = $this->mapCatalogUserRow($user);

            return [
                'id' => (int) ($mapped['id'] ?? 0),
                'pseudonym' => (string) ($mapped['pseudonym'] ?? ''),
                'full_name' => (string) ($mapped['full_name'] ?? ''),
                'email' => (string) ($mapped['email'] ?? ''),
                'avatar_path' => (string) ($mapped['avatar_path'] ?? ''),
                'page' => $this->userRepository->getAdminCatalogPageForUser((int) ($mapped['id'] ?? 0), self::CATALOG_USERS_PER_PAGE),
            ];
        }, $rows);

        $this->jsonResponse([
            'success' => true,
            'suggestions' => $suggestions,
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
            'is_blocked' => $this->isAccountRestrictionActive($user),
            'blocked_until_label' => $this->formatAccountRestrictionLabel($user),
            'blocked_reason' => (string) ($user['blocked_reason'] ?? ''),
            'last_ban_summary' => $this->formatLastRestrictionSummary($user, 'account'),
            'is_community_blocked' => $this->isCommunityRestrictionActive($user),
            'community_blocked_until_label' => $this->formatCommunityRestrictionLabel($user),
            'community_blocked_reason' => (string) ($user['community_block_reason'] ?? ''),
            'last_community_block_summary' => $this->formatLastRestrictionSummary($user, 'community'),
            'is_marketplace_blocked' => $this->isMarketplaceRestrictionActive($user),
            'marketplace_blocked_until_label' => $this->formatMarketplaceRestrictionLabel($user),
            'marketplace_blocked_reason' => (string) ($user['marketplace_block_reason'] ?? ''),
            'last_marketplace_block_summary' => $this->formatLastRestrictionSummary($user, 'marketplace'),
            'restriction_status_label' => $this->formatCatalogStatusLabel($user),
            'presence_label' => $this->formatPresenceStatusLabel($user),
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

    private function normalizeOptionalPositiveInt(mixed $value): ?int
    {
        if (filter_var($value, FILTER_VALIDATE_INT) === false) {
            return null;
        }

        $normalizedValue = (int) $value;
        return $normalizedValue > 0 ? $normalizedValue : null;
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

        if ($action === 'block_community_functions') {
            $this->handleCommunityBlockUser();
            return;
        }

        if ($action === 'unblock_community_functions') {
            $this->handleCommunityUnblockUser();
            return;
        }

        if ($action === 'block_marketplace_functions') {
            $this->handleMarketplaceBlockUser();
            return;
        }

        if ($action === 'unblock_marketplace_functions') {
            $this->handleMarketplaceUnblockUser();
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

        $user = $this->requireAdminCatalogUser($userId, 'Nie udało się odświeżyć danych użytkownika po blokadzie.');

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
        $user = $this->requireAdminCatalogUser($userId, 'Nie udało się odświeżyć danych użytkownika po odblokowaniu.');

        $this->jsonResponse([
            'success' => true,
            'message' => 'Użytkownik został odblokowany.',
            'user' => $this->mapCatalogUserRow($user),
        ]);
    }

    private function handleCommunityBlockUser(): void
    {
        $userId = (int) ($_POST['user_id'] ?? 0);
        $reason = trim((string) ($_POST['reason'] ?? ''));
        $durationCode = $this->normalizeBanDurationCode((string) ($_POST['duration_code'] ?? ''));

        if ($userId <= 0 || $reason === '' || $durationCode === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się ograniczyć funkcji społeczności. Uzupełnij powód i czas blokady.',
            ], 422);
        }

        if ($userId === $this->getCurrentUserId()) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie możesz ograniczyć własnego konta administratora.',
            ], 422);
        }

        $currentUser = $this->requireAdminCatalogUser($userId, 'Nie udało się pobrać danych użytkownika.');
        if ($this->isAccountRestrictionActive($currentUser)) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Najpierw odblokuj konto użytkownika, a dopiero potem ogranicz funkcje społeczności.',
            ], 422);
        }

        [$durationLabel, $blockedUntil, $isPermanent] = $this->resolveBanDuration($durationCode);
        $this->userRepository->blockCommunityFunctionsByAdmin(
            $userId,
            $reason,
            $durationCode,
            $durationLabel,
            $blockedUntil,
            $isPermanent
        );

        $user = $this->requireAdminCatalogUser($userId, 'Nie udało się odświeżyć danych użytkownika po ograniczeniu funkcji społeczności.');

        $this->jsonResponse([
            'success' => true,
            'message' => 'Funkcje społeczności zostały ograniczone.',
            'user' => $this->mapCatalogUserRow($user),
        ]);
    }

    private function handleCommunityUnblockUser(): void
    {
        $userId = (int) ($_POST['user_id'] ?? 0);
        if ($userId <= 0) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się odblokować funkcji społeczności.',
            ], 422);
        }

        $this->userRepository->unblockCommunityFunctionsByAdmin($userId);
        $user = $this->requireAdminCatalogUser($userId, 'Nie udało się odświeżyć danych użytkownika po odblokowaniu funkcji społeczności.');

        $this->jsonResponse([
            'success' => true,
            'message' => 'Funkcje społeczności zostały odblokowane.',
            'user' => $this->mapCatalogUserRow($user),
        ]);
    }

    private function handleMarketplaceBlockUser(): void
    {
        $userId = (int) ($_POST['user_id'] ?? 0);
        $reason = trim((string) ($_POST['reason'] ?? ''));
        $durationCode = $this->normalizeBanDurationCode((string) ($_POST['duration_code'] ?? ''));

        if ($userId <= 0 || $reason === '' || $durationCode === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się ograniczyć funkcji marketplace. Uzupełnij powód i czas blokady.',
            ], 422);
        }

        if ($userId === $this->getCurrentUserId()) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie możesz ograniczyć własnego konta administratora.',
            ], 422);
        }

        $currentUser = $this->requireAdminCatalogUser($userId, 'Nie udało się pobrać danych użytkownika.');
        if ($this->isAccountRestrictionActive($currentUser)) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Najpierw odblokuj konto użytkownika, a dopiero potem ogranicz funkcje marketplace.',
            ], 422);
        }

        [$durationLabel, $blockedUntil, $isPermanent] = $this->resolveBanDuration($durationCode);
        $this->userRepository->blockMarketplaceFunctionsByAdmin(
            $userId,
            $reason,
            $durationCode,
            $durationLabel,
            $blockedUntil,
            $isPermanent
        );

        $user = $this->requireAdminCatalogUser($userId, 'Nie udało się odświeżyć danych użytkownika po ograniczeniu funkcji marketplace.');

        $this->jsonResponse([
            'success' => true,
            'message' => 'Funkcje marketplace zostały ograniczone.',
            'user' => $this->mapCatalogUserRow($user),
        ]);
    }

    private function handleMarketplaceUnblockUser(): void
    {
        $userId = (int) ($_POST['user_id'] ?? 0);
        if ($userId <= 0) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się odblokować funkcji marketplace.',
            ], 422);
        }

        $this->userRepository->unblockMarketplaceFunctionsByAdmin($userId);
        $user = $this->requireAdminCatalogUser($userId, 'Nie udało się odświeżyć danych użytkownika po odblokowaniu funkcji marketplace.');

        $this->jsonResponse([
            'success' => true,
            'message' => 'Funkcje marketplace zostały odblokowane.',
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

    private function isAccountRestrictionActive(array $user): bool
    {
        return (bool) ($user['is_blocked'] ?? false)
            && $this->isTimedRestrictionActive(
                $user['blocked_until'] ?? null,
                (bool) ($user['blocked_is_permanent'] ?? false)
            );
    }

    private function isCommunityRestrictionActive(array $user): bool
    {
        return $this->isTimedRestrictionActive(
            $user['community_blocked_until'] ?? null,
            (bool) ($user['community_block_is_permanent'] ?? false)
        );
    }

    private function isMarketplaceRestrictionActive(array $user): bool
    {
        return $this->isTimedRestrictionActive(
            $user['marketplace_blocked_until'] ?? null,
            (bool) ($user['marketplace_block_is_permanent'] ?? false)
        );
    }

    private function formatAccountRestrictionLabel(array $user): string
    {
        if (!$this->isAccountRestrictionActive($user)) {
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

    private function formatCommunityRestrictionLabel(array $user): string
    {
        if (!$this->isCommunityRestrictionActive($user)) {
            return '';
        }

        if ((bool) ($user['community_block_is_permanent'] ?? false)) {
            return 'Społeczność zablokowana na stałe';
        }

        $blockedUntil = $this->createAdminDateTime((string) ($user['community_blocked_until'] ?? ''));
        if ($blockedUntil === null) {
            return 'Społeczność zablokowana na stałe';
        }

        return 'Społeczność zablokowana do: ' . $blockedUntil->format('d.m.Y • H:i');
    }

    private function formatMarketplaceRestrictionLabel(array $user): string
    {
        if (!$this->isMarketplaceRestrictionActive($user)) {
            return '';
        }

        if ((bool) ($user['marketplace_block_is_permanent'] ?? false)) {
            return 'Marketplace zablokowany na stałe';
        }

        $blockedUntil = $this->createAdminDateTime((string) ($user['marketplace_blocked_until'] ?? ''));
        if ($blockedUntil === null) {
            return 'Marketplace zablokowany na stałe';
        }

        return 'Marketplace zablokowany do: ' . $blockedUntil->format('d.m.Y • H:i');
    }

    private function formatCatalogStatusLabel(array $user): string
    {
        $accountLabel = $this->formatAccountRestrictionLabel($user);
        if ($accountLabel !== '') {
            return $accountLabel;
        }

        $communityLabel = $this->formatCommunityRestrictionLabel($user);
        $marketplaceLabel = $this->formatMarketplaceRestrictionLabel($user);
        if ($communityLabel !== '' && $marketplaceLabel !== '') {
            return $communityLabel . ' / ' . $marketplaceLabel;
        }

        return $communityLabel !== '' ? $communityLabel : $marketplaceLabel;
    }

    private function formatLastRestrictionSummary(array $user, string $type): string
    {
        [$durationKey, $untilKey, $permanentKey, $emptyMessage] = match ($type) {
            'community' => [
                'last_community_block_duration_label',
                'last_community_block_until',
                'last_community_block_is_permanent',
                'Brak wcześniejszych ograniczeń społeczności.',
            ],
            'marketplace' => [
                'last_marketplace_block_duration_label',
                'last_marketplace_block_until',
                'last_marketplace_block_is_permanent',
                'Brak wcześniejszych ograniczeń marketplace.',
            ],
            default => [
                'last_ban_duration_label',
                'last_ban_until',
                'last_ban_is_permanent',
                'Brak wcześniejszych blokad.',
            ],
        };

        $durationLabel = trim((string) ($user[$durationKey] ?? ''));
        if ($durationLabel === '') {
            return $emptyMessage;
        }

        if ((bool) ($user[$permanentKey] ?? false)) {
            return 'Ostatnia kara: ' . $durationLabel . '.';
        }

        $until = $this->createAdminDateTime((string) ($user[$untilKey] ?? ''));
        if ($until === null) {
            return 'Ostatnia kara: ' . $durationLabel . '.';
        }

        return 'Ostatnia kara: ' . $durationLabel . ' (do ' . $until->format('d.m.Y • H:i') . ').';
    }

    private function formatPresenceStatusLabel(array $user): string
    {
        if ($this->formatCatalogStatusLabel($user) !== '') {
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

    private function requireAdminCatalogUser(int $userId, string $errorMessage): array
    {
        $user = $this->userRepository->getAdminCatalogUserById($userId);
        if ($user === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => $errorMessage,
            ], 500);
        }

        $currentRestrictionState = $this->userRepository->getById($userId);
        if ($currentRestrictionState !== null) {
            $user['community_blocked_until'] = $currentRestrictionState['community_blocked_until'] ?? null;
            $user['community_block_reason'] = $currentRestrictionState['community_block_reason'] ?? null;
            $user['community_block_is_permanent'] = $currentRestrictionState['community_block_is_permanent'] ?? false;
            $user['marketplace_blocked_until'] = $currentRestrictionState['marketplace_blocked_until'] ?? null;
            $user['marketplace_block_reason'] = $currentRestrictionState['marketplace_block_reason'] ?? null;
            $user['marketplace_block_is_permanent'] = $currentRestrictionState['marketplace_block_is_permanent'] ?? false;
            $user['blocked_until'] = $currentRestrictionState['blocked_until'] ?? ($user['blocked_until'] ?? null);
            $user['blocked_reason'] = $currentRestrictionState['blocked_reason'] ?? ($user['blocked_reason'] ?? null);
            $user['blocked_is_permanent'] = $currentRestrictionState['blocked_is_permanent'] ?? ($user['blocked_is_permanent'] ?? false);
            $user['is_blocked'] = $currentRestrictionState['is_blocked'] ?? ($user['is_blocked'] ?? false);
        }

        return $user;
    }
}
