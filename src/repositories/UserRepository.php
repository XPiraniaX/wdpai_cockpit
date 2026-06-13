<?php

class UserRepository
{
    private ?bool $hasApplicationSettingsColumns = null;
    private ?bool $hasCommunitySettingsColumns = null;
    private ?bool $hasMarketplaceSettingsColumns = null;
    private ?bool $hasNotificationSettingsColumns = null;

    public function __construct(private PDO $connection)
    {
    }

    public function getById(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                id,
                username,
                email,
                first_name,
                last_name,
                pseudonym,
                avatar_path,
                CONCAT(first_name, ' ', last_name) AS full_name,
                role,
                membership_tier,
                is_blocked,
                blocked_until,
                blocked_reason,
                blocked_is_permanent,
                blocked_at,
                community_blocked_until,
                community_block_reason,
                community_block_is_permanent,
                community_blocked_at,
                marketplace_blocked_until,
                marketplace_block_reason,
                marketplace_block_is_permanent,
                marketplace_blocked_at,
                admin_warning_message,
                admin_warning_sent_at,
                created_at
            FROM users
            WHERE id = :user_id
                AND is_active = TRUE
            LIMIT 1"
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function findForAuthentication(string $login): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                id,
                username,
                email,
                password,
                first_name,
                last_name,
                pseudonym,
                role,
                membership_tier,
                is_blocked,
                blocked_until,
                blocked_reason,
                blocked_is_permanent,
                community_blocked_until,
                community_block_reason,
                community_block_is_permanent,
                community_blocked_at,
                marketplace_blocked_until,
                marketplace_block_reason,
                marketplace_block_is_permanent,
                marketplace_blocked_at,
                admin_warning_message,
                admin_warning_sent_at,
                is_active
            FROM users
            WHERE (
                LOWER(email) = LOWER(:login)
                OR LOWER(username) = LOWER(:login)
            )
                AND is_active = TRUE
            LIMIT 1"
        );
        $statement->execute([
            'login' => $login,
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function getAuthenticationDataById(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                id,
                password,
                role,
                is_blocked,
                blocked_until,
                blocked_reason,
                blocked_is_permanent,
                community_blocked_until,
                community_block_reason,
                community_block_is_permanent,
                community_blocked_at,
                marketplace_blocked_until,
                marketplace_block_reason,
                marketplace_block_is_permanent,
                marketplace_blocked_at,
                admin_warning_message,
                admin_warning_sent_at,
                is_active
            FROM users
            WHERE id = :user_id
            LIMIT 1"
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function logFailedAuthenticationAttempt(string $loginIdentifier, string $ipAddress, ?string $userAgent = null): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO auth_login_attempts (
                login_identifier,
                ip_address,
                user_agent,
                attempted_at,
                was_successful
            ) VALUES (
                :login_identifier,
                :ip_address,
                :user_agent,
                CURRENT_TIMESTAMP,
                FALSE
            )'
        );
        $statement->execute([
            'login_identifier' => mb_substr(trim($loginIdentifier), 0, 255),
            'ip_address' => mb_substr(trim($ipAddress), 0, 64),
            'user_agent' => $userAgent !== null ? mb_substr(trim($userAgent), 0, 1000) : null,
        ]);
    }

    public function usernameExists(string $username): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1 FROM users WHERE LOWER(username) = LOWER(:username) LIMIT 1'
        );
        $statement->execute([
            'username' => $username,
        ]);

        return (bool) $statement->fetchColumn();
    }

    public function emailExists(string $email): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1 FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1'
        );
        $statement->execute([
            'email' => $email,
        ]);

        return (bool) $statement->fetchColumn();
    }

    public function usernameExistsForOtherUser(string $username, int $excludedUserId): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1
            FROM users
            WHERE LOWER(username) = LOWER(:username)
                AND id <> :excluded_user_id
            LIMIT 1'
        );
        $statement->execute([
            'username' => $username,
            'excluded_user_id' => $excludedUserId,
        ]);

        return (bool) $statement->fetchColumn();
    }

    public function emailExistsForOtherUser(string $email, int $excludedUserId): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1
            FROM users
            WHERE LOWER(email) = LOWER(:email)
                AND id <> :excluded_user_id
            LIMIT 1'
        );
        $statement->execute([
            'email' => $email,
            'excluded_user_id' => $excludedUserId,
        ]);

        return (bool) $statement->fetchColumn();
    }

    public function pseudonymExistsForOtherUser(string $pseudonym, int $excludedUserId): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1
            FROM users
            WHERE LOWER(pseudonym) = LOWER(:pseudonym)
                AND id <> :excluded_user_id
            LIMIT 1'
        );
        $statement->execute([
            'pseudonym' => $pseudonym,
            'excluded_user_id' => $excludedUserId,
        ]);

        return (bool) $statement->fetchColumn();
    }

    public function createUser(array $data): int
    {
        $this->connection->beginTransaction();

        try {
            $userStatement = $this->connection->prepare(
                'INSERT INTO users (
                    username,
                    email,
                    password,
                    first_name,
                    last_name,
                    pseudonym,
                    membership_tier,
                    avatar_path,
                    timezone,
                    locale,
                    last_login_at
                ) VALUES (
                    :username,
                    :email,
                    :password,
                    :first_name,
                    :last_name,
                    NULL,
                    :membership_tier,
                    NULL,
                    :timezone,
                    :locale,
                    NULL
                )
                RETURNING id'
            );
            $userStatement->execute([
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => $data['password'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'membership_tier' => 'free',
                'timezone' => 'Europe/Warsaw',
                'locale' => 'pl_PL',
            ]);

            $userId = (int) $userStatement->fetchColumn();

            $columns = [
                'user_id',
                'email_notifications',
                'push_notifications',
                'maintenance_reminders',
                'inspection_reminders',
                'insurance_reminders',
                'privacy_profile_visibility',
                'privacy_full_name_visibility',
                'privacy_membership_visibility',
                'privacy_profile_posts_visibility',
                'privacy_profile_listings_visibility',
            ];

            $placeholders = [
                ':user_id',
                'TRUE',
                'FALSE',
                'TRUE',
                'TRUE',
                'TRUE',
                ':privacy_profile_visibility',
                ':privacy_full_name_visibility',
                ':privacy_membership_visibility',
                ':privacy_profile_posts_visibility',
                ':privacy_profile_listings_visibility',
            ];

            $params = [
                'user_id' => $userId,
                'privacy_profile_visibility' => 'private',
                'privacy_full_name_visibility' => 'public',
                'privacy_membership_visibility' => 'public',
                'privacy_profile_posts_visibility' => 'public',
                'privacy_profile_listings_visibility' => 'public',
            ];

            if ($this->hasApplicationSettingsColumns()) {
                $columns[] = 'app_distance_unit';
                $columns[] = 'app_consumption_format';
                $placeholders[] = ':app_distance_unit';
                $placeholders[] = ':app_consumption_format';
                $params['app_distance_unit'] = 'km';
                $params['app_consumption_format'] = 'l_100km';
            }

            if ($this->hasMarketplaceSettingsColumns()) {
                $columns[] = 'marketplace_default_scope';
                $columns[] = 'marketplace_default_sort';
                $columns[] = 'marketplace_preferred_contact_channel';
                $placeholders[] = ':marketplace_default_scope';
                $placeholders[] = ':marketplace_default_sort';
                $placeholders[] = ':marketplace_preferred_contact_channel';
                $params['marketplace_default_scope'] = 'all';
                $params['marketplace_default_sort'] = 'newest';
                $params['marketplace_preferred_contact_channel'] = 'both';
            }

            if ($this->hasCommunitySettingsColumns()) {
                $columns[] = 'community_default_scope';
                $placeholders[] = ':community_default_scope';
                $params['community_default_scope'] = 'all';
            }

            if ($this->hasNotificationSettingsColumns()) {
                $columns[] = 'notification_profile_membership';
                $columns[] = 'notification_post_likes';
                $columns[] = 'notification_post_comments';
                $columns[] = 'notification_marketplace_activity';
                $placeholders[] = 'TRUE';
                $placeholders[] = 'TRUE';
                $placeholders[] = 'TRUE';
                $placeholders[] = 'TRUE';
            }

            $settingsStatement = $this->connection->prepare(
                'INSERT INTO user_settings (' . implode(', ', $columns) . ')
                VALUES (' . implode(', ', $placeholders) . ')'
            );
            $settingsStatement->execute($params);

            $this->connection->commit();

            return $userId;
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function updateLastLoginAt(int $userId): void
    {
        $statement = $this->connection->prepare(
            'UPDATE users
            SET last_login_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);
    }

    public function sendAdminWarning(int $userId, string $message): void
    {
        $this->createAdminUserNotice(
            $userId,
            'warning',
            'Ostrzeżenie administratora',
            $message
        );

        $statement = $this->connection->prepare(
            'UPDATE users
            SET admin_warning_message = NULL,
                admin_warning_sent_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id
                AND is_active = TRUE'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);
    }

    public function clearAdminWarning(int $userId): void
    {
        $this->acknowledgeOldestAdminUserNotice($userId);

        $statement = $this->connection->prepare(
            'UPDATE users
            SET admin_warning_message = NULL,
                admin_warning_sent_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id
                AND is_active = TRUE'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);
    }

    public function getPendingAdminUserNotice(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            'SELECT
                id,
                notice_type,
                title,
                message,
                created_at
            FROM admin_user_notices
            WHERE user_id = :user_id
                AND acknowledged_at IS NULL
            ORDER BY created_at ASC, id ASC
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch();
        return $row ?: null;
    }

    public function acknowledgeOldestAdminUserNotice(int $userId): void
    {
        $statement = $this->connection->prepare(
            'WITH next_notice AS (
                SELECT id
                FROM admin_user_notices
                WHERE user_id = :user_id
                    AND acknowledged_at IS NULL
                ORDER BY created_at ASC, id ASC
                LIMIT 1
            )
            UPDATE admin_user_notices
            SET acknowledged_at = CURRENT_TIMESTAMP
            WHERE id IN (SELECT id FROM next_notice)'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);
    }

    public function createAdminUserNotice(int $userId, string $noticeType, string $title, string $message): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO admin_user_notices (
                user_id,
                notice_type,
                title,
                message
            ) VALUES (
                :user_id,
                :notice_type,
                :title,
                :message
            )'
        );
        $statement->execute([
            'user_id' => $userId,
            'notice_type' => $noticeType,
            'title' => $title,
            'message' => $message,
        ]);
    }

    public function updatePseudonym(int $userId, string $pseudonym): void
    {
        $statement = $this->connection->prepare(
            'UPDATE users
            SET pseudonym = :pseudonym,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
            'pseudonym' => $pseudonym,
        ]);
    }

    public function updateAvatarPath(int $userId, ?string $avatarPath): void
    {
        $statement = $this->connection->prepare(
            'UPDATE users
            SET avatar_path = :avatar_path,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id'
        );
        $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
        if ($avatarPath === null || $avatarPath === '') {
            $statement->bindValue(':avatar_path', null, PDO::PARAM_NULL);
        } else {
            $statement->bindValue(':avatar_path', $avatarPath, PDO::PARAM_STR);
        }
        $statement->execute();
    }

    public function updateAccountData(
        int $userId,
        string $username,
        string $email,
        string $firstName,
        string $lastName,
        string $pseudonym
    ): void {
        $statement = $this->connection->prepare(
            'UPDATE users
            SET username = :username,
                email = :email,
                first_name = :first_name,
                last_name = :last_name,
                pseudonym = :pseudonym,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
            'username' => $username,
            'email' => $email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'pseudonym' => $pseudonym,
        ]);
    }

    public function updatePassword(int $userId, string $passwordHash): void
    {
        $statement = $this->connection->prepare(
            'UPDATE users
            SET password = :password,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
            'password' => $passwordHash,
        ]);
    }

    public function getPrivacySettings(int $userId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                privacy_full_name_visibility,
                privacy_membership_visibility,
                privacy_profile_posts_visibility,
                privacy_profile_listings_visibility
            FROM user_settings
            WHERE user_id = :user_id
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'privacy_full_name_visibility' => (string) ($row['privacy_full_name_visibility'] ?? 'public'),
            'privacy_membership_visibility' => (string) ($row['privacy_membership_visibility'] ?? 'public'),
            'privacy_profile_posts_visibility' => (string) ($row['privacy_profile_posts_visibility'] ?? 'public'),
            'privacy_profile_listings_visibility' => (string) ($row['privacy_profile_listings_visibility'] ?? 'public'),
        ];
    }

    public function updatePrivacySettings(int $userId, array $settings): void
    {
        $statement = $this->connection->prepare(
            'UPDATE user_settings
            SET privacy_full_name_visibility = :privacy_full_name_visibility,
                privacy_membership_visibility = :privacy_membership_visibility,
                privacy_profile_posts_visibility = :privacy_profile_posts_visibility,
                privacy_profile_listings_visibility = :privacy_profile_listings_visibility,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
            'privacy_full_name_visibility' => $settings['privacy_full_name_visibility'],
            'privacy_membership_visibility' => $settings['privacy_membership_visibility'],
            'privacy_profile_posts_visibility' => $settings['privacy_profile_posts_visibility'],
            'privacy_profile_listings_visibility' => $settings['privacy_profile_listings_visibility'],
        ]);
    }

    public function getApplicationSettings(int $userId): array
    {
        if (!$this->hasApplicationSettingsColumns()) {
            return [
                'app_distance_unit' => 'km',
                'app_consumption_format' => 'l_100km',
            ];
        }

        $statement = $this->connection->prepare(
            'SELECT
                app_distance_unit,
                app_consumption_format
            FROM user_settings
            WHERE user_id = :user_id
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'app_distance_unit' => (string) ($row['app_distance_unit'] ?? 'km'),
            'app_consumption_format' => (string) ($row['app_consumption_format'] ?? 'l_100km'),
        ];
    }

    public function updateApplicationSettings(int $userId, array $settings): void
    {
        if (!$this->hasApplicationSettingsColumns()) {
            return;
        }

        $statement = $this->connection->prepare(
            'UPDATE user_settings
            SET app_distance_unit = :app_distance_unit,
                app_consumption_format = :app_consumption_format,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
            'app_distance_unit' => $settings['app_distance_unit'],
            'app_consumption_format' => $settings['app_consumption_format'],
        ]);
    }

    public function getCommunitySettings(int $userId): array
    {
        if (!$this->hasCommunitySettingsColumns()) {
            return [
                'community_default_scope' => 'all',
            ];
        }

        $statement = $this->connection->prepare(
            'SELECT
                community_default_scope
            FROM user_settings
            WHERE user_id = :user_id
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'community_default_scope' => (string) ($row['community_default_scope'] ?? 'all'),
        ];
    }

    public function updateCommunitySettings(int $userId, array $settings): void
    {
        if (!$this->hasCommunitySettingsColumns()) {
            return;
        }

        $statement = $this->connection->prepare(
            'UPDATE user_settings
            SET community_default_scope = :community_default_scope,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
            'community_default_scope' => $settings['community_default_scope'],
        ]);
    }

    public function getNotificationSettings(int $userId): array
    {
        $defaults = [
            'notification_vehicle_acceptance' => true,
            'notification_vehicle_documents' => true,
            'notification_profile_membership' => true,
            'notification_post_likes' => true,
            'notification_post_comments' => true,
        ];

        if (!$this->hasNotificationSettingsColumns()) {
            return $defaults;
        }

        $statement = $this->connection->prepare(
            'SELECT
                maintenance_reminders,
                inspection_reminders,
                insurance_reminders,
                notification_profile_membership,
                notification_post_likes,
                notification_post_comments
            FROM user_settings
            WHERE user_id = :user_id
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'notification_vehicle_acceptance' => array_key_exists('maintenance_reminders', $row) ? (bool) $row['maintenance_reminders'] : true,
            'notification_vehicle_documents' => (
                array_key_exists('inspection_reminders', $row) ? (bool) $row['inspection_reminders'] : true
            ) || (
                array_key_exists('insurance_reminders', $row) ? (bool) $row['insurance_reminders'] : true
            ),
            'notification_profile_membership' => array_key_exists('notification_profile_membership', $row) ? (bool) $row['notification_profile_membership'] : true,
            'notification_post_likes' => array_key_exists('notification_post_likes', $row) ? (bool) $row['notification_post_likes'] : true,
            'notification_post_comments' => array_key_exists('notification_post_comments', $row) ? (bool) $row['notification_post_comments'] : true,
        ];
    }

    public function updateNotificationSettings(int $userId, array $settings): void
    {
        if (!$this->hasNotificationSettingsColumns()) {
            return;
        }

        $statement = $this->connection->prepare(
            'UPDATE user_settings
            SET maintenance_reminders = :maintenance_reminders,
                inspection_reminders = :inspection_reminders,
                insurance_reminders = :insurance_reminders,
                notification_profile_membership = :notification_profile_membership,
                notification_post_likes = :notification_post_likes,
                notification_post_comments = :notification_post_comments,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
            'maintenance_reminders' => $settings['notification_vehicle_acceptance'] ? 'true' : 'false',
            'inspection_reminders' => $settings['notification_vehicle_documents'] ? 'true' : 'false',
            'insurance_reminders' => $settings['notification_vehicle_documents'] ? 'true' : 'false',
            'notification_profile_membership' => $settings['notification_profile_membership'] ? 'true' : 'false',
            'notification_post_likes' => $settings['notification_post_likes'] ? 'true' : 'false',
            'notification_post_comments' => $settings['notification_post_comments'] ? 'true' : 'false',
        ]);
    }

    public function getMarketplaceSettings(int $userId): array
    {
        if (!$this->hasMarketplaceSettingsColumns()) {
            return [
                'marketplace_default_scope' => 'all',
                'marketplace_default_sort' => 'newest',
                'marketplace_preferred_contact_channel' => 'both',
            ];
        }

        $statement = $this->connection->prepare(
            'SELECT
                marketplace_default_scope,
                marketplace_default_sort,
                marketplace_preferred_contact_channel
            FROM user_settings
            WHERE user_id = :user_id
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'marketplace_default_scope' => (string) ($row['marketplace_default_scope'] ?? 'all'),
            'marketplace_default_sort' => (string) ($row['marketplace_default_sort'] ?? 'newest'),
            'marketplace_preferred_contact_channel' => (string) ($row['marketplace_preferred_contact_channel'] ?? 'both'),
        ];
    }

    public function updateMarketplaceSettings(int $userId, array $settings): void
    {
        if (!$this->hasMarketplaceSettingsColumns()) {
            return;
        }

        $statement = $this->connection->prepare(
            'UPDATE user_settings
            SET marketplace_default_scope = :marketplace_default_scope,
                marketplace_default_sort = :marketplace_default_sort,
                marketplace_preferred_contact_channel = :marketplace_preferred_contact_channel,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = :user_id'
        );
        $statement->execute([
            'user_id' => $userId,
            'marketplace_default_scope' => $settings['marketplace_default_scope'],
            'marketplace_default_sort' => $settings['marketplace_default_sort'],
            'marketplace_preferred_contact_channel' => $settings['marketplace_preferred_contact_channel'],
        ]);
    }

    public function countAdminCatalogUsers(): int
    {
        $statement = $this->connection->query(
            'SELECT COUNT(*)::INTEGER
            FROM users
            WHERE is_active = TRUE'
        );

        return (int) $statement->fetchColumn();
    }

    public function getAdminGlobalStats(): array
    {
        $statement = $this->connection->query(
            "SELECT
                (SELECT COUNT(*)::INTEGER
                 FROM users u
                 WHERE u.is_active = TRUE) AS total_users,
                (SELECT COUNT(*)::INTEGER
                 FROM users u
                 WHERE u.is_active = TRUE
                   AND u.last_login_at IS NOT NULL
                   AND u.last_login_at >= (CURRENT_TIMESTAMP - INTERVAL '10 minutes')) AS active_users,
                (SELECT COUNT(*)::INTEGER
                 FROM vehicles v
                 WHERE v.status <> 'archived') AS vehicle_count,
                (SELECT COUNT(*)::INTEGER
                 FROM community_posts p
                 WHERE p.is_active = TRUE) AS active_post_count,
                (SELECT COUNT(*)::INTEGER
                 FROM marketplace_listings l
                 WHERE l.is_active = TRUE) AS active_listing_count"
        );

        $row = $statement->fetch() ?: [];

        return [
            'total_users' => (int) ($row['total_users'] ?? 0),
            'active_users' => (int) ($row['active_users'] ?? 0),
            'vehicle_count' => (int) ($row['vehicle_count'] ?? 0),
            'active_post_count' => (int) ($row['active_post_count'] ?? 0),
            'active_listing_count' => (int) ($row['active_listing_count'] ?? 0),
        ];
    }

    public function getAdminCatalogPageForUser(int $userId, int $perPage): int
    {
        $perPage = max(1, $perPage);

        $statement = $this->connection->prepare(
            "SELECT ranked.row_number
            FROM (
                SELECT
                    id,
                    ROW_NUMBER() OVER (
                        ORDER BY LOWER(COALESCE(NULLIF(pseudonym, ''), username)) ASC, id ASC
                    ) AS row_number
                FROM users
                WHERE is_active = TRUE
            ) AS ranked
            WHERE ranked.id = :user_id
            LIMIT 1"
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $rowNumber = (int) $statement->fetchColumn();
        if ($rowNumber <= 0) {
            return 1;
        }

        return max(1, (int) ceil($rowNumber / $perPage));
    }

    public function searchAdminCatalogUsers(string $query, int $limit = 6): array
    {
        $normalizedQuery = trim($query);
        if ($normalizedQuery === '') {
            return [];
        }

        $limit = max(1, min(10, $limit));
        $searchLike = '%' . $normalizedQuery . '%';
        $prefixLike = $normalizedQuery . '%';

        $statement = $this->connection->prepare(
            "SELECT
                u.id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.pseudonym,
                u.avatar_path,
                COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), 'Użytkownik') AS full_name
            FROM users u
            WHERE u.is_active = TRUE
                AND (
                    COALESCE(u.pseudonym, '') ILIKE :search_like
                    OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE :search_like
                    OR COALESCE(u.email, '') ILIKE :search_like
                )
            ORDER BY
                CASE
                    WHEN COALESCE(u.pseudonym, '') ILIKE :exact_value THEN 0
                    WHEN COALESCE(u.pseudonym, '') ILIKE :prefix_like THEN 1
                    WHEN CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE :exact_value THEN 2
                    WHEN CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE :prefix_like THEN 3
                    WHEN COALESCE(u.email, '') ILIKE :exact_value THEN 4
                    WHEN COALESCE(u.email, '') ILIKE :prefix_like THEN 5
                    WHEN COALESCE(u.pseudonym, '') ILIKE :search_like THEN 6
                    WHEN CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) ILIKE :search_like THEN 7
                    ELSE 8
                END ASC,
                LOWER(COALESCE(NULLIF(u.pseudonym, ''), u.username)) ASC,
                u.id ASC
            LIMIT :limit"
        );
        $statement->bindValue(':search_like', $searchLike, PDO::PARAM_STR);
        $statement->bindValue(':prefix_like', $prefixLike, PDO::PARAM_STR);
        $statement->bindValue(':exact_value', $normalizedQuery, PDO::PARAM_STR);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function getAdminCatalogUsersPage(int $page, int $perPage): array
    {
        $page = max(1, $page);
        $perPage = max(1, $perPage);
        $offset = ($page - 1) * $perPage;

        $statement = $this->connection->prepare(
            "SELECT
                u.id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.pseudonym,
                u.avatar_path,
                u.membership_tier,
                u.last_login_at,
                u.is_blocked,
                u.blocked_until,
                u.blocked_reason,
                u.blocked_is_permanent,
                u.community_blocked_until,
                u.community_block_reason,
                u.community_block_is_permanent,
                u.marketplace_blocked_until,
                u.marketplace_block_reason,
                u.marketplace_block_is_permanent,
                u.community_blocked_until,
                u.community_block_reason,
                u.community_block_is_permanent,
                u.marketplace_blocked_until,
                u.marketplace_block_reason,
                u.marketplace_block_is_permanent,
                u.community_blocked_until,
                u.community_block_reason,
                u.community_block_is_permanent,
                u.marketplace_blocked_until,
                u.marketplace_block_reason,
                u.marketplace_block_is_permanent,
                COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), 'Użytkownik') AS full_name,
                COALESCE(v.vehicle_count, 0)::INTEGER AS vehicle_count,
                COALESCE(l.listing_count, 0)::INTEGER AS listing_count,
                COALESCE(p.post_count, 0)::INTEGER AS post_count,
                COALESCE(arl.removed_listing_count, 0)::INTEGER AS admin_removed_listing_count,
                COALESCE(arp.removed_post_count, 0)::INTEGER AS admin_removed_post_count,
                last_ban.duration_label AS last_ban_duration_label,
                last_ban.banned_until AS last_ban_until,
                last_ban.is_permanent AS last_ban_is_permanent,
                last_ban.created_at AS last_ban_created_at,
                last_community_block.duration_label AS last_community_block_duration_label,
                last_community_block.blocked_until AS last_community_block_until,
                last_community_block.is_permanent AS last_community_block_is_permanent,
                last_community_block.created_at AS last_community_block_created_at,
                last_marketplace_block.duration_label AS last_marketplace_block_duration_label,
                last_marketplace_block.blocked_until AS last_marketplace_block_until,
                last_marketplace_block.is_permanent AS last_marketplace_block_is_permanent,
                last_marketplace_block.created_at AS last_marketplace_block_created_at
            FROM users u
            LEFT JOIN (
                SELECT
                    user_id,
                    COUNT(*)::INTEGER AS vehicle_count
                FROM vehicles
                WHERE status <> 'archived'
                GROUP BY user_id
            ) v ON v.user_id = u.id
            LEFT JOIN (
                SELECT
                    user_id,
                    COUNT(*)::INTEGER AS listing_count
                FROM marketplace_listings
                WHERE is_active = TRUE
                    OR hidden_by_user_ban = TRUE
                    OR hidden_by_marketplace_block = TRUE
                GROUP BY user_id
            ) l ON l.user_id = u.id
            LEFT JOIN (
                SELECT
                    user_id,
                    COUNT(*)::INTEGER AS post_count
                FROM community_posts
                WHERE is_active = TRUE
                    OR hidden_by_user_ban = TRUE
                    OR hidden_by_community_block = TRUE
                GROUP BY user_id
            ) p ON p.user_id = u.id
            LEFT JOIN (
                SELECT
                    user_id,
                    COUNT(*)::INTEGER AS removed_listing_count
                FROM admin_removed_listings
                GROUP BY user_id
            ) arl ON arl.user_id = u.id
            LEFT JOIN (
                SELECT
                    user_id,
                    COUNT(*)::INTEGER AS removed_post_count
                FROM admin_removed_posts
                GROUP BY user_id
            ) arp ON arp.user_id = u.id
            LEFT JOIN LATERAL (
                SELECT
                    duration_label,
                    banned_until,
                    is_permanent,
                    created_at
                FROM user_ban_history
                WHERE user_id = u.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) AS last_ban ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    duration_label,
                    blocked_until,
                    is_permanent,
                    created_at
                FROM user_community_block_history
                WHERE user_id = u.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) AS last_community_block ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    duration_label,
                    blocked_until,
                    is_permanent,
                    created_at
                FROM user_marketplace_block_history
                WHERE user_id = u.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) AS last_marketplace_block ON TRUE
            WHERE u.is_active = TRUE
            ORDER BY LOWER(COALESCE(NULLIF(u.pseudonym, ''), u.username)) ASC, u.id ASC
            LIMIT :limit OFFSET :offset"
        );
        $statement->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll() ?: [];
    }

    public function getAdminCatalogUserById(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                u.id,
                u.username,
                u.email,
                u.first_name,
                u.last_name,
                u.pseudonym,
                u.avatar_path,
                u.membership_tier,
                u.last_login_at,
                u.is_blocked,
                u.blocked_until,
                u.blocked_reason,
                u.blocked_is_permanent,
                COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), 'Użytkownik') AS full_name,
                COALESCE(v.vehicle_count, 0)::INTEGER AS vehicle_count,
                COALESCE(l.listing_count, 0)::INTEGER AS listing_count,
                COALESCE(p.post_count, 0)::INTEGER AS post_count,
                COALESCE(arl.removed_listing_count, 0)::INTEGER AS admin_removed_listing_count,
                COALESCE(arp.removed_post_count, 0)::INTEGER AS admin_removed_post_count,
                last_ban.duration_label AS last_ban_duration_label,
                last_ban.banned_until AS last_ban_until,
                last_ban.is_permanent AS last_ban_is_permanent,
                last_ban.created_at AS last_ban_created_at,
                last_community_block.duration_label AS last_community_block_duration_label,
                last_community_block.blocked_until AS last_community_block_until,
                last_community_block.is_permanent AS last_community_block_is_permanent,
                last_community_block.created_at AS last_community_block_created_at,
                last_marketplace_block.duration_label AS last_marketplace_block_duration_label,
                last_marketplace_block.blocked_until AS last_marketplace_block_until,
                last_marketplace_block.is_permanent AS last_marketplace_block_is_permanent,
                last_marketplace_block.created_at AS last_marketplace_block_created_at
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*)::INTEGER AS vehicle_count
                FROM vehicles
                WHERE status <> 'archived'
                GROUP BY user_id
            ) v ON v.user_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*)::INTEGER AS listing_count
                FROM marketplace_listings
                WHERE is_active = TRUE
                    OR hidden_by_user_ban = TRUE
                    OR hidden_by_marketplace_block = TRUE
                GROUP BY user_id
            ) l ON l.user_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*)::INTEGER AS post_count
                FROM community_posts
                WHERE is_active = TRUE
                    OR hidden_by_user_ban = TRUE
                    OR hidden_by_community_block = TRUE
                GROUP BY user_id
            ) p ON p.user_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*)::INTEGER AS removed_listing_count
                FROM admin_removed_listings
                GROUP BY user_id
            ) arl ON arl.user_id = u.id
            LEFT JOIN (
                SELECT user_id, COUNT(*)::INTEGER AS removed_post_count
                FROM admin_removed_posts
                GROUP BY user_id
            ) arp ON arp.user_id = u.id
            LEFT JOIN LATERAL (
                SELECT
                    duration_label,
                    banned_until,
                    is_permanent,
                    created_at
                FROM user_ban_history
                WHERE user_id = u.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) AS last_ban ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    duration_label,
                    blocked_until,
                    is_permanent,
                    created_at
                FROM user_community_block_history
                WHERE user_id = u.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) AS last_community_block ON TRUE
            LEFT JOIN LATERAL (
                SELECT
                    duration_label,
                    blocked_until,
                    is_permanent,
                    created_at
                FROM user_marketplace_block_history
                WHERE user_id = u.id
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            ) AS last_marketplace_block ON TRUE
            WHERE u.id = :user_id
                AND u.is_active = TRUE
            LIMIT 1"
        );
        $statement->execute([
            'user_id' => $userId,
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function banUserByAdmin(int $userId, string $reason, string $durationCode, string $durationLabel, ?string $blockedUntil, bool $isPermanent): void
    {
        $this->connection->beginTransaction();

        try {
            $historyStatement = $this->connection->prepare(
                'INSERT INTO user_ban_history (
                    user_id,
                    reason,
                    duration_code,
                    duration_label,
                    banned_until,
                    is_permanent
                ) VALUES (
                    :user_id,
                    :reason,
                    :duration_code,
                    :duration_label,
                    :banned_until,
                    :is_permanent
                )'
            );
            $historyStatement->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $historyStatement->bindValue(':reason', $reason, PDO::PARAM_STR);
            $historyStatement->bindValue(':duration_code', $durationCode, PDO::PARAM_STR);
            $historyStatement->bindValue(':duration_label', $durationLabel, PDO::PARAM_STR);
            if ($blockedUntil === null) {
                $historyStatement->bindValue(':banned_until', null, PDO::PARAM_NULL);
            } else {
                $historyStatement->bindValue(':banned_until', $blockedUntil, PDO::PARAM_STR);
            }
            $historyStatement->bindValue(':is_permanent', $isPermanent, PDO::PARAM_BOOL);
            $historyStatement->execute();

            $userStatement = $this->connection->prepare(
                'UPDATE users
                SET is_blocked = TRUE,
                    blocked_until = :blocked_until,
                    blocked_reason = :blocked_reason,
                    blocked_is_permanent = :blocked_is_permanent,
                    blocked_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :user_id
                    AND is_active = TRUE'
            );
            if ($blockedUntil === null) {
                $userStatement->bindValue(':blocked_until', null, PDO::PARAM_NULL);
            } else {
                $userStatement->bindValue(':blocked_until', $blockedUntil, PDO::PARAM_STR);
            }
            $userStatement->bindValue(':blocked_reason', $reason, PDO::PARAM_STR);
            $userStatement->bindValue(':blocked_is_permanent', $isPermanent, PDO::PARAM_BOOL);
            $userStatement->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $userStatement->execute();

            $postStatement = $this->connection->prepare(
                'UPDATE community_posts
                SET is_active = FALSE,
                    hidden_by_user_ban = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $postStatement->execute([
                'user_id' => $userId,
            ]);

            $commentStatement = $this->connection->prepare(
                'UPDATE community_comments
                SET is_active = FALSE,
                    hidden_by_user_ban = TRUE
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $commentStatement->execute([
                'user_id' => $userId,
            ]);

            $listingStatement = $this->connection->prepare(
                'UPDATE marketplace_listings
                SET is_active = FALSE,
                    hidden_by_user_ban = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $listingStatement->execute([
                'user_id' => $userId,
            ]);

            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function unbanUserByAdmin(int $userId): void
    {
        $this->connection->beginTransaction();

        try {
            $this->clearBanStateForUsers([$userId], true);
            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function blockCommunityFunctionsByAdmin(
        int $userId,
        string $reason,
        string $durationCode,
        string $durationLabel,
        ?string $blockedUntil,
        bool $isPermanent
    ): void {
        $this->connection->beginTransaction();

        try {
            $historyStatement = $this->connection->prepare(
                'INSERT INTO user_community_block_history (
                    user_id,
                    reason,
                    duration_code,
                    duration_label,
                    blocked_until,
                    is_permanent
                ) VALUES (
                    :user_id,
                    :reason,
                    :duration_code,
                    :duration_label,
                    :blocked_until,
                    :is_permanent
                )'
            );
            $historyStatement->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $historyStatement->bindValue(':reason', $reason, PDO::PARAM_STR);
            $historyStatement->bindValue(':duration_code', $durationCode, PDO::PARAM_STR);
            $historyStatement->bindValue(':duration_label', $durationLabel, PDO::PARAM_STR);
            if ($blockedUntil === null) {
                $historyStatement->bindValue(':blocked_until', null, PDO::PARAM_NULL);
            } else {
                $historyStatement->bindValue(':blocked_until', $blockedUntil, PDO::PARAM_STR);
            }
            $historyStatement->bindValue(':is_permanent', $isPermanent, PDO::PARAM_BOOL);
            $historyStatement->execute();

            $this->createAdminUserNotice(
                $userId,
                'community_block',
                'Ograniczenie funkcji społeczności',
                $this->buildAdminRestrictionNoticeMessage(
                    'Funkcje społeczności zostały ograniczone',
                    $reason,
                    $blockedUntil,
                    $isPermanent
                )
            );

            $userStatement = $this->connection->prepare(
                'UPDATE users
                SET community_blocked_until = :blocked_until,
                    community_block_reason = :blocked_reason,
                    community_block_is_permanent = :blocked_is_permanent,
                    community_blocked_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :user_id
                    AND is_active = TRUE'
            );
            if ($blockedUntil === null) {
                $userStatement->bindValue(':blocked_until', null, PDO::PARAM_NULL);
            } else {
                $userStatement->bindValue(':blocked_until', $blockedUntil, PDO::PARAM_STR);
            }
            $userStatement->bindValue(':blocked_reason', $reason, PDO::PARAM_STR);
            $userStatement->bindValue(':blocked_is_permanent', $isPermanent, PDO::PARAM_BOOL);
            $userStatement->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $userStatement->execute();

            $postStatement = $this->connection->prepare(
                'UPDATE community_posts
                SET is_active = FALSE,
                    hidden_by_community_block = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $postStatement->execute([
                'user_id' => $userId,
            ]);

            $commentStatement = $this->connection->prepare(
                'UPDATE community_comments
                SET is_active = FALSE,
                    hidden_by_community_block = TRUE
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $commentStatement->execute([
                'user_id' => $userId,
            ]);

            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function unblockCommunityFunctionsByAdmin(int $userId): void
    {
        $this->connection->beginTransaction();

        try {
            $this->clearCommunityBlockStateForUsers([$userId], true);
            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function blockMarketplaceFunctionsByAdmin(
        int $userId,
        string $reason,
        string $durationCode,
        string $durationLabel,
        ?string $blockedUntil,
        bool $isPermanent
    ): void {
        $this->connection->beginTransaction();

        try {
            $historyStatement = $this->connection->prepare(
                'INSERT INTO user_marketplace_block_history (
                    user_id,
                    reason,
                    duration_code,
                    duration_label,
                    blocked_until,
                    is_permanent
                ) VALUES (
                    :user_id,
                    :reason,
                    :duration_code,
                    :duration_label,
                    :blocked_until,
                    :is_permanent
                )'
            );
            $historyStatement->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $historyStatement->bindValue(':reason', $reason, PDO::PARAM_STR);
            $historyStatement->bindValue(':duration_code', $durationCode, PDO::PARAM_STR);
            $historyStatement->bindValue(':duration_label', $durationLabel, PDO::PARAM_STR);
            if ($blockedUntil === null) {
                $historyStatement->bindValue(':blocked_until', null, PDO::PARAM_NULL);
            } else {
                $historyStatement->bindValue(':blocked_until', $blockedUntil, PDO::PARAM_STR);
            }
            $historyStatement->bindValue(':is_permanent', $isPermanent, PDO::PARAM_BOOL);
            $historyStatement->execute();

            $this->createAdminUserNotice(
                $userId,
                'marketplace_block',
                'Ograniczenie funkcji marketplace',
                $this->buildAdminRestrictionNoticeMessage(
                    'Funkcje marketplace zostały ograniczone',
                    $reason,
                    $blockedUntil,
                    $isPermanent
                )
            );

            $userStatement = $this->connection->prepare(
                'UPDATE users
                SET marketplace_blocked_until = :blocked_until,
                    marketplace_block_reason = :blocked_reason,
                    marketplace_block_is_permanent = :blocked_is_permanent,
                    marketplace_blocked_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :user_id
                    AND is_active = TRUE'
            );
            if ($blockedUntil === null) {
                $userStatement->bindValue(':blocked_until', null, PDO::PARAM_NULL);
            } else {
                $userStatement->bindValue(':blocked_until', $blockedUntil, PDO::PARAM_STR);
            }
            $userStatement->bindValue(':blocked_reason', $reason, PDO::PARAM_STR);
            $userStatement->bindValue(':blocked_is_permanent', $isPermanent, PDO::PARAM_BOOL);
            $userStatement->bindValue(':user_id', $userId, PDO::PARAM_INT);
            $userStatement->execute();

            $listingStatement = $this->connection->prepare(
                'UPDATE marketplace_listings
                SET is_active = FALSE,
                    hidden_by_marketplace_block = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $listingStatement->execute([
                'user_id' => $userId,
            ]);

            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function unblockMarketplaceFunctionsByAdmin(int $userId): void
    {
        $this->connection->beginTransaction();

        try {
            $this->clearMarketplaceBlockStateForUsers([$userId], true);
            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function releaseExpiredBans(): void
    {
        $banUserIds = $this->fetchExpiredRestrictionUserIds(
            'blocked_at',
            'blocked_is_permanent',
            'blocked_until'
        );
        $communityUserIds = $this->fetchExpiredRestrictionUserIds(
            'community_blocked_at',
            'community_block_is_permanent',
            'community_blocked_until'
        );
        $marketplaceUserIds = $this->fetchExpiredRestrictionUserIds(
            'marketplace_blocked_at',
            'marketplace_block_is_permanent',
            'marketplace_blocked_until'
        );

        if ($banUserIds === [] && $communityUserIds === [] && $marketplaceUserIds === []) {
            return;
        }

        $this->connection->beginTransaction();

        try {
            if ($banUserIds !== []) {
                $this->clearBanStateForUsers($banUserIds, false);
            }
            if ($communityUserIds !== []) {
                $this->clearCommunityBlockStateForUsers($communityUserIds, false);
            }
            if ($marketplaceUserIds !== []) {
                $this->clearMarketplaceBlockStateForUsers($marketplaceUserIds, false);
            }
            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function deactivateAccount(int $userId): void
    {
        $this->connection->beginTransaction();

        try {
            $deletedToken = 'deleted_' . $userId . '_' . gmdate('YmdHis');
            $deletedEmail = $deletedToken . '@cockpit.local';

            $statement = $this->connection->prepare(
                'UPDATE community_posts
                SET is_active = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $statement->execute([
                'user_id' => $userId,
            ]);

            $statement = $this->connection->prepare(
                'UPDATE community_comments
                SET is_active = FALSE
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $statement->execute([
                'user_id' => $userId,
            ]);

            $statement = $this->connection->prepare(
                'UPDATE marketplace_listings
                SET is_active = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = :user_id
                    AND is_active = TRUE'
            );
            $statement->execute([
                'user_id' => $userId,
            ]);

            $statement = $this->connection->prepare(
                "UPDATE vehicles
                SET status = 'archived',
                    is_primary = FALSE
                WHERE user_id = :user_id
                    AND (status <> 'archived' OR is_primary = TRUE)"
            );
            $statement->execute([
                'user_id' => $userId,
            ]);

            $statement = $this->connection->prepare(
                'UPDATE users
                SET username = :username,
                    email = :email,
                    pseudonym = NULL,
                    avatar_path = NULL,
                    first_name = :first_name,
                    last_name = :last_name,
                    membership_tier = :membership_tier,
                    is_active = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :user_id'
            );
            $statement->execute([
                'user_id' => $userId,
                'username' => $deletedToken,
                'email' => $deletedEmail,
                'first_name' => 'Usunięte',
                'last_name' => 'konto',
                'membership_tier' => 'free',
            ]);

            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    private function hasApplicationSettingsColumns(): bool
    {
        if ($this->hasApplicationSettingsColumns !== null) {
            return $this->hasApplicationSettingsColumns;
        }

        $statement = $this->connection->query(
            "SELECT COUNT(*)::INTEGER
            FROM information_schema.columns
            WHERE table_name = 'user_settings'
                AND table_schema = current_schema()
                AND column_name IN (
                    'app_distance_unit',
                    'app_consumption_format'
                )"
        );

        $this->hasApplicationSettingsColumns = ((int) $statement->fetchColumn()) === 2;

        return $this->hasApplicationSettingsColumns;
    }

    private function hasMarketplaceSettingsColumns(): bool
    {
        if ($this->hasMarketplaceSettingsColumns !== null) {
            return $this->hasMarketplaceSettingsColumns;
        }

        $statement = $this->connection->query(
            "SELECT COUNT(*)::INTEGER
            FROM information_schema.columns
            WHERE table_name = 'user_settings'
                AND table_schema = current_schema()
                AND column_name IN (
                    'marketplace_default_scope',
                    'marketplace_default_sort',
                    'marketplace_preferred_contact_channel'
                )"
        );

        $this->hasMarketplaceSettingsColumns = ((int) $statement->fetchColumn()) === 3;

        return $this->hasMarketplaceSettingsColumns;
    }

    private function clearBanStateForUsers(array $userIds, bool $markRevokedAtNow): void
    {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        if ($userIds === []) {
            return;
        }

        $placeholders = [];
        $params = [];
        foreach ($userIds as $index => $userId) {
            $placeholder = ':user_id_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = $userId;
        }
        $inSql = implode(', ', $placeholders);

        $userStatement = $this->connection->prepare(
            "UPDATE users
            SET is_blocked = FALSE,
                blocked_until = NULL,
                blocked_reason = NULL,
                blocked_is_permanent = FALSE,
                blocked_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id IN ({$inSql})"
        );
        foreach ($params as $placeholder => $value) {
            $userStatement->bindValue($placeholder, $value, PDO::PARAM_INT);
        }
        $userStatement->execute();

        $postStatement = $this->connection->prepare(
            "UPDATE community_posts
            SET is_active = TRUE,
                hidden_by_user_ban = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id IN ({$inSql})
                AND hidden_by_user_ban = TRUE"
        );
        foreach ($params as $placeholder => $value) {
            $postStatement->bindValue($placeholder, $value, PDO::PARAM_INT);
        }
        $postStatement->execute();

        $commentStatement = $this->connection->prepare(
            "UPDATE community_comments
            SET is_active = TRUE,
                hidden_by_user_ban = FALSE
            WHERE user_id IN ({$inSql})
                AND hidden_by_user_ban = TRUE"
        );
        foreach ($params as $placeholder => $value) {
            $commentStatement->bindValue($placeholder, $value, PDO::PARAM_INT);
        }
        $commentStatement->execute();

        $listingStatement = $this->connection->prepare(
            "UPDATE marketplace_listings
            SET is_active = TRUE,
                hidden_by_user_ban = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id IN ({$inSql})
                AND hidden_by_user_ban = TRUE"
        );
        foreach ($params as $placeholder => $value) {
            $listingStatement->bindValue($placeholder, $value, PDO::PARAM_INT);
        }
        $listingStatement->execute();

        if ($markRevokedAtNow) {
            $historySql = "UPDATE user_ban_history
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id IN ({$inSql})
                    AND revoked_at IS NULL";
        } else {
            $historySql = "UPDATE user_ban_history
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id IN ({$inSql})
                    AND revoked_at IS NULL
                    AND is_permanent = FALSE
                    AND banned_until IS NOT NULL
                    AND banned_until <= CURRENT_TIMESTAMP";
        }

        $historyStatement = $this->connection->prepare($historySql);
        foreach ($params as $placeholder => $value) {
            $historyStatement->bindValue($placeholder, $value, PDO::PARAM_INT);
        }
        $historyStatement->execute();
    }

    private function clearCommunityBlockStateForUsers(array $userIds, bool $markRevokedAtNow): void
    {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        if ($userIds === []) {
            return;
        }

        [$inSql, $params] = $this->buildIdPlaceholders($userIds);

        $userStatement = $this->connection->prepare(
            "UPDATE users
            SET community_blocked_until = NULL,
                community_block_reason = NULL,
                community_block_is_permanent = FALSE,
                community_blocked_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id IN ({$inSql})"
        );
        $this->bindIntegerPlaceholderParams($userStatement, $params);
        $userStatement->execute();

        $postStatement = $this->connection->prepare(
            "UPDATE community_posts
            SET is_active = TRUE,
                hidden_by_community_block = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id IN ({$inSql})
                AND hidden_by_community_block = TRUE"
        );
        $this->bindIntegerPlaceholderParams($postStatement, $params);
        $postStatement->execute();

        $commentStatement = $this->connection->prepare(
            "UPDATE community_comments
            SET is_active = TRUE,
                hidden_by_community_block = FALSE
            WHERE user_id IN ({$inSql})
                AND hidden_by_community_block = TRUE"
        );
        $this->bindIntegerPlaceholderParams($commentStatement, $params);
        $commentStatement->execute();

        $historySql = $markRevokedAtNow
            ? "UPDATE user_community_block_history
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id IN ({$inSql})
                    AND revoked_at IS NULL"
            : "UPDATE user_community_block_history
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id IN ({$inSql})
                    AND revoked_at IS NULL
                    AND is_permanent = FALSE
                    AND blocked_until IS NOT NULL
                    AND blocked_until <= CURRENT_TIMESTAMP";
        $historyStatement = $this->connection->prepare($historySql);
        $this->bindIntegerPlaceholderParams($historyStatement, $params);
        $historyStatement->execute();
    }

    private function clearMarketplaceBlockStateForUsers(array $userIds, bool $markRevokedAtNow): void
    {
        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        if ($userIds === []) {
            return;
        }

        [$inSql, $params] = $this->buildIdPlaceholders($userIds);

        $userStatement = $this->connection->prepare(
            "UPDATE users
            SET marketplace_blocked_until = NULL,
                marketplace_block_reason = NULL,
                marketplace_block_is_permanent = FALSE,
                marketplace_blocked_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id IN ({$inSql})"
        );
        $this->bindIntegerPlaceholderParams($userStatement, $params);
        $userStatement->execute();

        $listingStatement = $this->connection->prepare(
            "UPDATE marketplace_listings
            SET is_active = TRUE,
                hidden_by_marketplace_block = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id IN ({$inSql})
                AND hidden_by_marketplace_block = TRUE"
        );
        $this->bindIntegerPlaceholderParams($listingStatement, $params);
        $listingStatement->execute();

        $historySql = $markRevokedAtNow
            ? "UPDATE user_marketplace_block_history
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id IN ({$inSql})
                    AND revoked_at IS NULL"
            : "UPDATE user_marketplace_block_history
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE user_id IN ({$inSql})
                    AND revoked_at IS NULL
                    AND is_permanent = FALSE
                    AND blocked_until IS NOT NULL
                    AND blocked_until <= CURRENT_TIMESTAMP";
        $historyStatement = $this->connection->prepare($historySql);
        $this->bindIntegerPlaceholderParams($historyStatement, $params);
        $historyStatement->execute();
    }

    private function fetchExpiredRestrictionUserIds(
        string $activityColumn,
        string $permanentColumn,
        string $untilColumn
    ): array {
        $statement = $this->connection->query(
            "SELECT id
            FROM users
            WHERE is_active = TRUE
                AND {$activityColumn} IS NOT NULL
                AND {$permanentColumn} = FALSE
                AND {$untilColumn} IS NOT NULL
                AND {$untilColumn} <= CURRENT_TIMESTAMP"
        );

        return array_map(
            static fn (array $row): int => (int) $row['id'],
            $statement->fetchAll(PDO::FETCH_ASSOC) ?: []
        );
    }

    private function buildIdPlaceholders(array $userIds): array
    {
        $placeholders = [];
        $params = [];
        foreach ($userIds as $index => $userId) {
            $placeholder = ':user_id_' . $index;
            $placeholders[] = $placeholder;
            $params[$placeholder] = (int) $userId;
        }

        return [implode(', ', $placeholders), $params];
    }

    private function bindIntegerPlaceholderParams(PDOStatement $statement, array $params): void
    {
        foreach ($params as $placeholder => $value) {
            $statement->bindValue($placeholder, (int) $value, PDO::PARAM_INT);
        }
    }

    private function buildAdminRestrictionNoticeMessage(
        string $intro,
        string $reason,
        ?string $blockedUntil,
        bool $isPermanent
    ): string {
        $untilLabel = $this->formatAdminRestrictionNoticeUntil($blockedUntil, $isPermanent);

        return $intro
            . '. Powód: ' . trim($reason)
            . '. Ograniczenie obowiązuje do: ' . $untilLabel . '.';
    }

    private function formatAdminRestrictionNoticeUntil(?string $blockedUntil, bool $isPermanent): string
    {
        if ($isPermanent) {
            return 'na stałe';
        }

        $rawValue = trim((string) $blockedUntil);
        if ($rawValue === '') {
            return 'na stałe';
        }

        $timestamp = strtotime($rawValue);
        if ($timestamp === false) {
            return 'na stałe';
        }

        return date('d.m.Y • H:i', $timestamp);
    }

    private function hasCommunitySettingsColumns(): bool
    {
        if ($this->hasCommunitySettingsColumns !== null) {
            return $this->hasCommunitySettingsColumns;
        }

        $statement = $this->connection->query(
            "SELECT COUNT(*)::INTEGER
            FROM information_schema.columns
            WHERE table_name = 'user_settings'
                AND table_schema = current_schema()
                AND column_name = 'community_default_scope'"
        );

        $this->hasCommunitySettingsColumns = ((int) $statement->fetchColumn()) === 1;

        return $this->hasCommunitySettingsColumns;
    }

    private function hasNotificationSettingsColumns(): bool
    {
        if ($this->hasNotificationSettingsColumns !== null) {
            return $this->hasNotificationSettingsColumns;
        }

        $statement = $this->connection->query(
            "SELECT COUNT(*)::INTEGER
            FROM information_schema.columns
            WHERE table_name = 'user_settings'
                AND table_schema = current_schema()
                AND column_name IN (
                    'notification_profile_membership',
                    'notification_post_likes',
                    'notification_post_comments'
                )"
        );

        $this->hasNotificationSettingsColumns = ((int) $statement->fetchColumn()) === 3;

        return $this->hasNotificationSettingsColumns;
    }
}
