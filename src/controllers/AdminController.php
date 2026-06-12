<?php

class AdminController extends AppController
{
    private const CATALOG_USERS_PER_PAGE = 7;
    private const PENDING_VEHICLES_PER_PAGE = 9;
    private const PENDING_BRANDS_PER_PAGE = 4;
    private const PENDING_MODELS_PER_PAGE = 4;
    private const REPORTS_PER_PAGE = 7;
    private const ADMIN_TIMEZONE = 'Europe/Warsaw';

    private UserRepository $userRepository;
    private CarsRepository $carsRepository;
    private ReportsRepository $reportsRepository;

    public function __construct()
    {
        $this->userRepository = new UserRepository(Database::getConnection());
        $this->carsRepository = new CarsRepository(Database::getConnection());
        $this->reportsRepository = new ReportsRepository(Database::getConnection());
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

        if ($this->isAjaxRequest() && isset($_GET['pending_vehicle_page'])) {
            $this->handlePendingVehiclesPage();
        }

        if ($this->isAjaxRequest() && isset($_GET['pending_vehicle_details'])) {
            $this->handlePendingVehicleDetails();
        }

        if ($this->isAjaxRequest() && isset($_GET['pending_brand_page'])) {
            $this->handlePendingBrandsPage();
        }

        if ($this->isAjaxRequest() && isset($_GET['pending_model_page'])) {
            $this->handlePendingModelsPage();
        }

        if ($this->isAjaxRequest() && isset($_GET['report_page'])) {
            $this->handleReportsPage();
        }

        if ($this->isAjaxRequest() && isset($_GET['report_details'])) {
            $this->handleReportDetails();
        }

        $openUserId = $this->normalizeOptionalPositiveInt($_GET['open_user'] ?? null);
        $initialCatalogPage = $openUserId !== null && $openUserId > 0
            ? $this->userRepository->getAdminCatalogPageForUser($openUserId, self::CATALOG_USERS_PER_PAGE)
            : $this->normalizePositiveInt($_GET['catalog_page'] ?? 1);
        $catalog = $this->buildCatalogUsersPayload($initialCatalogPage);
        $pendingVehicles = $this->buildPendingVehiclesPayload($this->normalizePositiveInt($_GET['pending_vehicle_page'] ?? 1));
        $pendingBrands = $this->buildPendingBrandsPayload($this->normalizePositiveInt($_GET['pending_brand_page'] ?? 1));
        $pendingModels = $this->buildPendingModelsPayload($this->normalizePositiveInt($_GET['pending_model_page'] ?? 1));
        $reports = $this->buildReportsPayload($this->normalizePositiveInt($_GET['report_page'] ?? 1));
        $reportStats = $this->buildReportStatsPayload();
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
            'adminPendingVehicles' => $pendingVehicles,
            'adminPendingBrands' => $pendingBrands,
            'adminPendingModels' => $pendingModels,
            'adminReports' => $reports,
            'adminReportStats' => $reportStats,
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

    private function handlePendingVehiclesPage(): void
    {
        $page = $this->normalizePositiveInt($_GET['pending_vehicle_page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'pending_vehicles' => $this->buildPendingVehiclesPayload($page),
        ]);
    }

    private function handlePendingVehicleDetails(): void
    {
        $vehicleId = $this->normalizeOptionalPositiveInt($_GET['pending_vehicle_details'] ?? null);
        if ($vehicleId === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono pojazdu do potwierdzenia.',
            ], 404);
        }

        $vehicle = $this->carsRepository->getAdminPendingVehicleById($vehicleId);
        if ($vehicle === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono pojazdu do potwierdzenia.',
            ], 404);
        }

        $this->jsonResponse([
            'success' => true,
            'vehicle' => $this->mapPendingVehicleDetails($vehicle),
        ]);
    }

    private function handlePendingBrandsPage(): void
    {
        $page = $this->normalizePositiveInt($_GET['pending_brand_page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'pending_brands' => $this->buildPendingBrandsPayload($page),
        ]);
    }

    private function handlePendingModelsPage(): void
    {
        $page = $this->normalizePositiveInt($_GET['pending_model_page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'pending_models' => $this->buildPendingModelsPayload($page),
        ]);
    }

    private function handleReportsPage(): void
    {
        $page = $this->normalizePositiveInt($_GET['report_page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'reports' => $this->buildReportsPayload($page),
            'report_stats' => $this->buildReportStatsPayload(),
        ]);
    }

    private function handleReportDetails(): void
    {
        $reportId = $this->normalizeOptionalPositiveInt($_GET['report_details'] ?? null);
        if ($reportId === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono zgłoszenia.',
            ], 404);
        }

        $report = $this->reportsRepository->getOpenReportById($reportId);
        if ($report === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono zgłoszenia.',
            ], 404);
        }

        $reportedUser = $this->userRepository->getAdminCatalogUserById((int) ($report['reported_user_id'] ?? 0));

        $this->jsonResponse([
            'success' => true,
            'report' => $this->mapReportDetails($report, $reportedUser),
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

    private function buildPendingVehiclesPayload(int $page): array
    {
        $totalVehicles = $this->carsRepository->getAdminPendingVehicleCount();
        $totalPages = max(1, (int) ceil($totalVehicles / self::PENDING_VEHICLES_PER_PAGE));
        $page = min(max(1, $page), $totalPages);
        $rows = array_map(
            fn (array $vehicle): array => $this->mapPendingVehicleRow($vehicle),
            $this->carsRepository->getAdminPendingVehiclesPage($page, self::PENDING_VEHICLES_PER_PAGE)
        );

        return [
            'rows' => $rows,
            'page' => $page,
            'per_page' => self::PENDING_VEHICLES_PER_PAGE,
            'total_items' => $totalVehicles,
            'total_pages' => $totalPages,
        ];
    }

    private function buildPendingBrandsPayload(int $page): array
    {
        $totalBrands = $this->carsRepository->getAdminPendingBrandCount();
        $totalPages = max(1, (int) ceil($totalBrands / self::PENDING_BRANDS_PER_PAGE));
        $page = min(max(1, $page), $totalPages);
        $rows = array_map(
            fn (array $brand): array => $this->mapPendingBrandRow($brand),
            $this->carsRepository->getAdminPendingBrandsPage($page, self::PENDING_BRANDS_PER_PAGE)
        );

        return [
            'rows' => $rows,
            'page' => $page,
            'per_page' => self::PENDING_BRANDS_PER_PAGE,
            'total_items' => $totalBrands,
            'total_pages' => $totalPages,
        ];
    }

    private function buildPendingModelsPayload(int $page): array
    {
        $totalModels = $this->carsRepository->getAdminPendingModelCount();
        $totalPages = max(1, (int) ceil($totalModels / self::PENDING_MODELS_PER_PAGE));
        $page = min(max(1, $page), $totalPages);
        $rows = array_map(
            fn (array $model): array => $this->mapPendingModelRow($model),
            $this->carsRepository->getAdminPendingModelsPage($page, self::PENDING_MODELS_PER_PAGE)
        );

        return [
            'rows' => $rows,
            'page' => $page,
            'per_page' => self::PENDING_MODELS_PER_PAGE,
            'total_items' => $totalModels,
            'total_pages' => $totalPages,
        ];
    }

    private function buildReportsPayload(int $page): array
    {
        $totalReports = $this->reportsRepository->getOpenReportCount();
        $totalPages = max(1, (int) ceil($totalReports / self::REPORTS_PER_PAGE));
        $page = min(max(1, $page), $totalPages);
        $rows = array_map(
            fn (array $report): array => $this->mapReportRow($report),
            $this->reportsRepository->getOpenReportsPage($page, self::REPORTS_PER_PAGE)
        );

        return [
            'rows' => $rows,
            'page' => $page,
            'per_page' => self::REPORTS_PER_PAGE,
            'total_items' => $totalReports,
            'total_pages' => $totalPages,
        ];
    }

    private function buildReportStatsPayload(): array
    {
        $stats = $this->reportsRepository->getOpenReportStats();

        return [
            'total' => (int) ($stats['total'] ?? 0),
            'listings' => (int) ($stats['listings'] ?? 0),
            'posts' => (int) ($stats['posts'] ?? 0),
            'comments' => (int) ($stats['comments'] ?? 0),
            'profiles' => (int) ($stats['profiles'] ?? 0),
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

    private function mapPendingVehicleRow(array $vehicle): array
    {
        return [
            'id' => (int) ($vehicle['id'] ?? 0),
            'title' => trim((string) ($vehicle['display_name'] ?? '')) !== '' ? (string) $vehicle['display_name'] : 'Pojazd',
            'trim_name' => (string) ($vehicle['trim_name'] ?? ''),
            'brand_name' => (string) ($vehicle['brand_name'] ?? ''),
            'model_name' => (string) ($vehicle['model_name'] ?? ''),
            'production_year' => (string) ($vehicle['production_year'] ?? ''),
            'current_mileage_km' => number_format((int) ($vehicle['current_mileage_km'] ?? 0), 0, ',', ' ') . ' km',
            'license_plate' => (string) ($vehicle['license_plate'] ?? ''),
            'vin' => (string) ($vehicle['vin'] ?? ''),
            'exterior_color' => (string) ($vehicle['exterior_color'] ?? ''),
            'image_path' => trim((string) ($vehicle['image_path'] ?? '')),
            'submitted_at_label' => $this->formatAdminDateTimeLabel($vehicle['approval_submitted_at'] ?? null),
        ];
    }

    private function mapPendingVehicleDetails(array $vehicle): array
    {
        $images = array_map(
            static fn (array $image): array => [
                'id' => (int) ($image['id'] ?? 0),
                'path' => (string) ($image['image_path'] ?? ''),
            ],
            (array) ($vehicle['images'] ?? [])
        );

        return [
            'id' => (int) ($vehicle['id'] ?? 0),
            'brand_name' => (string) ($vehicle['brand_name'] ?? ''),
            'model_name' => (string) ($vehicle['model_name'] ?? ''),
            'trim_name' => (string) ($vehicle['trim_name'] ?? ''),
            'production_year' => (string) ($vehicle['production_year'] ?? ''),
            'current_mileage_km' => number_format((int) ($vehicle['current_mileage_km'] ?? 0), 0, ',', ' ') . ' km',
            'license_plate' => (string) ($vehicle['license_plate'] ?? ''),
            'vin' => (string) ($vehicle['vin'] ?? ''),
            'exterior_color' => (string) ($vehicle['exterior_color'] ?? ''),
            'approval_rejection_count' => (int) ($vehicle['approval_rejection_count'] ?? 0),
            'submitted_at_label' => $this->formatAdminDateTimeLabel($vehicle['approval_submitted_at'] ?? null),
            'images' => $images,
        ];
    }

    private function mapPendingBrandRow(array $brand): array
    {
        return [
            'id' => (int) ($brand['id'] ?? 0),
            'name' => trim((string) ($brand['name'] ?? '')) !== '' ? (string) $brand['name'] : 'Brak marki',
        ];
    }

    private function mapPendingModelRow(array $model): array
    {
        return [
            'id' => (int) ($model['id'] ?? 0),
            'model_name' => trim((string) ($model['model_name'] ?? '')) !== '' ? (string) $model['model_name'] : 'Brak modelu',
            'brand_name' => trim((string) ($model['brand_name'] ?? '')) !== '' ? (string) $model['brand_name'] : 'Brak marki',
            'brand_is_approved' => (bool) ($model['brand_is_approved'] ?? false),
        ];
    }

    private function mapReportRow(array $report): array
    {
        return [
            'id' => (int) ($report['id'] ?? 0),
            'content_type' => (string) ($report['content_type'] ?? ''),
            'content_id' => (int) ($report['content_id'] ?? 0),
            'reported_subject' => trim((string) ($report['reported_subject'] ?? '')) !== '' ? (string) $report['reported_subject'] : 'Zgłoszona zawartość',
            'reported_user_id' => (int) ($report['reported_user_id'] ?? 0),
            'reported_user_name' => trim((string) ($report['reported_user_name'] ?? '')) !== '' ? (string) $report['reported_user_name'] : 'Użytkownik',
            'reason_code' => (string) ($report['reason_code'] ?? ''),
            'reason_label' => trim((string) ($report['reason_label'] ?? '')) !== '' ? (string) $report['reason_label'] : 'Brak powodu',
            'reason_text' => trim((string) ($report['reason_text'] ?? '')),
            'target_path' => trim((string) ($report['target_path'] ?? '')) !== '' ? (string) $report['target_path'] : '/dashboard',
            'created_at_label' => $this->formatAdminDateTimeLabel($report['created_at'] ?? null),
        ];
    }

    private function mapReportDetails(array $report, ?array $reportedUser): array
    {
        $mapped = $this->mapReportRow($report);
        $mapped['reporter_user_name'] = trim((string) ($report['reporter_user_name'] ?? '')) !== ''
            ? (string) $report['reporter_user_name']
            : 'Użytkownik';
        $mapped['reported_user'] = $reportedUser !== null ? $this->mapCatalogUserRow($reportedUser) : null;

        return $mapped;
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

        if ($action === 'approve_vehicle') {
            $this->handleApproveVehicle();
            return;
        }

        if ($action === 'reject_vehicle') {
            $this->handleRejectVehicle();
            return;
        }

        if ($action === 'delete_vehicle') {
            $this->handleDeleteVehicle();
            return;
        }

        if ($action === 'approve_brand') {
            $this->handleApproveBrand();
            return;
        }

        if ($action === 'delete_brand') {
            $this->handleDeleteBrand();
            return;
        }

        if ($action === 'approve_model') {
            $this->handleApproveModel();
            return;
        }

        if ($action === 'delete_model') {
            $this->handleDeleteModel();
            return;
        }

        if ($action === 'close_report') {
            $this->handleCloseReport();
            return;
        }

        if ($action === 'remove_reported_listing') {
            $this->handleRemoveReportedListing();
            return;
        }

        if ($action === 'remove_reported_post') {
            $this->handleRemoveReportedPost();
            return;
        }

        if ($action === 'remove_reported_comment') {
            $this->handleRemoveReportedComment();
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

    private function handleApproveVehicle(): void
    {
        $vehicleId = $this->normalizeOptionalPositiveInt($_POST['vehicle_id'] ?? null);
        if ($vehicleId === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono pojazdu do potwierdzenia.',
            ], 422);
        }

        $vehicle = $this->carsRepository->getAdminPendingVehicleById($vehicleId);
        if ($vehicle === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Pojazd nie jest już dostępny w kolejce.',
            ], 404);
        }

        $this->carsRepository->approveVehicleByAdmin($vehicleId);
        (new NotificationRepository(Database::getConnection()))->createVehicleApprovedNotification(
            (int) ($vehicle['user_id'] ?? 0),
            $vehicleId,
            (string) ($vehicle['display_name'] ?? '')
        );

        $this->jsonResponse([
            'success' => true,
            'message' => 'Pojazd został zatwierdzony.',
            'pending_vehicles' => $this->buildPendingVehiclesPayload($this->normalizePositiveInt($_POST['page'] ?? 1)),
        ]);
    }

    private function handleRejectVehicle(): void
    {
        $vehicleId = $this->normalizeOptionalPositiveInt($_POST['vehicle_id'] ?? null);
        $reason = $this->normalizeModerationReason($_POST['reason'] ?? '');
        $fields = array_values(array_filter(array_map(
            static fn (mixed $field): string => trim((string) $field),
            (array) ($_POST['fields'] ?? [])
        )));

        if ($vehicleId === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono pojazdu do odrzucenia.',
            ], 422);
        }

        if ($reason === '' && $fields === []) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Wskaż błędne pola albo wpisz powód odrzucenia.',
            ], 422);
        }

        if ($reason === '') {
            $reason = 'Administrator wymaga poprawy oznaczonych danych pojazdu.';
        }

        $vehicle = $this->carsRepository->getAdminPendingVehicleById($vehicleId);
        if ($vehicle === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Pojazd nie jest już dostępny w kolejce.',
            ], 404);
        }

        $this->carsRepository->rejectVehicleByAdmin($vehicleId, $reason, $fields);
        (new NotificationRepository(Database::getConnection()))->createVehicleRejectedNotification(
            (int) ($vehicle['user_id'] ?? 0),
            $vehicleId,
            (string) ($vehicle['display_name'] ?? ''),
            $reason
        );

        $this->jsonResponse([
            'success' => true,
            'message' => 'Pojazd został odrzucony i oczekuje na poprawę danych.',
            'pending_vehicles' => $this->buildPendingVehiclesPayload($this->normalizePositiveInt($_POST['page'] ?? 1)),
        ]);
    }

    private function handleDeleteVehicle(): void
    {
        $vehicleId = $this->normalizeOptionalPositiveInt($_POST['vehicle_id'] ?? null);
        if ($vehicleId === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono pojazdu do usunięcia.',
            ], 422);
        }

        $vehicle = $this->carsRepository->getAdminPendingVehicleById($vehicleId);
        if ($vehicle === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Pojazd nie jest już dostępny w kolejce.',
            ], 404);
        }

        if (!$this->carsRepository->deleteVehicleByAdmin($vehicleId)) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć pojazdu.',
            ], 409);
        }

        (new NotificationRepository(Database::getConnection()))->createVehicleRemovedNotification(
            (int) ($vehicle['user_id'] ?? 0),
            (string) ($vehicle['display_name'] ?? ''),
            'Administrator usunął samochód podczas weryfikacji.'
        );

        $this->jsonResponse([
            'success' => true,
            'message' => 'Pojazd został usunięty.',
            'pending_vehicles' => $this->buildPendingVehiclesPayload($this->normalizePositiveInt($_POST['page'] ?? 1)),
        ]);
    }

    private function handleApproveBrand(): void
    {
        $brandId = $this->normalizeOptionalPositiveInt($_POST['brand_id'] ?? null);
        if ($brandId === null || !$this->carsRepository->approveBrandByAdmin($brandId)) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się zatwierdzić marki.',
            ], 422);
        }

        $this->jsonResponse([
            'success' => true,
            'message' => 'Marka została zatwierdzona.',
            'pending_brands' => $this->buildPendingBrandsPayload($this->normalizePositiveInt($_POST['brand_page'] ?? 1)),
            'pending_models' => $this->buildPendingModelsPayload($this->normalizePositiveInt($_POST['model_page'] ?? 1)),
        ]);
    }

    private function handleDeleteBrand(): void
    {
        $brandId = $this->normalizeOptionalPositiveInt($_POST['brand_id'] ?? null);
        $deleteContext = $brandId !== null ? $this->carsRepository->deleteBrandByAdmin($brandId) : null;
        if ($brandId === null || $deleteContext === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć marki.',
            ], 422);
        }

        $notifications = new NotificationRepository(Database::getConnection());
        foreach ((array) ($deleteContext['vehicles'] ?? []) as $vehicle) {
            $notifications->createVehicleRemovedNotification(
                (int) ($vehicle['user_id'] ?? 0),
                (string) ($vehicle['display_name'] ?? ''),
                'nieprawidłowej marki pojazdu.'
            );
        }
        foreach ((array) ($deleteContext['listings'] ?? []) as $listing) {
            $notifications->createAdminListingRemovalNotification(
                (int) ($listing['user_id'] ?? 0),
                (string) ($listing['title'] ?? ''),
                'nieprawidłowej marki pojazdu.'
            );
        }

        $this->jsonResponse([
            'success' => true,
            'message' => 'Marka oraz powiązane samochody i ogłoszenia zostały usunięte.',
            'pending_brands' => $this->buildPendingBrandsPayload($this->normalizePositiveInt($_POST['brand_page'] ?? 1)),
            'pending_models' => $this->buildPendingModelsPayload($this->normalizePositiveInt($_POST['model_page'] ?? 1)),
        ]);
    }

    private function handleApproveModel(): void
    {
        $modelId = $this->normalizeOptionalPositiveInt($_POST['model_id'] ?? null);
        if ($modelId === null || !$this->carsRepository->approveModelByAdmin($modelId)) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się zatwierdzić modelu. Najpierw zatwierdź markę.',
            ], 422);
        }

        $this->jsonResponse([
            'success' => true,
            'message' => 'Model został zatwierdzony.',
            'pending_brands' => $this->buildPendingBrandsPayload($this->normalizePositiveInt($_POST['brand_page'] ?? 1)),
            'pending_models' => $this->buildPendingModelsPayload($this->normalizePositiveInt($_POST['model_page'] ?? 1)),
        ]);
    }

    private function handleDeleteModel(): void
    {
        $modelId = $this->normalizeOptionalPositiveInt($_POST['model_id'] ?? null);
        $deleteContext = $modelId !== null ? $this->carsRepository->deleteModelByAdmin($modelId) : null;
        if ($modelId === null || $deleteContext === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć modelu.',
            ], 422);
        }

        $notifications = new NotificationRepository(Database::getConnection());
        foreach ((array) ($deleteContext['vehicles'] ?? []) as $vehicle) {
            $notifications->createVehicleRemovedNotification(
                (int) ($vehicle['user_id'] ?? 0),
                (string) ($vehicle['display_name'] ?? ''),
                'nieprawidłowego modelu pojazdu.'
            );
        }
        foreach ((array) ($deleteContext['listings'] ?? []) as $listing) {
            $notifications->createAdminListingRemovalNotification(
                (int) ($listing['user_id'] ?? 0),
                (string) ($listing['title'] ?? ''),
                'nieprawidłowego modelu pojazdu.'
            );
        }

        $this->jsonResponse([
            'success' => true,
            'message' => 'Model oraz powiązane samochody i ogłoszenia zostały usunięte.',
            'pending_brands' => $this->buildPendingBrandsPayload($this->normalizePositiveInt($_POST['brand_page'] ?? 1)),
            'pending_models' => $this->buildPendingModelsPayload($this->normalizePositiveInt($_POST['model_page'] ?? 1)),
        ]);
    }

    private function handleCloseReport(): void
    {
        $reportId = $this->normalizeOptionalPositiveInt($_POST['report_id'] ?? null);
        if ($reportId === null || !$this->reportsRepository->closeReport($reportId, $this->getCurrentUserId())) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się zamknąć zgłoszenia.',
            ], 422);
        }

        $page = $this->normalizePositiveInt($_POST['page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'message' => 'Zgłoszenie zostało zamknięte.',
            'reports' => $this->buildReportsPayload($page),
            'report_stats' => $this->buildReportStatsPayload(),
        ]);
    }

    private function handleRemoveReportedListing(): void
    {
        $reportId = $this->normalizeOptionalPositiveInt($_POST['report_id'] ?? null);
        $listingId = $this->normalizeOptionalPositiveInt($_POST['listing_id'] ?? null);
        $reason = $this->normalizeModerationReason($_POST['reason'] ?? '');

        if ($reportId === null || $listingId === null || $reason === '') {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć zgłoszonego ogłoszenia.',
            ], 422);
        }

        $report = $this->reportsRepository->getOpenReportById($reportId);
        if ($report === null || (string) ($report['content_type'] ?? '') !== 'listing' || (int) ($report['content_id'] ?? 0) !== $listingId) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono zgłoszenia dla tego ogłoszenia.',
            ], 404);
        }

        $marketplaceRepository = new MarketplaceRepository(Database::getConnection());
        $imagePaths = $marketplaceRepository->getListingImagePaths($listingId);
        $adminDeleteResult = $marketplaceRepository->deleteListingByAdmin($listingId);
        if ($adminDeleteResult === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć zgłoszonego ogłoszenia.',
            ], 409);
        }

        $this->deleteMarketplaceUploadedFiles($imagePaths);
        (new NotificationRepository(Database::getConnection()))
            ->createAdminListingRemovalNotification(
                (int) ($adminDeleteResult['user_id'] ?? 0),
                (string) ($adminDeleteResult['title'] ?? ''),
                $reason
            );
        $this->reportsRepository->closeReport($reportId, $this->getCurrentUserId());

        $page = $this->normalizePositiveInt($_POST['page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'message' => 'Ogłoszenie zostało usunięte.',
            'reports' => $this->buildReportsPayload($page),
            'report_stats' => $this->buildReportStatsPayload(),
        ]);
    }

    private function handleRemoveReportedPost(): void
    {
        $reportId = $this->normalizeOptionalPositiveInt($_POST['report_id'] ?? null);
        $postId = $this->normalizeOptionalPositiveInt($_POST['post_id'] ?? null);
        $reason = $this->normalizeModerationReason($_POST['reason'] ?? '');

        if ($reportId === null || $postId === null || $reason === '') {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć zgłoszonego posta.',
            ], 422);
        }

        $report = $this->reportsRepository->getOpenReportById($reportId);
        if ($report === null || (string) ($report['content_type'] ?? '') !== 'post' || (int) ($report['content_id'] ?? 0) !== $postId) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono zgłoszenia dla tego posta.',
            ], 404);
        }

        $communityRepository = new CommunityRepository(Database::getConnection());
        $adminDeleteResult = $communityRepository->deletePostByAdmin($postId);
        if ($adminDeleteResult === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć zgłoszonego posta.',
            ], 409);
        }

        $this->deleteCommunityUploadedFiles((array) ($adminDeleteResult['image_paths'] ?? []));
        (new NotificationRepository(Database::getConnection()))
            ->createAdminPostRemovalNotification(
                (int) ($adminDeleteResult['user_id'] ?? 0),
                (string) ($adminDeleteResult['content'] ?? ''),
                $reason
            );
        $this->reportsRepository->closeReport($reportId, $this->getCurrentUserId());

        $page = $this->normalizePositiveInt($_POST['page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'message' => 'Post został usunięty.',
            'reports' => $this->buildReportsPayload($page),
            'report_stats' => $this->buildReportStatsPayload(),
        ]);
    }

    private function handleRemoveReportedComment(): void
    {
        $reportId = $this->normalizeOptionalPositiveInt($_POST['report_id'] ?? null);
        $commentId = $this->normalizeOptionalPositiveInt($_POST['comment_id'] ?? null);
        $reason = $this->normalizeModerationReason($_POST['reason'] ?? '');

        if ($reportId === null || $commentId === null || $reason === '') {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć zgłoszonego komentarza.',
            ], 422);
        }

        $report = $this->reportsRepository->getOpenReportById($reportId);
        if ($report === null || (string) ($report['content_type'] ?? '') !== 'comment' || (int) ($report['content_id'] ?? 0) !== $commentId) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie znaleziono zgłoszenia dla tego komentarza.',
            ], 404);
        }

        $communityRepository = new CommunityRepository(Database::getConnection());
        $adminDeleteResult = $communityRepository->deleteCommentByAdmin($commentId);
        if ($adminDeleteResult === null) {
            $this->jsonResponse([
                'success' => false,
                'message' => 'Nie udało się usunąć zgłoszonego komentarza.',
            ], 409);
        }

        (new NotificationRepository(Database::getConnection()))
            ->createAdminCommentRemovalNotification(
                (int) ($adminDeleteResult['user_id'] ?? 0),
                (string) ($adminDeleteResult['content'] ?? ''),
                $reason
            );
        $this->reportsRepository->closeReport($reportId, $this->getCurrentUserId());

        $page = $this->normalizePositiveInt($_POST['page'] ?? 1);
        $this->jsonResponse([
            'success' => true,
            'message' => 'Komentarz został usunięty.',
            'reports' => $this->buildReportsPayload($page),
            'report_stats' => $this->buildReportStatsPayload(),
        ]);
    }

    private function deleteMarketplaceUploadedFiles(array $imagePaths): void
    {
        foreach ($imagePaths as $imagePath) {
            $resolvedPath = $this->resolvePublicPathToFilesystem((string) $imagePath);
            if ($resolvedPath !== null && is_file($resolvedPath)) {
                @unlink($resolvedPath);
            }
        }
    }

    private function deleteCommunityUploadedFiles(array $imagePaths): void
    {
        foreach ($imagePaths as $imagePath) {
            $resolvedPath = $this->resolvePublicPathToFilesystem((string) $imagePath);
            if ($resolvedPath !== null && is_file($resolvedPath)) {
                @unlink($resolvedPath);
            }
        }
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

    private function formatAdminDateTimeLabel(?string $value): string
    {
        $dateTime = $this->createAdminDateTime((string) $value);
        if ($dateTime === null) {
            return '';
        }

        return $dateTime->format('d.m.Y • H:i');
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
