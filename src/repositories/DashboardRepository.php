<?php

class DashboardRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function getCarCount(int $userId): int
    {
        $statement = $this->connection->prepare(
            'SELECT COUNT(*) FROM vehicles WHERE user_id = :user_id AND status = :status'
        );
        $statement->execute([
            'user_id' => $userId,
            'status' => 'active',
        ]);

        return (int) $statement->fetchColumn();
    }

    public function getNextInspection(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                v.id AS vehicle_id,
                current_inspection.valid_until,
                v.display_name
            FROM vehicles v
            INNER JOIN LATERAL (
                SELECT ti.valid_until
                FROM technical_inspections ti
                WHERE ti.vehicle_id = v.id
                ORDER BY ti.id DESC
                LIMIT 1
            ) AS current_inspection ON TRUE
            WHERE v.user_id = :user_id
                AND v.status = :status
            ORDER BY current_inspection.valid_until ASC
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
            'status' => 'active',
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function getNextInsurance(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                v.id AS vehicle_id,
                ip.valid_until,
                v.display_name
            FROM insurance_policies ip
            INNER JOIN vehicles v ON v.id = ip.vehicle_id
            WHERE v.user_id = :user_id
                AND v.status = :status
            ORDER BY ip.valid_until ASC
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
            'status' => 'active',
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function getLastFuelLog(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                v.id AS vehicle_id,
                fl.total_cost,
                fl.liters,
                fl.fueled_at,
                v.display_name
            FROM fuel_logs fl
            INNER JOIN vehicles v ON v.id = fl.vehicle_id
            WHERE v.user_id = :user_id
                AND v.status = :status
            ORDER BY fl.fueled_at DESC
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
            'status' => 'active',
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function getGarageCars(int $userId, int $limit = 3): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                v.id,
                v.display_name,
                v.trim_name,
                v.production_year,
                v.current_mileage_km,
                v.is_primary,
                vi.image_path,
                next_inspection.valid_until AS next_inspection_date,
                next_insurance.valid_until AS next_insurance_date
            FROM vehicles v
            LEFT JOIN vehicle_images vi
                ON vi.vehicle_id = v.id
                AND vi.is_primary = TRUE
            LEFT JOIN LATERAL (
                SELECT ti.valid_until
                FROM technical_inspections ti
                WHERE ti.vehicle_id = v.id
                ORDER BY ti.id DESC
                LIMIT 1
            ) AS next_inspection ON TRUE
            LEFT JOIN LATERAL (
                SELECT ip.valid_until
                FROM insurance_policies ip
                WHERE ip.vehicle_id = v.id
                ORDER BY ip.valid_until ASC
                LIMIT 1
            ) AS next_insurance ON TRUE
            WHERE v.user_id = :user_id
                AND v.status = :status
            ORDER BY v.is_primary DESC, v.display_order ASC, v.id ASC
            LIMIT :limit'
        );
        $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $statement->bindValue(':status', 'active', PDO::PARAM_STR);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }

    public function setPrimaryVehicle(int $userId, int $vehicleId): void
    {
        $this->connection->beginTransaction();

        try {
            $resetStatement = $this->connection->prepare(
                'UPDATE vehicles
                SET is_primary = FALSE
                WHERE user_id = :user_id'
            );
            $resetStatement->execute([
                'user_id' => $userId,
            ]);

            $activateStatement = $this->connection->prepare(
                'UPDATE vehicles
                SET is_primary = TRUE
                WHERE id = :vehicle_id
                    AND user_id = :user_id
                    AND status = :status'
            );
            $activateStatement->execute([
                'vehicle_id' => $vehicleId,
                'user_id' => $userId,
                'status' => 'active',
            ]);

            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function getCommunitySneakPeeks(int $userId, int $limit = 2): array
    {
        $statement = $this->connection->prepare(
            "SELECT
                feed.*,
                CASE
                    WHEN feed.model_id IS NOT NULL AND EXISTS (
                        SELECT 1
                        FROM vehicles v
                        WHERE v.user_id = :user_id
                            AND v.status = :status
                            AND v.model_id = feed.model_id
                    ) THEN 1
                    WHEN feed.brand_id IS NOT NULL AND EXISTS (
                        SELECT 1
                        FROM vehicles v
                        WHERE v.user_id = :user_id
                            AND v.status = :status
                            AND v.brand_id = feed.brand_id
                    ) THEN 2
                    ELSE 3
                END AS match_priority
            FROM vw_community_feed feed
            ORDER BY match_priority ASC, feed.created_at DESC, feed.id DESC
            LIMIT :limit"
        );
        $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $statement->bindValue(':status', 'active', PDO::PARAM_STR);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        $posts = $statement->fetchAll(PDO::FETCH_ASSOC);
        if ($posts === []) {
            return [];
        }

        $imageStatement = $this->connection->prepare(
            'SELECT image_path
            FROM community_post_images
            WHERE post_id = :post_id
            ORDER BY display_order ASC, id ASC
            LIMIT 1'
        );
        return array_map(function (array $post) use ($imageStatement, $userId): array {
            $imageStatement->execute([
                'post_id' => (int) $post['id'],
            ]);

            $imagePath = $imageStatement->fetchColumn() ?: null;
            $brandName = $post['brand_name'] ?? null;
            $modelName = $post['model_name'] ?? null;

            return [
                'id' => (int) $post['id'],
                'authorName' => (string) (($post['pseudonym'] ?? '') !== '' ? $post['pseudonym'] : $post['full_name']),
                'authorUsername' => (string) $post['username'],
                'content' => (string) $post['content'],
                'categoryLabel' => $this->buildCommunityCategoryLabel($brandName, $modelName),
                'likeCount' => (int) $post['like_count'],
                'commentCount' => (int) $post['comment_count'],
                'saveCount' => (int) $post['save_count'],
                'imagePath' => $imagePath ? (string) $imagePath : null,
                'profilePath' => $this->buildProfilePath($userId, (int) $post['user_id'], $post['pseudonym'] ?? null),
                'communityPath' => '/community#post-' . (int) $post['id'],
            ];
        }, $posts);
    }

    public function getMarketplaceSneakPeek(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                feed.*,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM vehicles v
                        WHERE v.user_id = :user_id
                            AND v.status = :status
                            AND v.brand_id = feed.brand_id
                    ) THEN 1
                    ELSE 2
                END AS match_priority
            FROM vw_marketplace_feed feed
            ORDER BY match_priority ASC, feed.created_at DESC, feed.id DESC
            LIMIT 1"
        );
        $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $statement->bindValue(':status', 'active', PDO::PARAM_STR);
        $statement->execute();

        $listing = $statement->fetch(PDO::FETCH_ASSOC);
        if (!$listing) {
            return null;
        }

        $imageStatement = $this->connection->prepare(
            'SELECT image_path
            FROM marketplace_listing_images
            WHERE listing_id = :listing_id
            ORDER BY display_order ASC, id ASC
            LIMIT 1'
        );
        $imageStatement->execute([
            'listing_id' => (int) $listing['id'],
        ]);
        $imagePath = $imageStatement->fetchColumn() ?: null;

        return [
            'id' => (int) $listing['id'],
            'title' => (string) $listing['title'],
            'priceAmount' => (float) $listing['price_amount'],
            'productionYear' => (int) $listing['production_year'],
            'mileageKm' => (int) $listing['mileage_km'],
            'fuelType' => (string) ($listing['fuel_type'] ?? ''),
            'brandName' => (string) $listing['brand_name'],
            'modelName' => (string) $listing['model_name'],
            'city' => (string) $listing['city'],
            'imagePath' => $imagePath ? (string) $imagePath : null,
            'marketplacePath' => '/marketplace#listing-' . (int) $listing['id'],
        ];
    }

    private function buildCommunityCategoryLabel(?string $brandName, ?string $modelName): string
    {
        if ($brandName && $modelName) {
            return $brandName . ' / ' . $modelName;
        }

        if ($brandName) {
            return $brandName;
        }

        return 'Ogólne';
    }

    private function buildProfilePath(int $currentUserId, int $profileUserId, ?string $pseudonym): string
    {
        if ($profileUserId === $currentUserId) {
            return '/profile';
        }

        $normalizedPseudonym = trim((string) $pseudonym);
        if ($normalizedPseudonym !== '') {
            return '/profile/' . rawurlencode($normalizedPseudonym);
        }

        return '/profile?id=' . $profileUserId;
    }
}
