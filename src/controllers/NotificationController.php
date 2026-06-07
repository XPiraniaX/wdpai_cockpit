<?php

class NotificationController extends AppController
{
    public function index(): void
    {
        $this->requireAuthentication();

        $repository = new NotificationRepository(Database::getConnection());
        $userId = $this->getCurrentUserId();
        $repository->syncUserNotifications($userId);

        if ($this->isPost()) {
            $action = (string) ($_POST['action'] ?? '');

            if ($action === 'mark_read') {
                $notificationId = (int) ($_POST['notification_id'] ?? 0);
                if ($notificationId <= 0) {
                    $this->jsonResponse([
                        'success' => false,
                        'message' => 'Nieprawidłowe powiadomienie.',
                    ], 422);
                }

                $notification = $repository->markAsRead($userId, $notificationId);
                if ($notification === null) {
                    $this->jsonResponse([
                        'success' => false,
                        'message' => 'Nie znaleziono powiadomienia.',
                    ], 404);
                }

                $this->jsonResponse([
                    'success' => true,
                    'notification_id' => $notificationId,
                    'unread_count' => $repository->getUnreadCount($userId),
                    'target_path' => (string) ($notification['target_path'] ?? '/dashboard'),
                ]);
            }

            $this->jsonResponse([
                'success' => false,
                'message' => 'Nieobsługiwana akcja powiadomień.',
            ], 400);
        }

        if ($this->isAjaxRequest()) {
            $notifications = array_map(
                fn (array $notification): array => $this->mapNotification($notification),
                $repository->getNotifications($userId)
            );

            $this->jsonResponse([
                'success' => true,
                'unread_count' => $repository->getUnreadCount($userId),
                'notifications' => $notifications,
            ]);
        }

        $this->redirect('/dashboard');
    }

    private function mapNotification(array $notification): array
    {
        $createdAtRaw = (string) ($notification['created_at'] ?? '');
        $createdAt = $createdAtRaw !== ''
            ? new DateTimeImmutable($createdAtRaw)
            : null;

        return [
            'id' => (int) ($notification['id'] ?? 0),
            'type' => (string) ($notification['type'] ?? ''),
            'title' => (string) ($notification['title'] ?? ''),
            'message' => (string) ($notification['message'] ?? ''),
            'target_path' => (string) ($notification['target_path'] ?? '/dashboard'),
            'payload' => $this->decodeNotificationPayload($notification['payload_json'] ?? null),
            'is_read' => (bool) ($notification['is_read'] ?? false),
            'created_at' => $createdAtRaw,
            'created_at_label' => $createdAt ? $createdAt->format('d.m.Y • H:i') : '',
        ];
    }

    private function decodeNotificationPayload(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : null;
    }
}
