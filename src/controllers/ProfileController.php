<?php

class ProfileController extends CommunityController
{
    public function index(): void
    {
        $this->requireAuthentication();

        $repository = new CommunityRepository(Database::getConnection());
        $marketplaceRepository = new MarketplaceRepository(Database::getConnection());
        $carsRepository = new CarsRepository(Database::getConnection());
        $currentUserId = $this->getCurrentUserId();
        $requestedPseudonym = trim((string) ($_GET['pseudonym'] ?? ''));
        $requestedId = isset($_GET['id']) ? (int) $_GET['id'] : null;
        $profileUserId = $requestedId ?? $currentUserId;
        $activityScope = $this->resolveProfileActivityScope((string) ($_GET['scope'] ?? ''));

        if ($requestedPseudonym === '' && $profileUserId <= 0) {
            $this->redirect('/profile');
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
}
