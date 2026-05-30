<?php

class CommunityRepository
{
    public const DEFAULT_FEED_PAGE_SIZE = 10;

    public function __construct(private PDO $connection)
    {
    }

    public function getFeed(int $currentUserId, array $filters): array
    {
        return $this->getFeedPage($currentUserId, $filters)['posts'];
    }

    public function getFeedPage(int $currentUserId, array $filters, int $limit = self::DEFAULT_FEED_PAGE_SIZE, ?string $cursorCreatedAt = null, ?int $cursorId = null): array
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

        if ($cursorCreatedAt !== null && $cursorId !== null && $cursorId > 0) {
            $conditions[] = '(feed.created_at < :cursor_created_at OR (feed.created_at = :cursor_created_at AND feed.id < :cursor_id))';
            $params['cursor_created_at'] = $cursorCreatedAt;
            $params['cursor_id'] = $cursorId;
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
            ORDER BY feed.created_at DESC, feed.id DESC
            LIMIT :limit_plus_one"
        );
        $statement->bindValue(':limit_plus_one', $limit + 1, PDO::PARAM_INT);
        foreach ($params as $name => $value) {
            $type = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
            $statement->bindValue(':' . $name, $value, $type);
        }
        $statement->execute();

        $posts = $statement->fetchAll(PDO::FETCH_ASSOC);
        $hasMore = count($posts) > $limit;
        if ($hasMore) {
            $posts = array_slice($posts, 0, $limit);
        }

        if ($posts === []) {
            return [
                'posts' => [],
                'has_more' => false,
                'next_cursor_created_at' => null,
                'next_cursor_id' => null,
            ];
        }

        $postIds = array_column($posts, 'id');
        $commentsByPost = $this->getCommentsForPosts($postIds);
        $imagesByPost = $this->getImagesForPosts($postIds);

        $mappedPosts = array_map(function (array $post) use ($commentsByPost, $imagesByPost): array {
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
                'commented_by_current_user' => (bool) $post['commented_by_current_user'],
                'comments' => $commentsByPost[$postId] ?? [],
                'images' => $imagesByPost[$postId] ?? [],
            ];
        }, $posts);

        $lastPost = end($mappedPosts) ?: null;

        return [
            'posts' => $mappedPosts,
            'has_more' => $hasMore,
            'next_cursor_created_at' => $hasMore && $lastPost ? (string) $lastPost['created_at'] : null,
            'next_cursor_id' => $hasMore && $lastPost ? (int) $lastPost['id'] : null,
        ];
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

    public function updatePostByOwner(int $userId, int $postId, array $data): ?array
    {
        $this->connection->beginTransaction();

        try {
            $ownershipStatement = $this->connection->prepare(
                'SELECT id
                FROM community_posts
                WHERE id = :post_id
                    AND user_id = :user_id
                    AND is_active = TRUE
                LIMIT 1'
            );
            $ownershipStatement->execute([
                'post_id' => $postId,
                'user_id' => $userId,
            ]);

            if (!$ownershipStatement->fetchColumn()) {
                $this->connection->rollBack();
                return null;
            }

            $existingImagesStatement = $this->connection->prepare(
                'SELECT id, image_path
                FROM community_post_images
                WHERE post_id = :post_id
                ORDER BY display_order ASC, id ASC'
            );
            $existingImagesStatement->execute([
                'post_id' => $postId,
            ]);
            $existingImages = $existingImagesStatement->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $removedImageIds = array_values(array_unique(array_map('intval', $data['removed_image_ids'] ?? [])));
            $removedImagePaths = [];

            if ($removedImageIds !== []) {
                $removedImagePaths = array_values(array_map(
                    static fn (array $row): string => (string) $row['image_path'],
                    array_filter(
                        $existingImages,
                        static fn (array $row): bool => in_array((int) $row['id'], $removedImageIds, true)
                    )
                ));

                $placeholders = [];
                $params = [
                    'post_id' => $postId,
                ];
                foreach ($removedImageIds as $index => $imageId) {
                    $placeholder = 'image_id_' . $index;
                    $placeholders[] = ':' . $placeholder;
                    $params[$placeholder] = $imageId;
                }

                $deleteImagesStatement = $this->connection->prepare(
                    'DELETE FROM community_post_images
                    WHERE post_id = :post_id
                        AND id IN (' . implode(', ', $placeholders) . ')'
                );
                $deleteImagesStatement->execute($params);
            }

            $updateStatement = $this->connection->prepare(
                'UPDATE community_posts
                SET brand_id = :brand_id,
                    model_id = :model_id,
                    content = :content,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :post_id
                    AND user_id = :user_id
                    AND is_active = TRUE'
            );
            $updateStatement->execute([
                'post_id' => $postId,
                'user_id' => $userId,
                'brand_id' => $data['brand_id'],
                'model_id' => $data['model_id'],
                'content' => $data['content'],
            ]);

            $remainingCountStatement = $this->connection->prepare(
                'SELECT COUNT(*)
                FROM community_post_images
                WHERE post_id = :post_id'
            );
            $remainingCountStatement->execute([
                'post_id' => $postId,
            ]);
            $remainingImagesCount = (int) $remainingCountStatement->fetchColumn();

            $remainingSlots = max(0, 8 - $remainingImagesCount);
            $newImagePaths = array_slice($data['image_paths'] ?? [], 0, $remainingSlots);

            if ($newImagePaths !== []) {
                $displayOrderStatement = $this->connection->prepare(
                    'SELECT COALESCE(MAX(display_order), 0)
                    FROM community_post_images
                    WHERE post_id = :post_id'
                );
                $displayOrderStatement->execute([
                    'post_id' => $postId,
                ]);
                $displayOrder = (int) $displayOrderStatement->fetchColumn();

                $imageStatement = $this->connection->prepare(
                    'INSERT INTO community_post_images (post_id, image_path, display_order)
                    VALUES (:post_id, :image_path, :display_order)'
                );

                foreach ($newImagePaths as $index => $imagePath) {
                    $imageStatement->execute([
                        'post_id' => $postId,
                        'image_path' => $imagePath,
                        'display_order' => $displayOrder + $index + 1,
                    ]);
                }
            }

            $this->connection->commit();

            return [
                'removed_image_paths' => $removedImagePaths,
                'kept_new_image_paths' => $newImagePaths,
            ];
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

    public function getLikeState(int $userId, int $postId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                EXISTS(
                    SELECT 1
                    FROM community_post_likes
                    WHERE post_id = :post_id AND user_id = :user_id
                ) AS liked_by_current_user,
                (
                    SELECT COUNT(*)
                    FROM community_post_likes
                    WHERE post_id = :post_id
                ) AS like_count'
        );
        $statement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
        ]);

        $state = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'liked_by_current_user' => (bool) ($state['liked_by_current_user'] ?? false),
            'like_count' => (int) ($state['like_count'] ?? 0),
        ];
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

    public function getSaveState(int $userId, int $postId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                EXISTS(
                    SELECT 1
                    FROM community_post_saves
                    WHERE post_id = :post_id AND user_id = :user_id
                ) AS saved_by_current_user,
                (
                    SELECT COUNT(*)
                    FROM community_post_saves
                    WHERE post_id = :post_id
                ) AS save_count'
        );
        $statement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
        ]);

        $state = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'saved_by_current_user' => (bool) ($state['saved_by_current_user'] ?? false),
            'save_count' => (int) ($state['save_count'] ?? 0),
        ];
    }

    public function addComment(int $userId, int $postId, string $content): array
    {
        $statement = $this->connection->prepare(
            'INSERT INTO community_comments (post_id, user_id, content)
            VALUES (:post_id, :user_id, :content)
            RETURNING id, created_at'
        );
        $statement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
            'content' => $content,
        ]);

        $inserted = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        $authorStatement = $this->connection->prepare(
            'SELECT username, CONCAT(first_name, \' \', last_name) AS full_name
            FROM users
            WHERE id = :user_id
            LIMIT 1'
        );
        $authorStatement->execute([
            'user_id' => $userId,
        ]);
        $author = $authorStatement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'id' => (int) ($inserted['id'] ?? 0),
            'post_id' => $postId,
            'user_id' => $userId,
            'author_name' => (string) ($author['full_name'] ?? ''),
            'author_username' => (string) ($author['username'] ?? ''),
            'content' => $content,
            'created_at' => (string) ($inserted['created_at'] ?? ''),
            'profile_path' => '/community/profile?id=' . $userId,
            'is_own_comment' => true,
        ];
    }

    public function updateCommentByOwner(int $userId, int $commentId, string $content): ?array
    {
        $statement = $this->connection->prepare(
            'UPDATE community_comments
            SET content = :content
            WHERE id = :comment_id
                AND user_id = :user_id
                AND is_active = TRUE
            RETURNING id, post_id, user_id, content, created_at'
        );
        $statement->execute([
            'comment_id' => $commentId,
            'user_id' => $userId,
            'content' => $content,
        ]);

        $updated = $statement->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($updated === null) {
            return null;
        }

        $authorStatement = $this->connection->prepare(
            'SELECT username, CONCAT(first_name, \' \', last_name) AS full_name
            FROM users
            WHERE id = :user_id
            LIMIT 1'
        );
        $authorStatement->execute([
            'user_id' => $userId,
        ]);
        $author = $authorStatement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'id' => (int) $updated['id'],
            'post_id' => (int) $updated['post_id'],
            'user_id' => (int) $updated['user_id'],
            'author_name' => (string) ($author['full_name'] ?? ''),
            'author_username' => (string) ($author['username'] ?? ''),
            'content' => (string) $updated['content'],
            'created_at' => (string) $updated['created_at'],
            'profile_path' => '/community/profile?id=' . $userId,
            'is_own_comment' => true,
        ];
    }

    public function deleteCommentByOwner(int $userId, int $commentId): ?int
    {
        $statement = $this->connection->prepare(
            'UPDATE community_comments
            SET is_active = FALSE
            WHERE id = :comment_id
                AND user_id = :user_id
                AND is_active = TRUE
            RETURNING post_id'
        );
        $statement->execute([
            'comment_id' => $commentId,
            'user_id' => $userId,
        ]);

        $deleted = $statement->fetch(PDO::FETCH_ASSOC) ?: null;

        return $deleted !== null ? (int) $deleted['post_id'] : null;
    }

    public function getCommentState(int $userId, int $postId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                EXISTS(
                    SELECT 1
                    FROM community_comments
                    WHERE post_id = :post_id
                        AND user_id = :user_id
                        AND is_active = TRUE
                ) AS commented_by_current_user,
                (
                    SELECT COUNT(*)
                    FROM community_comments
                    WHERE post_id = :post_id
                        AND is_active = TRUE
                ) AS comment_count'
        );
        $statement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
        ]);

        $state = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'commented_by_current_user' => (bool) ($state['commented_by_current_user'] ?? false),
            'comment_count' => (int) ($state['comment_count'] ?? 0),
        ];
    }

    public function deletePostByOwner(int $userId, int $postId): array
    {
        $statement = $this->connection->prepare(
            'SELECT image_path
            FROM community_post_images
            WHERE post_id = :post_id
            ORDER BY display_order ASC, id ASC'
        );
        $statement->execute([
            'post_id' => $postId,
        ]);
        $imagePaths = array_map(
            static fn (array $row): string => (string) $row['image_path'],
            $statement->fetchAll(PDO::FETCH_ASSOC) ?: []
        );

        $deleteStatement = $this->connection->prepare(
            'DELETE FROM community_posts
            WHERE id = :post_id
                AND user_id = :user_id
                AND is_active = TRUE'
        );
        $deleteStatement->execute([
            'post_id' => $postId,
            'user_id' => $userId,
        ]);

        if ($deleteStatement->rowCount() < 1) {
            return [];
        }

        return $imagePaths;
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
            ORDER BY c.created_at DESC, c.id DESC'
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
                id,
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
                'id' => (int) $row['id'],
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
