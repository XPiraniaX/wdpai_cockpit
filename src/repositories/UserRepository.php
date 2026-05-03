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
}
