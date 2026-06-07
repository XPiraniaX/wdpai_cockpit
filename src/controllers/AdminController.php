<?php

class AdminController extends AppController
{
    private const CATALOG_USERS_PER_PAGE = 5;

    private UserRepository $userRepository;

    public function __construct()
    {
        $this->userRepository = new UserRepository(Database::getConnection());
    }

    public function index(): void
    {
        $this->requireAdmin();

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
}
