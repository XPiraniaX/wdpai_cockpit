<?php

class MarketplaceRepository
{
    public const DEFAULT_FEED_PAGE_SIZE = 10;

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
                COALESCE(save_ref.is_saved, FALSE) AS saved_by_current_user
            FROM vw_marketplace_feed feed
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

        $listingIds = array_map(static fn (array $row): int => (int) $row['id'], $listings);
        $imagesByListing = $this->getImagesForListings($listingIds);

        $mappedListings = array_map(function (array $listing) use ($imagesByListing): array {
            $listingId = (int) $listing['id'];

            return [
                'id' => $listingId,
                'user_id' => (int) $listing['user_id'],
                'author_name' => (string) $listing['full_name'],
                'author_username' => (string) $listing['username'],
                'profile_path' => '/community/profile?id=' . (int) $listing['user_id'],
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
                'engine_capacity_cc' => $listing['engine_capacity_cc'] !== null ? (int) $listing['engine_capacity_cc'] : null,
                'power_hp' => $listing['power_hp'] !== null ? (int) $listing['power_hp'] : null,
                'exterior_color' => $listing['exterior_color'] !== null ? (string) $listing['exterior_color'] : null,
                'city' => (string) $listing['city'],
                'contact_name' => (string) $listing['contact_name'],
                'contact_phone' => (string) $listing['contact_phone'],
                'contact_email' => (string) $listing['contact_email'],
                'created_at' => (string) $listing['created_at'],
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

        return [
            'listings' => $mappedListings,
            'has_more' => $hasMore,
            'next_offset' => $hasMore ? $offset + count($mappedListings) : null,
        ];
    }

    public function createListing(int $userId, array $data): void
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
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
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
}
