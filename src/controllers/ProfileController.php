<?php

class ProfileController extends CommunityController
{
    private const PROFILE_POST_PAGE_SIZE = 10;
    private const PROFILE_LISTING_PAGE_SIZE = 10;

    public function index(): void
    {
        $this->requireAuthentication();

        $repository = new CommunityRepository(Database::getConnection());
        $marketplaceRepository = new MarketplaceRepository(Database::getConnection());
        $carsRepository = new CarsRepository(Database::getConnection());
        $userRepository = new UserRepository(Database::getConnection());
        $currentUserId = $this->getCurrentUserId();
        $isAdminProfileView = $this->isAdmin() && (string) ($_GET['admin_preview'] ?? '') === '1';
        $requestedPseudonym = trim((string) ($_GET['pseudonym'] ?? ''));
        $requestedId = isset($_GET['id']) ? (int) $_GET['id'] : null;
        $profileUserId = $requestedId ?? $currentUserId;
        $activityScope = $this->resolveProfileActivityScope((string) ($_GET['scope'] ?? ''));

        if ($requestedPseudonym === '' && $profileUserId <= 0) {
            $this->redirect('/profile');
        }

        if ($this->isPost() && (string) ($_POST['action'] ?? '') === 'upload_profile_avatar') {
            $this->handleAvatarUpload($repository, $userRepository, $currentUserId, $requestedPseudonym, $requestedId);
            return;
        }

        if ($this->isPost() && (string) ($_POST['action'] ?? '') === 'report_profile') {
            $this->handleProfileReport($repository, $currentUserId, $requestedPseudonym, $requestedId);
            return;
        }

        if ($this->isPost()) {
            $this->handlePostAction($repository, $currentUserId);
            return;
        }

        if ($requestedPseudonym !== '') {
            $profile = $repository->getProfileByPseudonym($requestedPseudonym);
        } else {
            $profile = $repository->getProfile($profileUserId);
            if ($profile !== null && trim((string) ($profile['pseudonym'] ?? '')) !== '') {
                $query = $_GET;
                unset($query['id'], $query['pseudonym']);

                $redirectBasePath = $isAdminProfileView ? '/admin/profile/' : '/profile/';
                $redirectPath = $redirectBasePath . rawurlencode((string) $profile['pseudonym']);
                if ($query !== []) {
                    $redirectPath .= '?' . http_build_query($query);
                }

                $this->redirect($redirectPath);
            }
        }

        if ($profile === null) {
            http_response_code(404);
            $this->render('404', [
                'title' => '404 - Profil nie istnieje',
            ]);
            return;
        }

        $profileUserId = (int) $profile['id'];
        $isOwnProfile = $profileUserId === $currentUserId;
        if ($this->isAdmin() && !$isOwnProfile && !$isAdminProfileView) {
            $query = $_GET;
            unset($query['id'], $query['pseudonym'], $query['admin_preview']);

            $adminProfilePath = !empty($profile['pseudonym'])
                ? '/admin/profile/' . rawurlencode((string) $profile['pseudonym'])
                : '/admin/profile?id=' . $profileUserId . '&admin_preview=1';

            if ($query !== []) {
                $adminProfilePath .= (str_contains($adminProfilePath, '?') ? '&' : '?') . http_build_query($query);
            }

            $this->redirect($adminProfilePath);
        }

        $canBypassPrivacy = $isAdminProfileView && !$isOwnProfile;
        $isProfileCurrentlyBlocked = (bool) ($profile['is_currently_banned'] ?? false);
        $isBlockedForRegularViewer = $isProfileCurrentlyBlocked && !$isOwnProfile && !$canBypassPrivacy;
        $canViewFullName = !$isBlockedForRegularViewer
            && ($isOwnProfile || $canBypassPrivacy || (($profile['privacy_full_name_visibility'] ?? 'public') === 'public'));
        $canViewMembershipTier = !$isBlockedForRegularViewer
            && ($isOwnProfile || $canBypassPrivacy || (($profile['privacy_membership_visibility'] ?? 'public') === 'public'));
        $canViewPosts = !$isBlockedForRegularViewer
            && ($isOwnProfile || $canBypassPrivacy || (($profile['privacy_profile_posts_visibility'] ?? 'public') === 'public'));
        $canViewListings = !$isBlockedForRegularViewer
            && ($isOwnProfile || $canBypassPrivacy || (($profile['privacy_profile_listings_visibility'] ?? 'public') === 'public'));
        $activityScopes = [];
        if ($canViewPosts) {
            $activityScopes['posts'] = 'Posty';
        }
        if ($canViewListings) {
            $activityScopes['listings'] = 'Ogłoszenia';
        }
        if (!array_key_exists($activityScope, $activityScopes)) {
            $activityScope = array_key_first($activityScopes) ?? 'none';
        }
        $requestedScope = trim((string) ($_GET['scope'] ?? ''));
        if ($requestedScope === '') {
            $activityScope = 'none';
        }

        $listingVisibility = ($isOwnProfile || $canBypassPrivacy)
            ? $this->resolveProfileListingVisibility((string) ($_GET['listing_visibility'] ?? 'all'))
            : 'active';

        if ($this->isAjaxRequest() && (string) ($_GET['profile_stats'] ?? '') === '1') {
            $this->jsonResponse([
                'success' => true,
                'vehicle_count' => (int) ($profile['vehicle_count'] ?? 0),
                'post_count' => (int) ($profile['post_count'] ?? 0),
                'listing_count' => (int) ($profile['listing_count'] ?? 0),
            ]);
        }

        if ($this->isAjaxRequest() && $this->isProfileFeedPageRequest()) {
            if ($activityScope === 'posts') {
                $feedPage = $repository->getFeedPageByUser(
                    $currentUserId,
                    $profileUserId,
                    self::PROFILE_POST_PAGE_SIZE,
                    $this->resolveCursorCreatedAt(),
                    $this->resolveCursorId(),
                    $canBypassPrivacy
                );
                $mappedPosts = $this->mapPosts($feedPage['posts']);

                $this->jsonResponse([
                    'success' => true,
                    'html' => $this->renderCommunityPostsHtml($mappedPosts, $isAdminProfileView),
                    'has_more' => $feedPage['has_more'],
                    'next_cursor_created_at' => $feedPage['next_cursor_created_at'],
                    'next_cursor_id' => $feedPage['next_cursor_id'],
                ]);
            }

            if ($activityScope === 'listings') {
                $feedPage = $marketplaceRepository->getListingsByUserPage(
                    $currentUserId,
                    $profileUserId,
                    $listingVisibility,
                    self::PROFILE_LISTING_PAGE_SIZE,
                    $this->resolveOffset(),
                    $canBypassPrivacy
                );
                $mappedListings = $this->mapProfileListings($feedPage['listings']);

                $this->jsonResponse([
                    'success' => true,
                    'html' => $this->renderProfileMarketplaceListingsHtml($mappedListings),
                    'has_more' => $feedPage['has_more'],
                    'next_offset' => $feedPage['next_offset'],
                ]);
            }

            $this->jsonResponse([
                'success' => true,
                'html' => '',
                'has_more' => false,
                'next_cursor_created_at' => null,
                'next_cursor_id' => null,
                'next_offset' => 0,
            ]);
        }

        $posts = [];
        $hasMorePosts = false;
        $nextCursorCreatedAt = null;
        $nextCursorId = null;
        if ($activityScope === 'posts') {
            $feedPage = $repository->getFeedPageByUser(
                $currentUserId,
                $profileUserId,
                self::PROFILE_POST_PAGE_SIZE,
                null,
                null,
                $canBypassPrivacy
            );
            $posts = $this->mapPosts($feedPage['posts']);
            $hasMorePosts = $feedPage['has_more'];
            $nextCursorCreatedAt = $feedPage['next_cursor_created_at'];
            $nextCursorId = $feedPage['next_cursor_id'];
        }

        $listings = [];
        $hasMoreListings = false;
        $nextListingOffset = null;
        if ($activityScope === 'listings') {
            $feedPage = $marketplaceRepository->getListingsByUserPage(
                $currentUserId,
                $profileUserId,
                $listingVisibility,
                self::PROFILE_LISTING_PAGE_SIZE,
                0,
                $canBypassPrivacy
            );
            $listings = $this->mapProfileListings($feedPage['listings']);
            $hasMoreListings = $feedPage['has_more'];
            $nextListingOffset = $feedPage['next_offset'];
        }

        $this->render('profile', [
            'title' => $profile['display_name'],
            'profile' => $profile,
            'isOwnProfile' => $isOwnProfile,
            'isAdminProfileView' => $isAdminProfileView,
            'isProfileCurrentlyBlocked' => $isProfileCurrentlyBlocked,
            'isBlockedForRegularViewer' => $isBlockedForRegularViewer,
            'canViewFullName' => $canViewFullName,
            'canViewMembershipTier' => $canViewMembershipTier,
            'canViewPosts' => $canViewPosts,
            'canViewListings' => $canViewListings,
            'activityScopes' => $activityScopes,
            'activityScope' => $activityScope,
            'listingVisibility' => $listingVisibility,
            'posts' => $posts,
            'listings' => $listings,
            'hasMorePosts' => $hasMorePosts,
            'nextCursorCreatedAt' => $nextCursorCreatedAt,
            'nextCursorId' => $nextCursorId,
            'hasMoreListings' => $hasMoreListings,
            'nextListingOffset' => $nextListingOffset,
            'brands' => $marketplaceRepository->getAvailableCategories(),
            'importVehicles' => $this->mapMarketplaceImportVehicles($carsRepository->getMarketplaceImportVehicles($currentUserId)),
            'bodyTypeOptions' => $this->getBodyTypeOptions(),
            'fuelTypeOptions' => $this->getVehicleFuelTypeOptions(),
            'transmissionOptions' => $this->getTransmissionOptions(),
            'drivetrainOptions' => $this->getDrivetrainOptions(),
            'styleFiles' => [
                'base.css',
                'layout.css',
                'navi.css',
                'header.css',
                'dashboard.css',
                'community.css',
                'marketplace.css',
                'my_cars.css',
                'settings.css',
                'vehicle_details.css',
                'profile.css',
            ],
            'scriptFiles' => ['community.js', 'marketplace.js', 'profile.js'],
        ]);
    }

    private function isProfileFeedPageRequest(): bool
    {
        return (string) ($_GET['profile_feed_page'] ?? '') === '1'
            || (string) ($_GET['feed_page'] ?? '') === '1';
    }

    private function resolveCursorCreatedAt(): ?string
    {
        $cursorCreatedAt = trim((string) ($_GET['cursor_created_at'] ?? ''));
        return $cursorCreatedAt !== '' ? $cursorCreatedAt : null;
    }

    private function resolveCursorId(): ?int
    {
        return $this->normalizeNullableInt($_GET['cursor_id'] ?? null);
    }

    private function resolveOffset(): int
    {
        return max(0, $this->normalizeNullableInt($_GET['offset'] ?? 0) ?? 0);
    }

    private function renderProfileMarketplaceListingsHtml(array $listings): string
    {
        if ($listings === []) {
            return '';
        }

        $currentUser = $this->resolveProfileMarketplaceRenderUser($this->getCurrentUserId());

        ob_start();
        foreach ($listings as $listing) {
            include 'public/views/partials/marketplace_listing.php';
        }

        return (string) ob_get_clean();
    }

    private function resolveProfileMarketplaceRenderUser(int $userId): array
    {
        $fallbackUser = [
            'id' => $userId,
            'full_name' => 'Użytkownik testowy',
            'membership_tier' => 'free',
        ];

        try {
            $repository = new UserRepository(Database::getConnection());
            $user = $repository->getById($userId);

            return $user ?: $fallbackUser;
        } catch (Throwable) {
            return $fallbackUser;
        }
    }

    private function handleAvatarUpload(
        CommunityRepository $repository,
        UserRepository $userRepository,
        int $currentUserId,
        string $requestedPseudonym,
        ?int $requestedId
    ): void {
        $profile = $requestedPseudonym !== ''
            ? $repository->getProfileByPseudonym($requestedPseudonym)
            : $repository->getProfile($requestedId ?? $currentUserId);

        if ($profile === null || (int) $profile['id'] !== $currentUserId) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Nie możesz zmienić tego zdjęcia profilowego.',
                ], 403);
            }

            $this->setFlash('error', 'Nie możesz zmienić tego zdjęcia profilowego.');
            $this->redirect('/profile');
        }

        $profilePath = trim((string) ($profile['pseudonym'] ?? '')) !== ''
            ? '/profile/' . rawurlencode((string) $profile['pseudonym'])
            : '/profile';

        $file = $_FILES['avatar_image'] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Wybierz zdjęcie profilowe.',
                ], 422);
            }

            $this->setFlash('error', 'Wybierz zdjęcie profilowe.');
            $this->redirect($profilePath);
        }

        $mimeType = mime_content_type((string) ($file['tmp_name'] ?? '')) ?: '';
        $allowedMimeTypes = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ];

        if (!isset($allowedMimeTypes[$mimeType])) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Dozwolone są tylko pliki JPG, PNG lub WEBP.',
                ], 422);
            }

            $this->setFlash('error', 'Dozwolone są tylko pliki JPG, PNG lub WEBP.');
            $this->redirect($profilePath);
        }

        $uploadDirectory = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'profiles';
        if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0775, true) && !is_dir($uploadDirectory)) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Nie udało się przygotować katalogu zdjęć profilowych.',
                ], 500);
            }

            $this->setFlash('error', 'Nie udało się przygotować katalogu zdjęć profilowych.');
            $this->redirect($profilePath);
        }

        $slugBase = $this->slugify((string) ($profile['display_name'] ?? 'profil')) ?: 'profil';
        $filename = $slugBase
            . '-avatar-'
            . $currentUserId
            . '-'
            . date('YmdHis')
            . '-'
            . bin2hex(random_bytes(3))
            . '.'
            . $allowedMimeTypes[$mimeType];
        $targetPath = $uploadDirectory . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file((string) ($file['tmp_name'] ?? ''), $targetPath)) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Nie udało się zapisać zdjęcia profilowego.',
                ], 500);
            }

            $this->setFlash('error', 'Nie udało się zapisać zdjęcia profilowego.');
            $this->redirect($profilePath);
        }

        $newAvatarPath = '/public/uploads/profiles/' . $filename;
        $oldAvatarPath = trim((string) ($profile['avatar_path'] ?? ''));
        $userRepository->updateAvatarPath($currentUserId, $newAvatarPath);
        $this->deleteProfileAvatarFile($oldAvatarPath);

        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => true,
                'avatar_path' => $newAvatarPath,
                'message' => 'Zdjęcie profilowe zostało zaktualizowane.',
            ]);
        }

        $this->setFlash('success', 'Zdjęcie profilowe zostało zaktualizowane.');
        $this->redirect($profilePath);
    }

    private function deleteProfileAvatarFile(string $publicPath): void
    {
        if ($publicPath === '' || !str_starts_with($publicPath, '/public/uploads/profiles/')) {
            return;
        }

        $filePath = dirname(__DIR__, 2) . str_replace('/', DIRECTORY_SEPARATOR, $publicPath);
        if (is_file($filePath)) {
            @unlink($filePath);
        }
    }

    private function handleProfileReport(
        CommunityRepository $repository,
        int $currentUserId,
        string $requestedPseudonym,
        ?int $requestedId
    ): void {
        $profile = $requestedPseudonym !== ''
            ? $repository->getProfileByPseudonym($requestedPseudonym)
            : $repository->getProfile($requestedId ?? 0);

        $redirectPath = '/profile';
        if ($profile !== null) {
            $redirectPath = trim((string) ($profile['pseudonym'] ?? '')) !== ''
                ? '/profile/' . rawurlencode((string) $profile['pseudonym'])
                : '/profile?id=' . (int) $profile['id'];
        }

        if ($profile === null || (int) $profile['id'] === $currentUserId) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Nie udało się zgłosić profilu.',
                ], 422);
            }

            $this->setFlash('error', 'Nie udało się zgłosić profilu.');
            $this->redirect($redirectPath);
        }

        $reason = $this->resolveValidatedReportReason(
            'profile',
            $_POST['report_reason_code'] ?? null,
            $_POST['report_reason_text'] ?? null
        );
        if (
            $reason === null
            || !(new ReportsRepository(Database::getConnection()))->createReport(
                $currentUserId,
                'profile',
                (int) $profile['id'],
                (string) $reason['code'],
                (string) $reason['label'],
                isset($reason['text']) ? (string) $reason['text'] : null
            )
        ) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Nie udało się zgłosić profilu.',
                ], 422);
            }

            $this->setFlash('error', 'Nie udało się zgłosić profilu.');
            $this->redirect($redirectPath);
        }

        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => true,
                'profile_id' => (int) $profile['id'],
                'message' => 'Profil został zgłoszony.',
            ]);
        }

        $this->setFlash('success', 'Profil został zgłoszony.');
        $this->redirect($redirectPath);
    }
}
