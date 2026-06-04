<?php

class ProfileController extends CommunityController
{
    public function index(): void
    {
        $this->requireAuthentication();

        $repository = new CommunityRepository(Database::getConnection());
        $marketplaceRepository = new MarketplaceRepository(Database::getConnection());
        $carsRepository = new CarsRepository(Database::getConnection());
        $userRepository = new UserRepository(Database::getConnection());
        $currentUserId = $this->getCurrentUserId();
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

        if ($this->isPost()) {
            $this->handlePostAction($repository, $currentUserId);
            return;
        }

        if ($requestedPseudonym !== '') {
            $profile = $repository->getProfileByPseudonym($requestedPseudonym);
        } else {
            $profile = $repository->getProfile($profileUserId);
            if ($profile !== null && trim((string) ($profile['pseudonym'] ?? '')) !== '') {
                $this->redirect('/profile/' . rawurlencode((string) $profile['pseudonym']));
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
        $listingVisibility = $isOwnProfile
            ? $this->resolveProfileListingVisibility((string) ($_GET['listing_visibility'] ?? 'all'))
            : 'active';

        $posts = [];
        if ($activityScope === 'posts') {
            $posts = $repository->getFeed($currentUserId, [
                'scope' => 'all',
                'brand_id' => null,
                'model_id' => null,
            ]);
            $posts = array_values(array_filter($posts, static fn (array $post): bool => $post['user_id'] === $profileUserId));
            usort($posts, static function (array $left, array $right): int {
                $createdAtComparison = strcmp((string) $right['created_at'], (string) $left['created_at']);
                if ($createdAtComparison !== 0) {
                    return $createdAtComparison;
                }

                return ((int) $right['id']) <=> ((int) $left['id']);
            });
            $posts = $this->mapPosts($posts);
        }

        $listings = [];
        if ($activityScope === 'listings') {
            $listings = $this->mapProfileListings(
                $marketplaceRepository->getListingsByUser($currentUserId, $profileUserId, $listingVisibility)
            );
        }

        $this->render('profile', [
            'title' => $profile['display_name'],
            'profile' => $profile,
            'isOwnProfile' => $isOwnProfile,
            'activityScope' => $activityScope,
            'listingVisibility' => $listingVisibility,
            'posts' => $posts,
            'listings' => $listings,
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
}
