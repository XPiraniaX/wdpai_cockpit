<?php

class MarketplaceController extends AppController
{
    public function index(): void
    {
        $this->requireAuthentication();

        $repository = new MarketplaceRepository(Database::getConnection());
        $userId = $this->getCurrentUserId();

        if ($this->isPost()) {
            $this->handleMarketplaceAction($repository, $userId);
            return;
        }

        $filters = $this->resolveFilters();
        $feedPage = $repository->getFeedPage(
            $userId,
            $filters,
            MarketplaceRepository::DEFAULT_FEED_PAGE_SIZE,
            $this->resolveOffset()
        );

        $mappedListings = $this->mapListings($feedPage['listings']);

        if ($this->isAjaxRequest() && $this->isFeedPageRequest()) {
            $this->jsonResponse([
                'success' => true,
                'html' => $this->renderMarketplaceListingsHtml($mappedListings),
                'has_more' => $feedPage['has_more'],
                'next_offset' => $feedPage['next_offset'],
            ]);
        }

        $this->render('marketplace', [
            'title' => 'Marketplace',
            'scope' => $filters['scope'],
            'brandId' => $filters['brand_id'],
            'modelId' => $filters['model_id'],
            'sort' => $filters['sort'],
            'priceMin' => $filters['price_min'],
            'priceMax' => $filters['price_max'],
            'mileageMin' => $filters['mileage_min'],
            'mileageMax' => $filters['mileage_max'],
            'yearMin' => $filters['year_min'],
            'yearMax' => $filters['year_max'],
            'bodyType' => $filters['body_type'],
            'engineCapacityMin' => $filters['engine_capacity_min'],
            'engineCapacityMax' => $filters['engine_capacity_max'],
            'fuelType' => $filters['fuel_type'],
            'transmission' => $filters['transmission'],
            'drivetrain' => $filters['drivetrain'],
            'steeringSide' => $filters['steering_side'],
            'technicalCondition' => $filters['technical_condition'],
            'brands' => $repository->getAvailableCategories(),
            'listings' => $mappedListings,
            'hasMoreListings' => $feedPage['has_more'],
            'nextOffset' => $feedPage['next_offset'],
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
                'marketplace.css',
            ],
            'scriptFiles' => ['marketplace.js'],
        ]);
    }

    private function handleMarketplaceAction(MarketplaceRepository $repository, int $userId): void
    {
        $action = (string) ($_POST['action'] ?? '');
        $redirectTo = $this->sanitizeRedirectPath((string) ($_POST['redirect_to'] ?? '/marketplace'));

        switch ($action) {
            case 'create_listing':
                $payload = $this->buildListingPayload();
                $missingFields = $this->resolveMissingRequiredListingFields($payload);

                if ($missingFields !== []) {
                    $this->setFlash('error', 'Uzupełnij wszystkie wymagane pola ogłoszenia.');
                    $this->redirect($redirectTo);
                }

                if ($payload['brand_id'] === null || $payload['model_id'] === null) {
                    $this->setFlash('error', 'Wybierz markę i model pojazdu.');
                    $this->redirect($redirectTo);
                }

                if (!$repository->modelBelongsToBrand($payload['model_id'], $payload['brand_id'])) {
                    $this->setFlash('error', 'Wybrany model nie pasuje do wskazanej marki.');
                    $this->redirect($redirectTo);
                }

                if (!filter_var((string) $payload['contact_email'], FILTER_VALIDATE_EMAIL)) {
                    $this->setFlash('error', 'Podaj poprawny adres e-mail.');
                    $this->redirect($redirectTo);
                }

                $payload['image_paths'] = $this->handleListingImageUploads($userId, $payload['title']);
                if ($payload['image_paths'] === []) {
                    $this->setFlash('error', 'Dodaj co najmniej jedno zdjęcie ogłoszenia.');
                    $this->redirect($redirectTo);
                }

                try {
                    $repository->createListing($userId, $payload);
                } catch (Throwable $exception) {
                    $this->deleteUploadedFiles($payload['image_paths']);
                    throw $exception;
                }

                $this->setFlash('success', 'Ogłoszenie zostało opublikowane.');
                $this->redirect($redirectTo);
                return;

            case 'toggle_save':
                $listingId = (int) ($_POST['listing_id'] ?? 0);
                if ($listingId > 0) {
                    $repository->toggleSave($userId, $listingId);

                    if ($this->isAjaxRequest()) {
                        $state = $repository->getSaveState($userId, $listingId);
                        $this->jsonResponse([
                            'success' => true,
                            'listing_id' => $listingId,
                            'saved_by_current_user' => $state['saved_by_current_user'],
                            'save_count' => $state['save_count'],
                        ]);
                    }
                }

                $this->redirect($redirectTo);
                return;
        }

        $this->redirect($redirectTo);
    }

    private function resolveFilters(): array
    {
        $brandId = $this->normalizeNullableInt($_GET['brand_id'] ?? null);
        $sort = (string) ($_GET['sort'] ?? 'newest');
        if ($brandId === null) {
            $sort = 'newest';
        }

        return [
            'scope' => (string) ($_GET['scope'] ?? 'all'),
            'brand_id' => $brandId,
            'model_id' => $this->normalizeNullableInt($_GET['model_id'] ?? null),
            'sort' => $sort,
            'price_min' => $this->normalizeNullableFloat($_GET['price_min'] ?? null),
            'price_max' => $this->normalizeNullableFloat($_GET['price_max'] ?? null),
            'mileage_min' => $this->normalizeNullableInt($_GET['mileage_min'] ?? null),
            'mileage_max' => $this->normalizeNullableInt($_GET['mileage_max'] ?? null),
            'year_min' => $this->normalizeNullableInt($_GET['year_min'] ?? null),
            'year_max' => $this->normalizeNullableInt($_GET['year_max'] ?? null),
            'body_type' => $this->sanitizeNullableDisplayText($_GET['body_type'] ?? null),
            'engine_capacity_min' => $this->normalizeNullableInt($_GET['engine_capacity_min'] ?? null),
            'engine_capacity_max' => $this->normalizeNullableInt($_GET['engine_capacity_max'] ?? null),
            'fuel_type' => $this->sanitizeOptionalFuelType($_GET['fuel_type'] ?? null),
            'transmission' => $this->sanitizeNullableEnum($_GET['transmission'] ?? null, ['manual', 'automatic', 'semi_automatic']),
            'drivetrain' => $this->sanitizeNullableDisplayText($_GET['drivetrain'] ?? null),
            'steering_side' => $this->sanitizeNullableEnum($_GET['steering_side'] ?? null, ['left', 'right']),
            'technical_condition' => $this->sanitizeNullableEnum($_GET['technical_condition'] ?? null, ['undamaged', 'damaged']),
        ];
    }

    private function resolveOffset(): int
    {
        return max(0, $this->normalizeNullableInt($_GET['offset'] ?? null) ?? 0);
    }

    private function isFeedPageRequest(): bool
    {
        return (string) ($_GET['feed_page'] ?? '') === '1';
    }

    private function mapListings(array $listings): array
    {
        return array_map(function (array $listing): array {
            $listing['formatted_created_at'] = $this->formatDateTime($listing['created_at']);
            $listing['formatted_price'] = $this->formatPrice((float) $listing['price_amount']);
            $listing['formatted_mileage'] = $this->formatMileage($listing['mileage_km']);
            $listing['formatted_fuel_type'] = $this->formatFuelType($listing['fuel_type']);
            $listing['formatted_transmission'] = $this->formatTransmission($listing['transmission']);
            $listing['formatted_engine'] = $listing['engine_capacity_cc']
                ? number_format(((int) $listing['engine_capacity_cc']) / 1000, 1, ',', '') . ' L'
                : 'Brak danych';
            $listing['formatted_power'] = $listing['power_hp'] ? (int) $listing['power_hp'] . ' KM' : 'Brak danych';

            return $listing;
        }, $listings);
    }

    private function renderMarketplaceListingsHtml(array $listings): string
    {
        if ($listings === []) {
            return '';
        }

        $currentUser = $this->resolveMarketplaceRenderUser($this->getCurrentUserId());

        ob_start();
        foreach ($listings as $listing) {
            include 'public/views/partials/marketplace_listing.php';
        }

        return (string) ob_get_clean();
    }

    private function buildListingPayload(): array
    {
        return [
            'brand_id' => $this->normalizeNullableInt($_POST['brand_id'] ?? null),
            'model_id' => $this->normalizeNullableInt($_POST['model_id'] ?? null),
            'title' => $this->sanitizeText($_POST['title'] ?? null) ?? 'Brak tytułu',
            'trim_name' => $this->sanitizeNullableText($_POST['trim_name'] ?? null),
            'description' => trim((string) ($_POST['description'] ?? '')),
            'price_amount' => $this->normalizeNullableFloat($_POST['price_amount'] ?? null) ?? 0.0,
            'production_year' => $this->sanitizeSmallInt($_POST['production_year'] ?? null) ?? (int) date('Y'),
            'mileage_km' => $this->sanitizeNullablePositiveInt($_POST['mileage_km'] ?? null) ?? 0,
            'fuel_type' => $this->sanitizeOptionalFuelType($_POST['fuel_type'] ?? null),
            'transmission' => $this->sanitizeNullableEnum($_POST['transmission'] ?? null, ['manual', 'automatic', 'semi_automatic']),
            'body_type' => $this->sanitizeNullableDisplayText($_POST['body_type'] ?? null),
            'drivetrain' => $this->sanitizeNullableDisplayText($_POST['drivetrain'] ?? null),
            'steering_side' => $this->sanitizeNullableEnum($_POST['steering_side'] ?? null, ['left', 'right']),
            'technical_condition' => $this->sanitizeNullableEnum($_POST['technical_condition'] ?? null, ['undamaged', 'damaged']),
            'engine_capacity_cc' => $this->sanitizeNullablePositiveInt($_POST['engine_capacity_cc'] ?? null),
            'power_hp' => $this->sanitizeNullablePositiveInt($_POST['power_hp'] ?? null),
            'exterior_color' => $this->sanitizeNullableDisplayText($_POST['exterior_color'] ?? null),
            'city' => $this->sanitizeText($_POST['city'] ?? null) ?? 'Brak danych',
            'contact_name' => $this->sanitizeText($_POST['contact_name'] ?? null) ?? 'Brak danych',
            'contact_phone' => $this->sanitizeText($_POST['contact_phone'] ?? null) ?? 'Brak danych',
            'contact_email' => $this->sanitizeText($_POST['contact_email'] ?? null) ?? 'Brak danych',
        ];
    }

    private function resolveMissingRequiredListingFields(array $payload): array
    {
        $missing = [];

        foreach ([
            'brand_id',
            'model_id',
            'title',
            'trim_name',
            'description',
            'production_year',
            'mileage_km',
            'fuel_type',
            'transmission',
            'body_type',
            'drivetrain',
            'steering_side',
            'technical_condition',
            'engine_capacity_cc',
            'power_hp',
            'exterior_color',
            'city',
            'contact_name',
            'contact_phone',
            'contact_email',
        ] as $field) {
            $value = $payload[$field] ?? null;

            if ($value === null || $value === '') {
                $missing[] = $field;
            }
        }

        if (!isset($payload['price_amount']) || (float) $payload['price_amount'] <= 0) {
            $missing[] = 'price_amount';
        }

        return $missing;
    }

    private function handleListingImageUploads(int $userId, string $title, string $fieldName = 'listing_images'): array
    {
        if (empty($_FILES[$fieldName]) || !is_array($_FILES[$fieldName]['error'] ?? null)) {
            return [];
        }

        $userRepository = new UserRepository(Database::getConnection());
        $user = $userRepository->getById($userId);
        $username = $user['username'] ?? ('user-' . $userId);
        $uploadDirectory = getcwd() . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'marketplace';

        if (!is_dir($uploadDirectory)) {
            mkdir($uploadDirectory, 0775, true);
        }

        $files = $this->normalizeImageUploads($_FILES[$fieldName]);
        if ($files === []) {
            return [];
        }

        $uploadedPaths = [];
        $slugBase = $this->slugify($username . '-marketplace-' . $title);
        $timestamp = date('Ymd-His');
        $requestToken = bin2hex(random_bytes(3));

        foreach (array_slice($files, 0, 12) as $index => $file) {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                continue;
            }

            $extension = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
            $safeExtension = in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true) ? $extension : 'jpg';
            $filename = $slugBase . '-' . $timestamp . '-' . $requestToken . '-' . ($index + 1) . '.' . $safeExtension;
            $targetPath = $uploadDirectory . DIRECTORY_SEPARATOR . $filename;

            if (!move_uploaded_file((string) ($file['tmp_name'] ?? ''), $targetPath)) {
                continue;
            }

            $uploadedPaths[] = '/public/uploads/marketplace/' . $filename;
        }

        return $uploadedPaths;
    }

    private function normalizeImageUploads(array $upload): array
    {
        $names = $upload['name'] ?? [];
        $tmpNames = $upload['tmp_name'] ?? [];
        $errors = $upload['error'] ?? [];

        if (!is_array($names) || !is_array($tmpNames) || !is_array($errors)) {
            return [];
        }

        $normalized = [];
        foreach ($names as $index => $name) {
            $normalized[] = [
                'name' => $name,
                'tmp_name' => $tmpNames[$index] ?? null,
                'error' => $errors[$index] ?? UPLOAD_ERR_NO_FILE,
            ];
        }

        return $normalized;
    }

    private function sanitizeRedirectPath(string $redirectTo): string
    {
        if ($redirectTo === '' || $redirectTo[0] !== '/') {
            return '/marketplace';
        }

        return $redirectTo;
    }

    private function normalizeNullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            $value = str_replace([' ', "\xc2\xa0"], '', $value);
        }

        return filter_var($value, FILTER_VALIDATE_INT) !== false ? (int) $value : null;
    }

    private function normalizeNullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_string($value)) {
            $value = str_replace([' ', "\xc2\xa0"], '', $value);
            $value = str_replace(',', '.', $value);
        }

        return is_numeric($value) ? (float) $value : null;
    }

    private function sanitizeText(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : null;
    }

    private function sanitizeNullableText(?string $value): ?string
    {
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : null;
    }

    private function sanitizeNullableDisplayText(?string $value): ?string
    {
        $trimmed = trim((string) $value);
        if ($trimmed === '' || mb_strtolower($trimmed) === 'brak danych') {
            return null;
        }

        return $trimmed;
    }

    private function sanitizeSmallInt(mixed $value): ?int
    {
        $normalized = $this->normalizeNullableInt($value);

        return $normalized !== null && $normalized >= 1886 && $normalized <= 2100 ? $normalized : null;
    }

    private function sanitizeNullablePositiveInt(mixed $value): ?int
    {
        $normalized = $this->normalizeNullableInt($value);

        return $normalized !== null && $normalized >= 0 ? $normalized : null;
    }

    private function sanitizeOptionalFuelType(?string $value): ?string
    {
        $allowed = ['petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'cng', 'other'];
        $normalized = trim((string) $value);

        return in_array($normalized, $allowed, true) ? $normalized : null;
    }

    private function sanitizeNullableEnum(?string $value, array $allowed): ?string
    {
        $normalized = trim((string) $value);

        return in_array($normalized, $allowed, true) ? $normalized : null;
    }

    private function formatDateTime(string $value): string
    {
        return (new DateTimeImmutable($value))->format('d.m.Y • H:i');
    }

    private function formatPrice(float $value): string
    {
        return number_format($value, 0, ',', ' ') . ' zł';
    }

    private function formatMileage(int $value): string
    {
        return number_format($value, 0, ',', ' ') . ' km';
    }

    private function formatFuelType(?string $value): string
    {
        return match ($value) {
            'petrol' => 'Benzyna',
            'diesel' => 'Diesel',
            'hybrid' => 'Hybryda',
            'plug_in_hybrid' => 'Plug-in Hybrid',
            'electric' => 'Elektryczny',
            'lpg' => 'LPG',
            'cng' => 'CNG',
            'other' => 'Inne',
            default => 'Brak danych',
        };
    }

    private function formatTransmission(?string $value): string
    {
        return match ($value) {
            'manual' => 'Manualna',
            'automatic' => 'Automatyczna',
            'semi_automatic' => 'Półautomatyczna',
            default => 'Brak danych',
        };
    }

    private function slugify(string $value): string
    {
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        $normalized = $normalized === false ? $value : $normalized;
        $normalized = strtolower($normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';

        return trim($normalized, '-') ?: 'listing';
    }

    private function deleteUploadedFiles(array $imagePaths): void
    {
        foreach ($imagePaths as $imagePath) {
            if (!is_string($imagePath) || $imagePath === '') {
                continue;
            }

            $localPath = $this->resolvePublicPathToFilesystem($imagePath);
            if ($localPath !== null && is_file($localPath)) {
                @unlink($localPath);
            }
        }
    }

    private function resolvePublicPathToFilesystem(string $publicPath): ?string
    {
        $normalized = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($publicPath, '/\\'));
        if ($normalized === '') {
            return null;
        }

        return getcwd() . DIRECTORY_SEPARATOR . $normalized;
    }

    private function resolveMarketplaceRenderUser(int $userId): array
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
}
