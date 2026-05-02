<?php

class Database
{
    private static ?PDO $connection = null;

    public static function getConnection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = getenv('DB_HOST') ?: 'db';
        $port = getenv('DB_PORT') ?: '5432';
        $database = getenv('DB_NAME') ?: 'db';
        $username = getenv('DB_USER') ?: 'docker';
        $password = getenv('DB_PASSWORD') ?: 'docker';

        $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $host, $port, $database);

        self::$connection = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        return self::$connection;
    }
}
