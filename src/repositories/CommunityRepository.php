<?php

class CommunityRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function getFeed(int $currentUserId, array $filters): array
    {
        $scope = $this->normalizeScope($filters['scope'] ?? 'all');
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

        $scopeCondition = match ($scope) {
            'mine' => 'feed.user_id = :current_user_id',
            'saved' => 'save_ref.is_saved = TRUE',
            'liked' => 'like_ref.is_liked = TRUE',
            'commented' => 'comment_ref.has_comment = TRUE',
            default => null,
        };

        if ($scopeCondition) {
            $conditions[] = $scopeCondition;
        }

        $whereSql = $conditions === [] ? '' : 'WHERE ' . implode(' AND ', $conditions);

        $statement = $this->connection->prepare(
            "SELECT
                feed.*,
                COALESCE(like_ref.is_liked, FALSE) AS liked_by_current_user,
                COALESCE(save_ref.is_saved, FALSE) AS saved_by_current_user,
                COALESCE(comment_ref.has_comment, FALSE) AS commented_by_current_user
            FROM vw_community_feed feed
            LEFT JOIN LATERAL (
                SELECT TRUE AS is_liked
                FROM community_post_likes l
                WHERE l.post_id = feed.id
                    AND l.user_id = :current_user_id
                LIMIT 1
            ) AS like_ref ON TRUE
            LEFT JOIN LATERAL (
                SELECT TRUE AS is_saved
                FROM community_post_saves s
                WHERE s.post_id = feed.id
                    AND s.user_id = :current_user_id
                LIMIT 1
            ) AS save_ref ON TRUE
            LEFT JOIN LATERAL (
                SELECT TRUE AS has_comment
                FROM community_comments c
                WHERE c.post_id = feed.id
                    AND c.user_id = :current_user_id
                    AND c.is_active = TRUE
                LIMIT 1
            ) AS comment_ref ON TRUE
            {$whereSql}
            ORDER BY feed.created_at DESC, feed.id DESC"
        );
        $statement->execute($params);

        $posts = $statement->fetchAll();

        if ($posts === []) {
            return [];
        }

        $postIds = array_column($posts, 'id');
        $commentsByPost = $this->getCommentsForPosts($postIds);
        $imagesByPost = $this->getImagesForPosts($postIds);

        return array_map(function (array $post) use ($commentsByPost, $imagesByPost): array {
            $postId = (int) $post['id'];
            $brandName = $post['brand_name'] ?? null;
            $modelName = $post['model_name'] ?? null;

            return [
                'id' => $postId,
                'user_id' => (int) $post['user_id'],
                'author_name' => $post['full_name'],
                'author_username' => $post['username'],
                'author_tier' => strtoupper((string) $post['membership_tier']) . ' MEMBER',
                'profile_path' => '/community/profile?id=' . (int) $post['user_id'],
                'content' => $post['content'],
                'created_at' => $post['created_at'],
                'category_label' => $this->buildCategoryLabel($brandName, $modelName),
                'brand_id' => $post['brand_id'] !== null ? (int) $post['brand_id'] : null,
                'model_id' => $post['model_id'] !== null ? (int) $post['model_id'] : null,
                'like_count' => (int) $post['like_count'],
                'save_count' => (int) $post['save_count'],
                'comment_count' => (int) $post['comment_count'],
                'liked_by_current_user' => (bool) $post['liked_by_current_user'],
                'saved_by_current_user' => (bool) $post['saved_by_current_user'],
                'comments' => $commentsByPost[$postId] ?? [],
                'images' => $imagesByPost[$postId] ?? [],
            ];
        }, $posts);
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
            LEFT JOIN car_models m ON m.brand_id = b.id
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

    public function createPost(int $userId, array $data): void
    {
        $this->connection->beginTransaction();

        try {
            $statement = $this->connection->prepare(
                "INSERT INTO community_posts (
                    user_id,
                    brand_id,
                    model_id,
                    content,
                    created_at,
                    updated_at
                ) VALUES (
                    :user_id,
                    :brand_id,
                    :model_id,
                    :content,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                RETURNING id"
            );
            $statement->execute([
                'user_id' => $userId,
                'brand_id' => $data['brand_id'],
                'model_id' => $data['model_id'],
                'content' => $data['content'],
            ]);

            $postId = (int) $statement->fetchColumn();

            if (!empty($data['image_paths'])) {
                $imageStatement = $this->connection->prepare(
                    'INSERT INTO community_post_images (post_id, image_path, display_order)
                    VALUES (:post_id, :image_path, :display_order)'
                );

                foreach ($data['image_paths'] as $index => $imagePath) {
                    $imageStatement->execute([
                        'post_id' => $postId,
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

    public function toggleLike(int $userId, int $postId): void
    {
        if ($this->pivotExists('community_post_likes', $userId, $postId)) {
            $statement = $this->connection->prepare(
                'DELETE FROM community_post_likes WHERE post_id = :post_id AND user_id = :user_id'
            );
            $statement->execute([
                'post_id' => $postId,
                'user_id' => $userId,
            ]);

            return;
        }

        $statement = $this->connection->prepare(
            'INSERT INTO community_post_likes (post_id, user_id) VALUES (:post_id, :user_id)'
        );
        $statement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
        ]);
    }

    public function toggleSave(int $userId, int $postId): void
    {
        if ($this->pivotExists('community_post_saves', $userId, $postId)) {
            $statement = $this->connection->prepare(
                'DELETE FROM community_post_saves WHERE post_id = :post_id AND user_id = :user_id'
            );
            $statement->execute([
                'post_id' => $postId,
                'user_id' => $userId,
            ]);

            return;
        }

        $statement = $this->connection->prepare(
            'INSERT INTO community_post_saves (post_id, user_id) VALUES (:post_id, :user_id)'
        );
        $statement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
        ]);
    }

    public function addComment(int $userId, int $postId, string $content): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO community_comments (post_id, user_id, content) VALUES (:post_id, :user_id, :content)'
        );
        $statement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
            'content' => $content,
        ]);
    }

    public function getProfile(int $profileUserId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                u.id,
                u.username,
                CONCAT(u.first_name, ' ', u.last_name) AS full_name,
                u.membership_tier,
                COALESCE(vehicle_counts.vehicle_count, 0) AS vehicle_count,
                COALESCE(post_counts.post_count, 0) AS post_count
            FROM users u
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::INTEGER AS vehicle_count
                FROM vehicles v
                WHERE v.user_id = u.id
                    AND v.status = 'active'
            ) AS vehicle_counts ON TRUE
            LEFT JOIN LATERAL (
                SELECT COUNT(*)::INTEGER AS post_count
                FROM community_posts p
                WHERE p.user_id = u.id
                    AND p.is_active = TRUE
            ) AS post_counts ON TRUE
            WHERE u.id = :user_id
                AND u.is_active = TRUE
            LIMIT 1"
        );
        $statement->execute([
            'user_id' => $profileUserId,
        ]);

        $row = $statement->fetch();

        if (!$row) {
            return null;
        }

        return [
            'id' => (int) $row['id'],
            'username' => $row['username'],
            'full_name' => $row['full_name'],
            'membership_tier' => strtoupper((string) $row['membership_tier']) . ' MEMBER',
            'vehicle_count' => (int) $row['vehicle_count'],
            'post_count' => (int) $row['post_count'],
        ];
    }

    private function getCommentsForPosts(array $postIds): array
    {
        $postIds = array_values(array_unique(array_map('intval', $postIds)));

        if ($postIds === []) {
            return [];
        }

        $placeholders = [];
        $params = [];

        foreach ($postIds as $index => $postId) {
            $placeholder = ':post_id_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $postId;
        }

        $statement = $this->connection->prepare(
            'SELECT
                c.id,
                c.post_id,
                c.content,
                c.created_at,
                u.id AS user_id,
                u.username,
                CONCAT(u.first_name, \' \', u.last_name) AS full_name
            FROM community_comments c
            INNER JOIN users u ON u.id = c.user_id
            WHERE c.is_active = TRUE
                AND c.post_id IN (' . implode(', ', $placeholders) . ')
            ORDER BY c.created_at ASC, c.id ASC'
        );
        $statement->execute($params);

        $grouped = [];

        foreach ($statement->fetchAll() as $row) {
            $postId = (int) $row['post_id'];
            $grouped[$postId] ??= [];
            $grouped[$postId][] = [
                'id' => (int) $row['id'],
                'user_id' => (int) $row['user_id'],
                'author_name' => $row['full_name'],
                'author_username' => $row['username'],
                'content' => $row['content'],
                'created_at' => $row['created_at'],
                'profile_path' => '/community/profile?id=' . (int) $row['user_id'],
            ];
        }

        return $grouped;
    }

    private function getImagesForPosts(array $postIds): array
    {
        $postIds = array_values(array_unique(array_map('intval', $postIds)));

        if ($postIds === []) {
            return [];
        }

        $placeholders = [];
        $params = [];

        foreach ($postIds as $index => $postId) {
            $placeholder = ':image_post_id_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $postId;
        }

        $statement = $this->connection->prepare(
            'SELECT
                post_id,
                image_path,
                display_order
            FROM community_post_images
            WHERE post_id IN (' . implode(', ', $placeholders) . ')
            ORDER BY post_id ASC, display_order ASC, id ASC'
        );
        $statement->execute($params);

        $grouped = [];

        foreach ($statement->fetchAll() as $row) {
            $postId = (int) $row['post_id'];
            $grouped[$postId] ??= [];
            $grouped[$postId][] = [
                'path' => (string) $row['image_path'],
                'display_order' => (int) $row['display_order'],
            ];
        }

        return $grouped;
    }

    private function normalizeScope(string $scope): string
    {
        return in_array($scope, ['all', 'mine', 'saved', 'liked', 'commented'], true)
            ? $scope
            : 'all';
    }

    private function buildCategoryLabel(?string $brandName, ?string $modelName): string
    {
        if ($brandName === null) {
            return 'Bez kategorii';
        }

        if ($modelName === null) {
            return $brandName;
        }

        return $brandName . ' / ' . $modelName;
    }

    private function pivotExists(string $table, int $userId, int $postId): bool
    {
        $statement = $this->connection->prepare(
            "SELECT 1
            FROM {$table}
            WHERE post_id = :post_id
                AND user_id = :user_id
            LIMIT 1"
        );
        $statement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
        ]);

        return (bool) $statement->fetchColumn();
    }
}
