<?php

class ReportsRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function createReport(
        int $reporterUserId,
        string $contentType,
        int $contentId,
        string $reasonCode,
        string $reasonLabel,
        ?string $reasonText = null
    ): bool {
        $context = $this->resolveReportContext($contentType, $contentId);
        if ($context === null) {
            return false;
        }

        $reportedUserId = (int) ($context['reported_user_id'] ?? 0);
        if ($reportedUserId <= 0 || $reportedUserId === $reporterUserId) {
            return false;
        }

        $statement = $this->connection->prepare(
            'INSERT INTO content_reports (
                reporter_user_id,
                reported_user_id,
                content_type,
                content_id,
                reported_subject,
                reason_code,
                reason_label,
                reason_text,
                target_path
            ) VALUES (
                :reporter_user_id,
                :reported_user_id,
                :content_type,
                :content_id,
                :reported_subject,
                :reason_code,
                :reason_label,
                :reason_text,
                :target_path
            )'
        );

        $statement->bindValue(':reporter_user_id', $reporterUserId, PDO::PARAM_INT);
        $statement->bindValue(':reported_user_id', $reportedUserId, PDO::PARAM_INT);
        $statement->bindValue(':content_type', $contentType, PDO::PARAM_STR);
        $statement->bindValue(':content_id', $contentId, PDO::PARAM_INT);
        $statement->bindValue(':reported_subject', (string) ($context['reported_subject'] ?? ''), PDO::PARAM_STR);
        $statement->bindValue(':reason_code', $reasonCode, PDO::PARAM_STR);
        $statement->bindValue(':reason_label', $reasonLabel, PDO::PARAM_STR);
        if ($reasonText === null || trim($reasonText) === '') {
            $statement->bindValue(':reason_text', null, PDO::PARAM_NULL);
        } else {
            $statement->bindValue(':reason_text', $reasonText, PDO::PARAM_STR);
        }
        $statement->bindValue(':target_path', (string) ($context['target_path'] ?? '/dashboard'), PDO::PARAM_STR);

        return $statement->execute();
    }

    public function getOpenReportCount(): int
    {
        return (int) $this->connection->query(
            "SELECT COUNT(*)::INTEGER
            FROM content_reports
            WHERE status = 'open'"
        )->fetchColumn();
    }

    public function getOpenReportsPage(int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, $perPage);
        $offset = ($page - 1) * $perPage;

        $statement = $this->connection->prepare(
            "SELECT
                r.id,
                r.content_type,
                r.content_id,
                r.reported_subject,
                r.reason_code,
                r.reason_label,
                r.reason_text,
                r.target_path,
                r.created_at,
                u.id AS reported_user_id,
                COALESCE(u.pseudonym, CONCAT(u.first_name, ' ', u.last_name), u.username) AS reported_user_name,
                u.pseudonym AS reported_user_pseudonym
            FROM content_reports r
            INNER JOIN users u
                ON u.id = r.reported_user_id
            WHERE r.status = 'open'
            ORDER BY r.created_at ASC, r.id ASC
            OFFSET :offset
            LIMIT :limit"
        );
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getOpenReportById(int $reportId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                r.id,
                r.reporter_user_id,
                r.reported_user_id,
                r.content_type,
                r.content_id,
                r.reported_subject,
                r.reason_code,
                r.reason_label,
                r.reason_text,
                r.target_path,
                r.created_at,
                COALESCE(owner_user.pseudonym, CONCAT(owner_user.first_name, ' ', owner_user.last_name), owner_user.username) AS reported_user_name,
                owner_user.pseudonym AS reported_user_pseudonym,
                owner_user.avatar_path AS reported_user_avatar_path,
                COALESCE(reporter_user.pseudonym, CONCAT(reporter_user.first_name, ' ', reporter_user.last_name), reporter_user.username) AS reporter_user_name
            FROM content_reports r
            INNER JOIN users owner_user
                ON owner_user.id = r.reported_user_id
            INNER JOIN users reporter_user
                ON reporter_user.id = r.reporter_user_id
            WHERE r.id = :report_id
                AND r.status = 'open'
            LIMIT 1"
        );
        $statement->execute([
            'report_id' => $reportId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($row === null) {
            return null;
        }

        return $row;
    }

    public function getOpenReportStats(): array
    {
        $statement = $this->connection->query(
            "SELECT
                COUNT(*) FILTER (WHERE status = 'open')::INTEGER AS total,
                COUNT(*) FILTER (WHERE status = 'open' AND content_type = 'listing')::INTEGER AS listings,
                COUNT(*) FILTER (WHERE status = 'open' AND content_type = 'post')::INTEGER AS posts,
                COUNT(*) FILTER (WHERE status = 'open' AND content_type = 'comment')::INTEGER AS comments,
                COUNT(*) FILTER (WHERE status = 'open' AND content_type = 'profile')::INTEGER AS profiles
            FROM content_reports"
        );

        return $statement->fetch(PDO::FETCH_ASSOC) ?: [
            'total' => 0,
            'listings' => 0,
            'posts' => 0,
            'comments' => 0,
            'profiles' => 0,
        ];
    }

    public function closeReport(int $reportId, int $adminUserId): bool
    {
        $statement = $this->connection->prepare(
            "UPDATE content_reports
            SET status = 'closed',
                closed_at = CURRENT_TIMESTAMP,
                closed_by_admin_id = :admin_user_id
            WHERE id = :report_id
                AND status = 'open'"
        );
        $statement->execute([
            'report_id' => $reportId,
            'admin_user_id' => $adminUserId,
        ]);

        return $statement->rowCount() > 0;
    }

    private function resolveReportContext(string $contentType, int $contentId): ?array
    {
        if ($contentId <= 0) {
            return null;
        }

        return match ($contentType) {
            'listing' => $this->resolveListingContext($contentId),
            'post' => $this->resolvePostContext($contentId),
            'comment' => $this->resolveCommentContext($contentId),
            'profile' => $this->resolveProfileContext($contentId),
            default => null,
        };
    }

    private function resolveListingContext(int $listingId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                l.id,
                l.user_id,
                l.title
            FROM marketplace_listings l
            WHERE l.id = :listing_id
                AND l.is_active = TRUE
            LIMIT 1"
        );
        $statement->execute([
            'listing_id' => $listingId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($row === null) {
            return null;
        }

        $subject = trim((string) ($row['title'] ?? ''));

        return [
            'reported_user_id' => (int) $row['user_id'],
            'reported_subject' => $subject !== '' ? $subject : 'Ogłoszenie',
            'target_path' => '/marketplace?focus_listing_id=' . $listingId . '&open_listing=' . $listingId . '#listing-' . $listingId,
        ];
    }

    private function resolvePostContext(int $postId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                p.id,
                p.user_id,
                p.content
            FROM community_posts p
            WHERE p.id = :post_id
                AND p.is_active = TRUE
            LIMIT 1"
        );
        $statement->execute([
            'post_id' => $postId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($row === null) {
            return null;
        }

        return [
            'reported_user_id' => (int) $row['user_id'],
            'reported_subject' => $this->buildPreview((string) ($row['content'] ?? ''), 'Post'),
            'target_path' => '/community?focus_post_id=' . $postId . '#post-' . $postId,
        ];
    }

    private function resolveCommentContext(int $commentId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                c.id,
                c.user_id,
                c.post_id,
                c.content
            FROM community_comments c
            INNER JOIN community_posts p
                ON p.id = c.post_id
            WHERE c.id = :comment_id
                AND c.is_active = TRUE
                AND p.is_active = TRUE
            LIMIT 1"
        );
        $statement->execute([
            'comment_id' => $commentId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($row === null) {
            return null;
        }

        $postId = (int) ($row['post_id'] ?? 0);

        return [
            'reported_user_id' => (int) $row['user_id'],
            'reported_subject' => $this->buildPreview((string) ($row['content'] ?? ''), 'Komentarz'),
            'target_path' => '/community?focus_comment_id=' . $commentId . '&open_comments_post=' . $postId . '#post-' . $postId,
        ];
    }

    private function resolveProfileContext(int $profileUserId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                u.id,
                u.username,
                u.pseudonym,
                CONCAT(u.first_name, ' ', u.last_name) AS full_name
            FROM users u
            WHERE u.id = :user_id
                AND u.is_active = TRUE
            LIMIT 1"
        );
        $statement->execute([
            'user_id' => $profileUserId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($row === null) {
            return null;
        }

        $displayName = trim((string) ($row['pseudonym'] ?? ''));
        if ($displayName === '') {
            $displayName = trim((string) ($row['full_name'] ?? ''));
        }
        if ($displayName === '') {
            $displayName = trim((string) ($row['username'] ?? ''));
        }
        if ($displayName === '') {
            $displayName = 'Profil użytkownika';
        }

        return [
            'reported_user_id' => (int) $row['id'],
            'reported_subject' => $displayName,
            'target_path' => trim((string) ($row['pseudonym'] ?? '')) !== ''
                ? '/profile/' . rawurlencode((string) $row['pseudonym'])
                : '/profile?id=' . (int) $row['id'],
        ];
    }

    private function buildPreview(string $value, string $fallback): string
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $value) ?? '');
        if ($normalized === '') {
            return $fallback;
        }

        if (mb_strlen($normalized) <= 72) {
            return $normalized;
        }

        return rtrim(mb_substr($normalized, 0, 69)) . '...';
    }
}
