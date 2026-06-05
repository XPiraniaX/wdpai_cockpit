<?php

class UserRepository
{
    private ?bool $hasApplicationSettingsColumns = null;

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
                membership_tier,
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
                membership_tier,
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

            if ($this->hasApplicationSettingsColumns()) {
                $settingsStatement = $this->connection->prepare(
                    'INSERT INTO user_settings (
                        user_id,
                        email_notifications,
                        push_notifications,
                        maintenance_reminders,
                        inspection_reminders,
                        insurance_reminders,
                        privacy_profile_visibility,
                        privacy_full_name_visibility,
                        privacy_membership_visibility,
                        privacy_profile_posts_visibility,
                        privacy_profile_listings_visibility,
                        app_distance_unit,
                        app_consumption_format
                    ) VALUES (
                        :user_id,
                        TRUE,
                        FALSE,
                        TRUE,
                        TRUE,
                        TRUE,
                        :privacy_profile_visibility,
                        :privacy_full_name_visibility,
                        :privacy_membership_visibility,
                        :privacy_profile_posts_visibility,
                        :privacy_profile_listings_visibility,
                        :app_distance_unit,
                        :app_consumption_format
                    )'
                );
                $settingsStatement->execute([
                    'user_id' => $userId,
                    'privacy_profile_visibility' => 'private',
                    'privacy_full_name_visibility' => 'public',
                    'privacy_membership_visibility' => 'public',
                    'privacy_profile_posts_visibility' => 'public',
                    'privacy_profile_listings_visibility' => 'public',
                    'app_distance_unit' => 'km',
                    'app_consumption_format' => 'l_100km',
                ]);
            } else {
                $settingsStatement = $this->connection->prepare(
                    'INSERT INTO user_settings (
                        user_id,
                        email_notifications,
                        push_notifications,
                        maintenance_reminders,
                        inspection_reminders,
                        insurance_reminders,
                        privacy_profile_visibility,
                        privacy_full_name_visibility,
                        privacy_membership_visibility,
                        privacy_profile_posts_visibility,
                        privacy_profile_listings_visibility
                    ) VALUES (
                        :user_id,
                        TRUE,
                        FALSE,
                        TRUE,
                        TRUE,
                        TRUE,
                        :privacy_profile_visibility,
                        :privacy_full_name_visibility,
                        :privacy_membership_visibility,
                        :privacy_profile_posts_visibility,
                        :privacy_profile_listings_visibility
                    )'
                );
                $settingsStatement->execute([
                    'user_id' => $userId,
                    'privacy_profile_visibility' => 'private',
                    'privacy_full_name_visibility' => 'public',
                    'privacy_membership_visibility' => 'public',
                    'privacy_profile_posts_visibility' => 'public',
                    'privacy_profile_listings_visibility' => 'public',
                ]);
            }

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
}
