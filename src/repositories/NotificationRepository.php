<?php

class NotificationRepository
{
    private const VEHICLE_REMINDER_DAYS = [60, 30, 15, 7, 1];

    public function __construct(private PDO $connection)
    {
    }

    public function syncUserNotifications(int $userId): void
    {
        $this->cleanupExpiredNotifications();
        $this->generateVehicleDocumentNotifications($userId);
    }

    public function getUnreadCount(int $userId): int
    {
        $statement = $this->connection->prepare(
            'SELECT COUNT(*)::INTEGER
            FROM user_notifications
            WHERE user_id = :user_id
                AND is_read = FALSE'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        return (int) $statement->fetchColumn();
    }

    public function getNotifications(int $userId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                id,
                type,
                title,
                message,
                target_path,
                payload_json,
                is_read,
                created_at,
                read_at
            FROM user_notifications
            WHERE user_id = :user_id
            ORDER BY created_at DESC, id DESC'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function markAsRead(int $userId, int $notificationId): ?array
    {
        $statement = $this->connection->prepare(
            'UPDATE user_notifications
            SET is_read = TRUE,
                read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
            WHERE id = :notification_id
                AND user_id = :user_id
            RETURNING id, target_path, is_read'
        );
        $statement->execute([
            'notification_id' => $notificationId,
            'user_id' => $userId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    public function createPostCommentNotification(int $actorUserId, int $postId, int $commentId): void
    {
        $statement = $this->connection->prepare(
            'SELECT
                p.user_id AS recipient_user_id,
                COALESCE(actor.pseudonym, CONCAT(actor.first_name, \' \', actor.last_name)) AS actor_name,
                COALESCE(settings.notification_post_comments, TRUE) AS is_enabled
            FROM community_posts p
            INNER JOIN users actor
                ON actor.id = :actor_user_id
            LEFT JOIN user_settings settings
                ON settings.user_id = p.user_id
            WHERE p.id = :post_id
                AND p.is_active = TRUE
            LIMIT 1'
        );
        $statement->execute([
            'actor_user_id' => $actorUserId,
            'post_id' => $postId,
        ]);

        $context = $statement->fetch(PDO::FETCH_ASSOC);
        if ($context === false) {
            return;
        }

        $recipientUserId = (int) ($context['recipient_user_id'] ?? 0);
        if ($recipientUserId <= 0 || $recipientUserId === $actorUserId || !(bool) ($context['is_enabled'] ?? true)) {
            return;
        }

        $actorName = trim((string) ($context['actor_name'] ?? 'Ktoś'));
        $actorName = $actorName !== '' ? $actorName : 'Ktoś';

        $this->insertNotification(
            $recipientUserId,
            'post_comment',
            'Nowy komentarz',
            $actorName . ' skomentował(a) Twój post.',
            '/profile?scope=posts&open_comments_post=' . $postId . '#post-' . $postId,
            'post_comment_' . $commentId
        );
    }

    public function createPostLikeMilestoneNotification(int $actorUserId, int $postId): void
    {
        $contextStatement = $this->connection->prepare(
            'SELECT
                p.user_id AS recipient_user_id,
                p.content,
                COALESCE(settings.notification_post_likes, TRUE) AS is_enabled
            FROM community_posts p
            LEFT JOIN user_settings settings
                ON settings.user_id = p.user_id
            WHERE p.id = :post_id
                AND p.is_active = TRUE
            LIMIT 1'
        );
        $contextStatement->execute([
            'post_id' => $postId,
        ]);

        $context = $contextStatement->fetch(PDO::FETCH_ASSOC);
        if ($context === false) {
            return;
        }

        $recipientUserId = (int) ($context['recipient_user_id'] ?? 0);
        if ($recipientUserId <= 0 || $recipientUserId === $actorUserId || !(bool) ($context['is_enabled'] ?? true)) {
            return;
        }

        $countStatement = $this->connection->prepare(
            'SELECT COUNT(*)::INTEGER
            FROM community_post_likes
            WHERE post_id = :post_id'
        );
        $countStatement->execute([
            'post_id' => $postId,
        ]);

        $likeCount = (int) $countStatement->fetchColumn();
        if (!$this->isLikeMilestone($likeCount)) {
            return;
        }

        $postPreview = $this->buildPostPreview((string) ($context['content'] ?? ''));

        $this->insertNotification(
            $recipientUserId,
            'post_like_milestone',
            'Nowy próg polubień',
            'Twój post: ' . $postPreview . ' osiągnął ' . $likeCount . ' polubień.',
            '/profile?scope=posts#post-' . $postId,
            'post_like_milestone_' . $postId . '_' . $likeCount
        );
    }

    public function createAdminPostRemovalNotification(int $userId, string $postContent, string $reason): void
    {
        $reason = trim($reason);
        if ($userId <= 0 || $reason === '') {
            return;
        }

        $this->insertNotification(
            $userId,
            'admin_post_removed',
            'Usunięto Twój post',
            'Twój post: ' . $this->buildPostPreview($postContent) . ' został usunięty z powodu: ' . $reason,
            '/profile?scope=posts',
            null,
            [
                'accent' => 'danger',
                'modal_intro' => 'Twój post:',
                'modal_subject' => $postContent,
                'modal_reason' => $reason,
            ]
        );
    }

    public function createAdminListingRemovalNotification(int $userId, string $listingTitle, string $reason): void
    {
        $reason = trim($reason);
        if ($userId <= 0 || $reason === '') {
            return;
        }

        $this->insertNotification(
            $userId,
            'admin_listing_removed',
            'Usunięto Twoje ogłoszenie',
            'Twoje ogłoszenie: ' . $this->buildPostPreview($listingTitle) . ' zostało usunięte z powodu: ' . $reason,
            '/profile?scope=listings',
            null,
            [
                'accent' => 'danger',
                'modal_intro' => 'Twoje ogłoszenie:',
                'modal_subject' => $listingTitle,
                'modal_reason' => $reason,
            ]
        );
    }

    public function createVehicleApprovedNotification(int $userId, int $vehicleId, string $displayName): void
    {
        if ($userId <= 0 || $vehicleId <= 0) {
            return;
        }

        $vehicleName = $this->normalizeVehicleDisplayName($displayName);

        $this->insertNotification(
            $userId,
            'vehicle_approved',
            'Samochód zaakceptowany',
            'Twój samochód: ' . $vehicleName . ', został zaakceptowany.',
            $this->buildVehicleDetailsPath($vehicleId, $vehicleName)
        );
    }

    public function createVehicleRejectedNotification(int $userId, int $vehicleId, string $displayName, string $reason): void
    {
        $reason = trim($reason);
        if ($userId <= 0 || $vehicleId <= 0 || $reason === '') {
            return;
        }

        $vehicleName = $this->normalizeVehicleDisplayName($displayName);

        $this->insertNotification(
            $userId,
            'vehicle_rejected',
            'Samochód odrzucony',
            'Twój samochód: ' . $vehicleName . ', został odrzucony z powodu: ' . $reason,
            $this->buildVehicleDetailsPath($vehicleId, $vehicleName),
            null,
            [
                'accent' => 'danger',
            ]
        );
    }

    private function cleanupExpiredNotifications(): void
    {
        $statement = $this->connection->prepare(
            "DELETE FROM user_notifications
            WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '60 days')"
        );
        $statement->execute();
    }

    private function generateVehicleDocumentNotifications(int $userId): void
    {
        $today = new DateTimeImmutable('today');

        foreach ($this->getVehicleInspectionRows($userId) as $row) {
            $this->createVehicleReminderNotifications(
                $userId,
                $today,
                $row,
                'vehicle_inspection',
                'Zbliża się przegląd',
                'przegląd'
            );
        }

        foreach ($this->getVehicleInsuranceRows($userId) as $row) {
            $this->createVehicleReminderNotifications(
                $userId,
                $today,
                $row,
                'vehicle_insurance',
                'Zbliża się ubezpieczenie',
                'ubezpieczenie'
            );
        }
    }

    private function createVehicleReminderNotifications(
        int $userId,
        DateTimeImmutable $today,
        array $row,
        string $type,
        string $title,
        string $documentLabel
    ): void {
        $validUntilRaw = (string) ($row['valid_until'] ?? '');
        if ($validUntilRaw === '') {
            return;
        }

        $validUntil = DateTimeImmutable::createFromFormat('Y-m-d', $validUntilRaw);
        if (!$validUntil instanceof DateTimeImmutable) {
            return;
        }

        $daysUntil = (int) $today->diff($validUntil)->format('%r%a');
        if (!in_array($daysUntil, self::VEHICLE_REMINDER_DAYS, true)) {
            return;
        }

        $vehicleId = (int) ($row['vehicle_id'] ?? 0);
        $vehicleName = trim((string) ($row['display_name'] ?? 'Pojazd'));
        if ($vehicleId <= 0 || $vehicleName === '') {
            return;
        }

        $this->insertNotification(
            $userId,
            $type,
            $title,
            $vehicleName . ': ' . $documentLabel . ' kończy się ' . $this->formatRelativeDaysMessage($daysUntil) . '.',
            $this->buildVehicleDetailsPath($vehicleId, $vehicleName),
            $type . '_' . $vehicleId . '_' . $validUntil->format('Ymd') . '_' . $daysUntil
        );
    }

    private function getVehicleInspectionRows(int $userId): array
    {
        $statement = $this->connection->prepare(
            "SELECT
                v.id AS vehicle_id,
                v.display_name,
                inspection.valid_until
            FROM vehicles v
            INNER JOIN user_settings settings
                ON settings.user_id = v.user_id
            LEFT JOIN LATERAL (
                SELECT ti.valid_until
                FROM technical_inspections ti
                WHERE ti.vehicle_id = v.id
                ORDER BY ti.valid_until DESC, ti.id DESC
                LIMIT 1
            ) AS inspection ON TRUE
            WHERE v.user_id = :user_id
                AND v.status = 'active'
                AND settings.inspection_reminders = TRUE
                AND inspection.valid_until IS NOT NULL"
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function getVehicleInsuranceRows(int $userId): array
    {
        $statement = $this->connection->prepare(
            "SELECT
                v.id AS vehicle_id,
                v.display_name,
                insurance.valid_until
            FROM vehicles v
            INNER JOIN user_settings settings
                ON settings.user_id = v.user_id
            LEFT JOIN LATERAL (
                SELECT ip.valid_until
                FROM insurance_policies ip
                WHERE ip.vehicle_id = v.id
                ORDER BY ip.valid_until ASC, ip.id ASC
                LIMIT 1
            ) AS insurance ON TRUE
            WHERE v.user_id = :user_id
                AND v.status = 'active'
                AND settings.insurance_reminders = TRUE
                AND insurance.valid_until IS NOT NULL"
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    private function insertNotification(
        int $userId,
        string $type,
        string $title,
        string $message,
        string $targetPath,
        ?string $eventKey = null,
        ?array $payload = null
    ): void {
        $statement = $this->connection->prepare(
            'INSERT INTO user_notifications (
                user_id,
                type,
                title,
                message,
                target_path,
                payload_json,
                event_key
            ) VALUES (
                :user_id,
                :type,
                :title,
                :message,
                :target_path,
                CAST(:payload_json AS JSONB),
                :event_key
            )
            ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING'
        );
        $statement->execute([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'target_path' => $targetPath,
            'payload_json' => $payload !== null ? json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
            'event_key' => $eventKey,
        ]);
    }

    private function isLikeMilestone(int $likeCount): bool
    {
        if ($likeCount === 1) {
            return true;
        }

        if ($likeCount < 10) {
            return false;
        }

        while ($likeCount % 10 === 0) {
            $likeCount /= 10;
        }

        return $likeCount === 1;
    }

    private function buildPostPreview(string $content, int $limit = 20): string
    {
        $normalized = trim(preg_replace('/\s+/', ' ', $content) ?? '');
        if ($normalized === '') {
            return '...';
        }

        if (mb_strlen($normalized) <= $limit) {
            return $normalized;
        }

        return rtrim(mb_substr($normalized, 0, $limit)) . '...';
    }

    private function formatRelativeDaysMessage(int $daysUntil): string
    {
        if ($daysUntil === 1) {
            return 'za 1 dzień';
        }

        $lastTwoDigits = $daysUntil % 100;
        $lastDigit = $daysUntil % 10;

        if ($lastDigit >= 2 && $lastDigit <= 4 && ($lastTwoDigits < 12 || $lastTwoDigits > 14)) {
            return 'za ' . $daysUntil . ' dni';
        }

        return 'za ' . $daysUntil . ' dni';
    }

    private function buildVehicleDetailsPath(int $vehicleId, string $displayName): string
    {
        $slug = $this->slugify($displayName);
        if ($slug === '') {
            $slug = 'pojazd-' . $vehicleId;
        }

        return '/my-cars/' . $vehicleId . rawurlencode($slug);
    }

    private function normalizeVehicleDisplayName(string $displayName): string
    {
        $normalized = trim($displayName);
        return $normalized !== '' ? $normalized : 'Pojazd';
    }

    private function slugify(string $value): string
    {
        $normalized = trim($value);
        if ($normalized === '') {
            return '';
        }

        $transliterated = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        if ($transliterated !== false && $transliterated !== '') {
            $normalized = $transliterated;
        }

        $normalized = strtolower($normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';

        return trim($normalized, '-');
    }
}
