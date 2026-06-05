<?php

class MarketplaceRepository
{
    public const DEFAULT_FEED_PAGE_SIZE = 10;
    private ?bool $hasMarketplacePreferredContactChannelColumn = null;
    private ?bool $hasPrivacyMembershipVisibilityColumn = null;

    public function __construct(private PDO $connection)
    {
    }

    public function getAvailableCategories(): array
    {
        $statement = $this->connection->query(
            "SELECT
                b.id AS brand_id,
                b.name AS brand_name,
                m.id AS model_id,
                m.name AS model_name
            FROM car_brands b
            LEFT JOIN car_models m
                ON m.brand_id = b.id
                AND m.is_approved = TRUE
            WHERE b.is_approved = TRUE
            ORDER BY b.name ASC, m.name ASC"
        );

        $brands = [];

        foreach ($statement->fetchAll() as $row) {
            $brandId = (int) $row['brand_id'];

            if (!isset($brands[$brandId])) {
                $brands[$brandId] = [
                    'id' => $brandId,
                    'name' => $row['brand_name'],
                    'models' => [],
                ];
            }

            if ($row['model_id'] !== null) {
                $brands[$brandId]['models'][] = [
                    'id' => (int) $row['model_id'],
                    'name' => $row['model_name'],
                ];
            }
        }

        return array_values($brands);
    }

    public function getFeedPage(
        int $currentUserId,
        array $filters,
        int $limit = self::DEFAULT_FEED_PAGE_SIZE,
        int $offset = 0
    ): array {
        $scope = $this->normalizeScope($filters['scope'] ?? 'all');
        $sort = $this->normalizeSort($filters['sort'] ?? 'newest');

        $conditions = [];
        $params = [
            'current_user_id' => $currentUserId,
        ];

        if (!empty($filters['brand_id'])) {
            $conditions[] = 'feed.brand_id = :brand_id';
            $params['brand_id'] = (int) $filters['brand_id'];
        }

        if (!empty($filters['model_id'])) {
            $conditions[] = 'feed.model_id = :model_id';
            $params['model_id'] = (int) $filters['model_id'];
        }

        if (($filters['price_min'] ?? null) !== null) {
            $conditions[] = 'feed.price_amount >= :price_min';
            $params['price_min'] = (float) $filters['price_min'];
        }

        if (($filters['price_max'] ?? null) !== null) {
            $conditions[] = 'feed.price_amount <= :price_max';
            $params['price_max'] = (float) $filters['price_max'];
        }

        if (($filters['mileage_min'] ?? null) !== null) {
            $conditions[] = 'feed.mileage_km >= :mileage_min';
            $params['mileage_min'] = (int) $filters['mileage_min'];
        }

        if (($filters['mileage_max'] ?? null) !== null) {
            $conditions[] = 'feed.mileage_km <= :mileage_max';
            $params['mileage_max'] = (int) $filters['mileage_max'];
        }

        if (($filters['year_min'] ?? null) !== null) {
            $conditions[] = 'feed.production_year >= :year_min';
            $params['year_min'] = (int) $filters['year_min'];
        }

        if (($filters['year_max'] ?? null) !== null) {
            $conditions[] = 'feed.production_year <= :year_max';
            $params['year_max'] = (int) $filters['year_max'];
        }

        if (!empty($filters['body_type'])) {
            $conditions[] = 'LOWER(COALESCE(feed.body_type, \'\')) = LOWER(:body_type)';
            $params['body_type'] = (string) $filters['body_type'];
        }

        if (($filters['engine_capacity_min'] ?? null) !== null) {
            $conditions[] = 'feed.engine_capacity_cc >= :engine_capacity_min';
            $params['engine_capacity_min'] = (int) $filters['engine_capacity_min'];
        }

        if (($filters['engine_capacity_max'] ?? null) !== null) {
            $conditions[] = 'feed.engine_capacity_cc <= :engine_capacity_max';
            $params['engine_capacity_max'] = (int) $filters['engine_capacity_max'];
        }

        if (($filters['power_min'] ?? null) !== null) {
            $conditions[] = 'feed.power_hp >= :power_min';
            $params['power_min'] = (int) $filters['power_min'];
        }

        if (($filters['power_max'] ?? null) !== null) {
            $conditions[] = 'feed.power_hp <= :power_max';
            $params['power_max'] = (int) $filters['power_max'];
        }

        if (!empty($filters['fuel_type'])) {
            $conditions[] = 'feed.fuel_type = :fuel_type';
            $params['fuel_type'] = (string) $filters['fuel_type'];
        }

        if (!empty($filters['transmission'])) {
            $conditions[] = 'feed.transmission = :transmission';
            $params['transmission'] = (string) $filters['transmission'];
        }

        if (!empty($filters['drivetrain'])) {
            $conditions[] = 'LOWER(COALESCE(feed.drivetrain, \'\')) = LOWER(:drivetrain)';
            $params['drivetrain'] = (string) $filters['drivetrain'];
        }

        if (!empty($filters['steering_side'])) {
            $conditions[] = 'feed.steering_side = :steering_side';
            $params['steering_side'] = (string) $filters['steering_side'];
        }

        if (!empty($filters['technical_condition'])) {
            $conditions[] = 'feed.technical_condition = :technical_condition';
            $params['technical_condition'] = (string) $filters['technical_condition'];
        }

        $scopeCondition = match ($scope) {
            'mine' => 'feed.user_id = :current_user_id',
            'saved' => 'save_ref.is_saved = TRUE',
            default => null,
        };

        if ($scopeCondition) {
            $conditions[] = $scopeCondition;
        }

        $whereSql = $conditions === [] ? '' : 'WHERE ' . implode(' AND ', $conditions);
        $orderSql = $this->resolveOrderSql($sort);

        $statement = $this->connection->prepare(
            "SELECT
                feed.*,
                " . ($this->hasPrivacyMembershipVisibilityColumn()
                    ? "COALESCE(us_priv.privacy_membership_visibility, 'public') AS privacy_membership_visibility,"
                    : "'public' AS privacy_membership_visibility,") . "
                COALESCE(save_ref.is_saved, FALSE) AS saved_by_current_user
            FROM vw_marketplace_feed feed
            " . ($this->hasPrivacyMembershipVisibilityColumn()
                ? 'LEFT JOIN user_settings us_priv ON us_priv.user_id = feed.user_id'
                : '') . "
            LEFT JOIN LATERAL (
                SELECT TRUE AS is_saved
                FROM marketplace_listing_saves s
                WHERE s.listing_id = feed.id
                    AND s.user_id = :current_user_id
                LIMIT 1
            ) AS save_ref ON TRUE
            {$whereSql}
            ORDER BY {$orderSql}
            OFFSET :offset
            LIMIT :limit_plus_one"
        );

        $statement->bindValue(':offset', max(0, $offset), PDO::PARAM_INT);
        $statement->bindValue(':limit_plus_one', $limit + 1, PDO::PARAM_INT);
        foreach ($params as $name => $value) {
            if (is_int($value)) {
                $statement->bindValue(':' . $name, $value, PDO::PARAM_INT);
            } else {
                $statement->bindValue(':' . $name, (string) $value, PDO::PARAM_STR);
            }
        }
        $statement->execute();

        $listings = $statement->fetchAll(PDO::FETCH_ASSOC);
        $hasMore = count($listings) > $limit;
        if ($hasMore) {
            $listings = array_slice($listings, 0, $limit);
        }

        if ($listings === []) {
            return [
                'listings' => [],
                'has_more' => false,
                'next_offset' => null,
            ];
        }

        $mappedListings = $this->mapListingRows($listings, $currentUserId);

        return [
            'listings' => $mappedListings,
            'has_more' => $hasMore,
            'next_offset' => $hasMore ? $offset + count($mappedListings) : null,
        ];
    }

    public function getListingsByUser(int $currentUserId, int $profileUserId, string $visibility = 'active'): array
    {
        $conditions = ['l.user_id = :profile_user_id'];
        $preferredContactSelect = $this->hasMarketplacePreferredContactChannelColumn()
            ? "COALESCE(us.marketplace_preferred_contact_channel, 'both') AS preferred_contact_channel,"
            : "'both' AS preferred_contact_channel,";
        $privacyMembershipSelect = $this->hasPrivacyMembershipVisibilityColumn()
            ? "COALESCE(us.privacy_membership_visibility, 'public') AS privacy_membership_visibility,"
            : "'public' AS privacy_membership_visibility,";
        $preferredContactJoin = $this->hasMarketplacePreferredContactChannelColumn()
            || $this->hasPrivacyMembershipVisibilityColumn()
            ? 'LEFT JOIN user_settings us ON us.user_id = l.user_id'
            : '';

        if ($visibility === 'active') {
            $conditions[] = 'l.is_active = TRUE';
        } elseif ($visibility === 'ended') {
            $conditions[] = 'l.is_active = FALSE';
        }

        $statement = $this->connection->prepare(
            "SELECT
                l.id,
                l.user_id,
                l.brand_id,
                l.model_id,
                l.title,
                l.trim_name,
                l.description,
                l.price_amount,
                l.production_year,
                l.mileage_km,
                l.fuel_type,
                l.transmission,
                l.body_type,
                l.drivetrain,
                l.engine_capacity_cc,
                l.power_hp,
                l.exterior_color,
                l.city,
                l.contact_name,
                l.contact_phone,
                l.contact_email,
                l.created_at,
                l.updated_at,
                l.steering_side,
                l.technical_condition,
                l.is_active,
                u.username,
                u.pseudonym,
                u.avatar_path,
                CONCAT(u.first_name, ' ', u.last_name) AS full_name,
                u.membership_tier,
                {$preferredContactSelect}
                {$privacyMembershipSelect}
                cb.name AS brand_name,
                cm.name AS model_name,
                COALESCE(saved.save_count, 0) AS save_count,
                COALESCE(save_ref.is_saved, FALSE) AS saved_by_current_user
            FROM marketplace_listings l
            INNER JOIN users u ON u.id = l.user_id
            {$preferredContactJoin}
            INNER JOIN car_brands cb ON cb.id = l.brand_id
            INNER JOIN car_models cm ON cm.id = l.model_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::INTEGER AS save_count
                FROM marketplace_listing_saves s
                WHERE s.listing_id = l.id
            ) AS saved ON TRUE
            LEFT JOIN LATERAL (
                SELECT TRUE AS is_saved
                FROM marketplace_listing_saves s
                WHERE s.listing_id = l.id
                    AND s.user_id = :current_user_id
                LIMIT 1
            ) AS save_ref ON TRUE
            WHERE " . implode(' AND ', $conditions) . "
            ORDER BY l.created_at DESC, l.id DESC"
        );
        $statement->execute([
            'current_user_id' => $currentUserId,
            'profile_user_id' => $profileUserId,
        ]);

        return $this->mapListingRows($statement->fetchAll(PDO::FETCH_ASSOC) ?: [], $currentUserId);
    }

    public function getListingsByUserPage(
        int $currentUserId,
        int $profileUserId,
        string $visibility = 'active',
        int $limit = self::DEFAULT_FEED_PAGE_SIZE,
        int $offset = 0
    ): array {
        $conditions = ['l.user_id = :profile_user_id'];
        $preferredContactSelect = $this->hasMarketplacePreferredContactChannelColumn()
            ? "COALESCE(us.marketplace_preferred_contact_channel, 'both') AS preferred_contact_channel,"
            : "'both' AS preferred_contact_channel,";
        $privacyMembershipSelect = $this->hasPrivacyMembershipVisibilityColumn()
            ? "COALESCE(us.privacy_membership_visibility, 'public') AS privacy_membership_visibility,"
            : "'public' AS privacy_membership_visibility,";
        $preferredContactJoin = $this->hasMarketplacePreferredContactChannelColumn()
            || $this->hasPrivacyMembershipVisibilityColumn()
            ? 'LEFT JOIN user_settings us ON us.user_id = l.user_id'
            : '';

        if ($visibility === 'active') {
            $conditions[] = 'l.is_active = TRUE';
        } elseif ($visibility === 'ended') {
            $conditions[] = 'l.is_active = FALSE';
        }

        $statement = $this->connection->prepare(
            "SELECT
                l.id,
                l.user_id,
                l.brand_id,
                l.model_id,
                l.title,
                l.trim_name,
                l.description,
                l.price_amount,
                l.production_year,
                l.mileage_km,
                l.fuel_type,
                l.transmission,
                l.body_type,
                l.drivetrain,
                l.engine_capacity_cc,
                l.power_hp,
                l.exterior_color,
                l.city,
                l.contact_name,
                l.contact_phone,
                l.contact_email,
                l.created_at,
                l.updated_at,
                l.steering_side,
                l.technical_condition,
                l.is_active,
                u.username,
                u.pseudonym,
                u.avatar_path,
                CONCAT(u.first_name, ' ', u.last_name) AS full_name,
                u.membership_tier,
                {$preferredContactSelect}
                {$privacyMembershipSelect}
                cb.name AS brand_name,
                cm.name AS model_name,
                COALESCE(saved.save_count, 0) AS save_count,
                COALESCE(save_ref.is_saved, FALSE) AS saved_by_current_user
            FROM marketplace_listings l
            INNER JOIN users u ON u.id = l.user_id
            {$preferredContactJoin}
            INNER JOIN car_brands cb ON cb.id = l.brand_id
            INNER JOIN car_models cm ON cm.id = l.model_id
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::INTEGER AS save_count
                FROM marketplace_listing_saves s
                WHERE s.listing_id = l.id
            ) AS saved ON TRUE
            LEFT JOIN LATERAL (
                SELECT TRUE AS is_saved
                FROM marketplace_listing_saves s
                WHERE s.listing_id = l.id
                    AND s.user_id = :current_user_id
                LIMIT 1
            ) AS save_ref ON TRUE
            WHERE " . implode(' AND ', $conditions) . "
            ORDER BY l.created_at DESC, l.id DESC
            OFFSET :offset
            LIMIT :limit_plus_one"
        );
        $statement->bindValue(':current_user_id', $currentUserId, PDO::PARAM_INT);
        $statement->bindValue(':profile_user_id', $profileUserId, PDO::PARAM_INT);
        $statement->bindValue(':offset', max(0, $offset), PDO::PARAM_INT);
        $statement->bindValue(':limit_plus_one', $limit + 1, PDO::PARAM_INT);
        $statement->execute();

        $listings = $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
        $hasMore = count($listings) > $limit;
        if ($hasMore) {
            $listings = array_slice($listings, 0, $limit);
        }

        return [
            'listings' => $this->mapListingRows($listings, $currentUserId),
            'has_more' => $hasMore,
            'next_offset' => $hasMore ? $offset + count($listings) : null,
        ];
    }

    public function createListing(int $userId, array $data): int
    {
        $this->connection->beginTransaction();

        try {
            $statement = $this->connection->prepare(
                "INSERT INTO marketplace_listings (
                    user_id,
                    brand_id,
                    model_id,
                    title,
                    trim_name,
                    description,
                    price_amount,
                    production_year,
                    mileage_km,
                    fuel_type,
                    transmission,
                    body_type,
                    drivetrain,
                    steering_side,
                    technical_condition,
                    engine_capacity_cc,
                    power_hp,
                    exterior_color,
                    city,
                    contact_name,
                    contact_phone,
                    contact_email,
                    created_at,
                    updated_at
                ) VALUES (
                    :user_id,
                    :brand_id,
                    :model_id,
                    :title,
                    :trim_name,
                    :description,
                    :price_amount,
                    :production_year,
                    :mileage_km,
                    :fuel_type,
                    :transmission,
                    :body_type,
                    :drivetrain,
                    :steering_side,
                    :technical_condition,
                    :engine_capacity_cc,
                    :power_hp,
                    :exterior_color,
                    :city,
                    :contact_name,
                    :contact_phone,
                    :contact_email,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                RETURNING id"
            );
            $statement->execute([
                'user_id' => $userId,
                'brand_id' => $data['brand_id'],
                'model_id' => $data['model_id'],
                'title' => $data['title'],
                'trim_name' => $data['trim_name'],
                'description' => $data['description'],
                'price_amount' => $data['price_amount'],
                'production_year' => $data['production_year'],
                'mileage_km' => $data['mileage_km'],
                'fuel_type' => $data['fuel_type'],
                'transmission' => $data['transmission'],
                'body_type' => $data['body_type'],
                'drivetrain' => $data['drivetrain'],
                'steering_side' => $data['steering_side'],
                'technical_condition' => $data['technical_condition'],
                'engine_capacity_cc' => $data['engine_capacity_cc'],
                'power_hp' => $data['power_hp'],
                'exterior_color' => $data['exterior_color'],
                'city' => $data['city'],
                'contact_name' => $data['contact_name'],
                'contact_phone' => $data['contact_phone'],
                'contact_email' => $data['contact_email'],
            ]);

            $listingId = (int) $statement->fetchColumn();

            if (!empty($data['image_paths'])) {
                $imageStatement = $this->connection->prepare(
                    'INSERT INTO marketplace_listing_images (listing_id, image_path, display_order)
                    VALUES (:listing_id, :image_path, :display_order)'
                );

                foreach ($data['image_paths'] as $index => $imagePath) {
                    $imageStatement->execute([
                        'listing_id' => $listingId,
                        'image_path' => $imagePath,
                        'display_order' => $index + 1,
                    ]);
                }
            }

            $this->connection->commit();
            return $listingId;
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function updateListing(int $userId, int $listingId, array $data): array|false
    {
        $this->connection->beginTransaction();

        try {
            $statement = $this->connection->prepare(
                "UPDATE marketplace_listings
                SET
                    brand_id = :brand_id,
                    model_id = :model_id,
                    title = :title,
                    trim_name = :trim_name,
                    description = :description,
                    price_amount = :price_amount,
                    production_year = :production_year,
                    mileage_km = :mileage_km,
                    fuel_type = :fuel_type,
                    transmission = :transmission,
                    body_type = :body_type,
                    drivetrain = :drivetrain,
                    steering_side = :steering_side,
                    technical_condition = :technical_condition,
                    engine_capacity_cc = :engine_capacity_cc,
                    power_hp = :power_hp,
                    exterior_color = :exterior_color,
                    city = :city,
                    contact_name = :contact_name,
                    contact_phone = :contact_phone,
                    contact_email = :contact_email,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :listing_id
                    AND user_id = :user_id"
            );
            $statement->execute([
                'listing_id' => $listingId,
                'user_id' => $userId,
                'brand_id' => $data['brand_id'],
                'model_id' => $data['model_id'],
                'title' => $data['title'],
                'trim_name' => $data['trim_name'],
                'description' => $data['description'],
                'price_amount' => $data['price_amount'],
                'production_year' => $data['production_year'],
                'mileage_km' => $data['mileage_km'],
                'fuel_type' => $data['fuel_type'],
                'transmission' => $data['transmission'],
                'body_type' => $data['body_type'],
                'drivetrain' => $data['drivetrain'],
                'steering_side' => $data['steering_side'],
                'technical_condition' => $data['technical_condition'],
                'engine_capacity_cc' => $data['engine_capacity_cc'],
                'power_hp' => $data['power_hp'],
                'exterior_color' => $data['exterior_color'],
                'city' => $data['city'],
                'contact_name' => $data['contact_name'],
                'contact_phone' => $data['contact_phone'],
                'contact_email' => $data['contact_email'],
            ]);

            if ($statement->rowCount() === 0) {
                $this->connection->rollBack();
                return false;
            }

            $deletedImagePaths = [];
            $removedImagePaths = array_values(array_filter(
                $data['removed_image_paths'] ?? [],
                static fn (mixed $path): bool => is_string($path) && $path !== ''
            ));

            if ($removedImagePaths !== []) {
                $removePlaceholders = [];
                $removeParams = [
                    ':listing_id' => $listingId,
                ];

                foreach (array_values($removedImagePaths) as $index => $imagePath) {
                    $placeholder = ':image_path_' . $index;
                    $removePlaceholders[] = $placeholder;
                    $removeParams[$placeholder] = $imagePath;
                }

                $deleteStatement = $this->connection->prepare(
                    'DELETE FROM marketplace_listing_images
                    WHERE listing_id = :listing_id
                        AND image_path IN (' . implode(', ', $removePlaceholders) . ')
                    RETURNING image_path'
                );
                $deleteStatement->execute($removeParams);
                $deletedImagePaths = array_map(
                    static fn (array $row): string => (string) $row['image_path'],
                    $deleteStatement->fetchAll(PDO::FETCH_ASSOC)
                );
            }

            if (!empty($data['image_paths'])) {
                $maxOrderStatement = $this->connection->prepare(
                    'SELECT COALESCE(MAX(display_order), 0)
                    FROM marketplace_listing_images
                    WHERE listing_id = :listing_id'
                );
                $maxOrderStatement->execute(['listing_id' => $listingId]);
                $startOrder = (int) $maxOrderStatement->fetchColumn();

                $imageStatement = $this->connection->prepare(
                    'INSERT INTO marketplace_listing_images (listing_id, image_path, display_order)
                    VALUES (:listing_id, :image_path, :display_order)'
                );

                foreach ($data['image_paths'] as $index => $imagePath) {
                    $imageStatement->execute([
                        'listing_id' => $listingId,
                        'image_path' => $imagePath,
                        'display_order' => $startOrder + $index + 1,
                    ]);
                }
            }

            $this->connection->commit();
            return [
                'deleted_image_paths' => $deletedImagePaths,
            ];
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function deleteListing(int $userId, int $listingId): bool
    {
        $statement = $this->connection->prepare(
            'DELETE FROM marketplace_listings
            WHERE id = :listing_id
                AND user_id = :user_id'
        );
        $statement->execute([
            'listing_id' => $listingId,
            'user_id' => $userId,
        ]);

        return $statement->rowCount() > 0;
    }

    public function setListingActiveState(int $userId, int $listingId, bool $isActive): bool
    {
        $statement = $this->connection->prepare(
            'UPDATE marketplace_listings
            SET is_active = :is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :listing_id
                AND user_id = :user_id'
        );
        $statement->bindValue(':listing_id', $listingId, PDO::PARAM_INT);
        $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $statement->bindValue(':is_active', $isActive, PDO::PARAM_BOOL);
        $statement->execute();

        return $statement->rowCount() > 0;
    }

    public function getListingImagePaths(int $listingId): array
    {
        $statement = $this->connection->prepare(
            'SELECT image_path
            FROM marketplace_listing_images
            WHERE listing_id = :listing_id
            ORDER BY display_order ASC, id ASC'
        );
        $statement->execute(['listing_id' => $listingId]);

        return array_map(
            static fn (array $row): string => (string) $row['image_path'],
            $statement->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    public function modelBelongsToBrand(int $modelId, int $brandId): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1
            FROM car_models
            WHERE id = :model_id
                AND brand_id = :brand_id
            LIMIT 1'
        );
        $statement->execute([
            'model_id' => $modelId,
            'brand_id' => $brandId,
        ]);

        return (bool) $statement->fetchColumn();
    }

    public function resolveListingCatalogIds(array $data): array
    {
        $brandId = $data['brand_id'] ?? null;
        $modelId = $data['model_id'] ?? null;
        $brandName = (string) ($data['brand_name'] ?? '');
        $modelName = (string) ($data['model_name'] ?? '');

        if ($brandId === null) {
            $brandId = $this->resolveBrandId($brandName, (bool) ($data['brand_requires_approval'] ?? false));
        }

        if ($modelId === null) {
            $modelId = $this->resolveModelId($brandId, $modelName, (bool) ($data['model_requires_approval'] ?? false));
        }

        $data['brand_id'] = $brandId;
        $data['model_id'] = $modelId;

        return $data;
    }

    public function toggleSave(int $userId, int $listingId): void
    {
        if ($this->saveExists($userId, $listingId)) {
            $statement = $this->connection->prepare(
                'DELETE FROM marketplace_listing_saves WHERE listing_id = :listing_id AND user_id = :user_id'
            );
            $statement->execute([
                'listing_id' => $listingId,
                'user_id' => $userId,
            ]);

            return;
        }

        $statement = $this->connection->prepare(
            'INSERT INTO marketplace_listing_saves (listing_id, user_id) VALUES (:listing_id, :user_id)'
        );
        $statement->execute([
            'listing_id' => $listingId,
            'user_id' => $userId,
        ]);
    }

    public function getSaveState(int $userId, int $listingId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                EXISTS(
                    SELECT 1
                    FROM marketplace_listing_saves
                    WHERE listing_id = :listing_id AND user_id = :user_id
                ) AS saved_by_current_user,
                (
                    SELECT COUNT(*)
                    FROM marketplace_listing_saves
                    WHERE listing_id = :listing_id
                ) AS save_count'
        );
        $statement->execute([
            'listing_id' => $listingId,
            'user_id' => $userId,
        ]);

        $state = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'saved_by_current_user' => (bool) ($state['saved_by_current_user'] ?? false),
            'save_count' => (int) ($state['save_count'] ?? 0),
        ];
    }

    private function getImagesForListings(array $listingIds): array
    {
        $listingIds = array_values(array_unique(array_map('intval', $listingIds)));

        if ($listingIds === []) {
            return [];
        }

        $placeholders = [];
        $params = [];

        foreach ($listingIds as $index => $listingId) {
            $placeholder = ':listing_id_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $listingId;
        }

        $statement = $this->connection->prepare(
            'SELECT
                listing_id,
                image_path,
                display_order
            FROM marketplace_listing_images
            WHERE listing_id IN (' . implode(', ', $placeholders) . ')
            ORDER BY listing_id ASC, display_order ASC, id ASC'
        );
        $statement->execute($params);

        $grouped = [];
        foreach ($statement->fetchAll() as $row) {
            $listingId = (int) $row['listing_id'];
            $grouped[$listingId] ??= [];
            $grouped[$listingId][] = [
                'path' => (string) $row['image_path'],
                'display_order' => (int) $row['display_order'],
            ];
        }

        return $grouped;
    }

    private function mapListingRows(array $listings, int $currentUserId): array
    {
        if ($listings === []) {
            return [];
        }

        $listingIds = array_map(static fn (array $row): int => (int) $row['id'], $listings);
        $imagesByListing = $this->getImagesForListings($listingIds);

        return array_map(function (array $listing) use ($imagesByListing, $currentUserId): array {
            $listingId = (int) $listing['id'];

            return [
                'id' => $listingId,
                'user_id' => (int) $listing['user_id'],
                'author_name' => (string) ($listing['pseudonym'] ?? $listing['full_name']),
                'author_username' => (string) $listing['username'],
                'author_avatar_path' => $listing['avatar_path'] ?? null,
                'author_tier' => $this->resolveAuthorTier($listing, $currentUserId),
                'profile_path' => $this->buildProfilePath($currentUserId, (int) $listing['user_id'], $listing['pseudonym'] ?? null),
                'title' => (string) $listing['title'],
                'trim_name' => (string) ($listing['trim_name'] ?? ''),
                'description' => (string) $listing['description'],
                'price_amount' => (float) $listing['price_amount'],
                'production_year' => (int) $listing['production_year'],
                'mileage_km' => (int) $listing['mileage_km'],
                'fuel_type' => $listing['fuel_type'] !== null ? (string) $listing['fuel_type'] : null,
                'transmission' => $listing['transmission'] !== null ? (string) $listing['transmission'] : null,
                'body_type' => $listing['body_type'] !== null ? (string) $listing['body_type'] : null,
                'drivetrain' => $listing['drivetrain'] !== null ? (string) $listing['drivetrain'] : null,
                'steering_side' => $listing['steering_side'] !== null ? (string) $listing['steering_side'] : null,
                'technical_condition' => $listing['technical_condition'] !== null ? (string) $listing['technical_condition'] : null,
                'engine_capacity_cc' => $listing['engine_capacity_cc'] !== null ? (int) $listing['engine_capacity_cc'] : null,
                'power_hp' => $listing['power_hp'] !== null ? (int) $listing['power_hp'] : null,
                'exterior_color' => $listing['exterior_color'] !== null ? (string) $listing['exterior_color'] : null,
                'city' => (string) $listing['city'],
                'contact_name' => (string) $listing['contact_name'],
                'contact_phone' => (string) $listing['contact_phone'],
                'contact_email' => (string) $listing['contact_email'],
                'preferred_contact_channel' => in_array((string) ($listing['preferred_contact_channel'] ?? 'both'), ['both', 'phone', 'email'], true)
                    ? (string) $listing['preferred_contact_channel']
                    : 'both',
                'created_at' => (string) $listing['created_at'],
                'is_active' => array_key_exists('is_active', $listing)
                    ? (bool) $listing['is_active']
                    : true,
                'brand_id' => (int) $listing['brand_id'],
                'model_id' => (int) $listing['model_id'],
                'brand_name' => (string) $listing['brand_name'],
                'model_name' => (string) $listing['model_name'],
                'category_label' => (string) $listing['brand_name'] . ' / ' . (string) $listing['model_name'],
                'save_count' => (int) $listing['save_count'],
                'saved_by_current_user' => (bool) $listing['saved_by_current_user'],
                'images' => $imagesByListing[$listingId] ?? [],
            ];
        }, $listings);
    }

    private function saveExists(int $userId, int $listingId): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1
            FROM marketplace_listing_saves
            WHERE listing_id = :listing_id
                AND user_id = :user_id
            LIMIT 1'
        );
        $statement->execute([
            'listing_id' => $listingId,
            'user_id' => $userId,
        ]);

        return (bool) $statement->fetchColumn();
    }

    private function resolveBrandId(string $brandName, bool $requiresApproval = false): int
    {
        $select = $this->connection->prepare(
            'SELECT id
            FROM car_brands
            WHERE LOWER(name) = LOWER(:name)
            LIMIT 1'
        );
        $select->execute(['name' => $brandName]);
        $existingId = $select->fetchColumn();

        if ($existingId !== false) {
            return (int) $existingId;
        }

        $insert = $this->connection->prepare(
            'INSERT INTO car_brands (name, is_approved)
            VALUES (:name, :is_approved)'
        );
        $insert->execute([
            'name' => $brandName,
            'is_approved' => $requiresApproval ? 'false' : 'true',
        ]);

        return (int) $this->connection->lastInsertId();
    }

    private function resolveModelId(int $brandId, string $modelName, bool $requiresApproval = false): int
    {
        $select = $this->connection->prepare(
            'SELECT id
            FROM car_models
            WHERE brand_id = :brand_id
                AND LOWER(name) = LOWER(:name)
            LIMIT 1'
        );
        $select->execute([
            'brand_id' => $brandId,
            'name' => $modelName,
        ]);
        $existingId = $select->fetchColumn();

        if ($existingId !== false) {
            return (int) $existingId;
        }

        $insert = $this->connection->prepare(
            'INSERT INTO car_models (brand_id, name, is_approved)
            VALUES (:brand_id, :name, :is_approved)'
        );
        $insert->execute([
            'brand_id' => $brandId,
            'name' => $modelName,
            'is_approved' => $requiresApproval ? 'false' : 'true',
        ]);

        return (int) $this->connection->lastInsertId();
    }

    private function normalizeScope(string $scope): string
    {
        return in_array($scope, ['all', 'mine', 'saved'], true) ? $scope : 'all';
    }

    private function normalizeSort(string $sort): string
    {
        return in_array($sort, ['newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc'], true)
            ? $sort
            : 'newest';
    }

    private function resolveOrderSql(string $sort): string
    {
        return match ($sort) {
            'price_asc' => 'feed.price_amount ASC, feed.created_at DESC, feed.id DESC',
            'price_desc' => 'feed.price_amount DESC, feed.created_at DESC, feed.id DESC',
            'year_desc' => 'feed.production_year DESC, feed.created_at DESC, feed.id DESC',
            'mileage_asc' => 'feed.mileage_km ASC, feed.created_at DESC, feed.id DESC',
            default => 'feed.created_at DESC, feed.id DESC',
        };
    }

    private function buildProfilePath(int $currentUserId, int $profileUserId, ?string $pseudonym): string
    {
        $normalizedPseudonym = trim((string) $pseudonym);
        if ($normalizedPseudonym !== '') {
            return '/profile/' . rawurlencode($normalizedPseudonym);
        }

        return '/profile?id=' . $profileUserId;
    }

    private function hasMarketplacePreferredContactChannelColumn(): bool
    {
        if ($this->hasMarketplacePreferredContactChannelColumn !== null) {
            return $this->hasMarketplacePreferredContactChannelColumn;
        }

        $statement = $this->connection->query(
            "SELECT COUNT(*)::INTEGER
            FROM information_schema.columns
            WHERE table_name = 'user_settings'
                AND table_schema = current_schema()
                AND column_name = 'marketplace_preferred_contact_channel'"
        );

        $this->hasMarketplacePreferredContactChannelColumn = ((int) $statement->fetchColumn()) === 1;

        return $this->hasMarketplacePreferredContactChannelColumn;
    }

    private function hasPrivacyMembershipVisibilityColumn(): bool
    {
        if ($this->hasPrivacyMembershipVisibilityColumn !== null) {
            return $this->hasPrivacyMembershipVisibilityColumn;
        }

        $statement = $this->connection->query(
            "SELECT COUNT(*)::INTEGER
            FROM information_schema.columns
            WHERE table_name = 'user_settings'
                AND table_schema = current_schema()
                AND column_name = 'privacy_membership_visibility'"
        );

        $this->hasPrivacyMembershipVisibilityColumn = ((int) $statement->fetchColumn()) === 1;

        return $this->hasPrivacyMembershipVisibilityColumn;
    }

    private function resolveAuthorTier(array $listing, int $currentUserId): string
    {
        $userId = (int) ($listing['user_id'] ?? 0);
        $visibility = (string) ($listing['privacy_membership_visibility'] ?? 'public');

        if ($visibility === 'private' && $currentUserId !== $userId) {
            return '';
        }

        return strtoupper((string) ($listing['membership_tier'] ?? '')) . ' MEMBER';
    }
}

