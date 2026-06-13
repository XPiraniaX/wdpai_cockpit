<?php

use PHPUnit\Framework\TestCase;

final class UserRepositoryTest extends TestCase
{
    public function testLogFailedAuthenticationAttemptPersistsAuditRow(): void
    {
        $repository = new UserRepository(Database::getConnection());
        $identifier = 'phpunit-audit-' . bin2hex(random_bytes(4)) . '@example.com';

        $repository->logFailedAuthenticationAttempt($identifier, '127.0.0.1', 'phpunit');

        $statement = Database::getConnection()->prepare(
            'SELECT login_identifier, ip_address, was_successful
            FROM auth_login_attempts
            WHERE login_identifier = :identifier
            ORDER BY id DESC
            LIMIT 1'
        );
        $statement->execute([
            'identifier' => $identifier,
        ]);

        $row = $statement->fetch();

        self::assertIsArray($row);
        self::assertSame($identifier, $row['login_identifier']);
        self::assertSame('127.0.0.1', $row['ip_address']);
        self::assertFalse((bool) $row['was_successful']);
    }
}
