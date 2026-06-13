<?php

use PHPUnit\Framework\TestCase;

final class ReportsRepositoryTest extends TestCase
{
    public function testCreateReportRejectsSelfReportForProfile(): void
    {
        $repository = new ReportsRepository(Database::getConnection());

        $result = $repository->createReport(
            1,
            'profile',
            1,
            'other',
            'Inny powód',
            'self report should fail'
        );

        self::assertFalse($result);
    }
}
