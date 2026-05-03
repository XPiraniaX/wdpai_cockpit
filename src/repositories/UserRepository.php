<?php

class UserRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function getById(int $userId): ?array
    {
        $statement = $this->connection->prepare(
            "SELECT
                id,
                CONCAT(first_name, ' ', last_name) AS full_name,
                membership_tier
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

            $settingsStatement = $this->connection->prepare(
                'INSERT INTO user_settings (
                    user_id,
                    email_notifications,
                    push_notifications,
                    maintenance_reminders,
                    inspection_reminders,
                    insurance_reminders,
                    privacy_profile_visibility
                ) VALUES (
                    :user_id,
                    TRUE,
                    FALSE,
                    TRUE,
                    TRUE,
                    TRUE,
                    :privacy_profile_visibility
                )'
            );
            $settingsStatement->execute([
                'user_id' => $userId,
                'privacy_profile_visibility' => 'private',
            ]);

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
}
