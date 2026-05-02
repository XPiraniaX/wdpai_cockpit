<?php

require_once 'AppController.php';

class DashboardController extends AppController
{
    public function index()
    {
        $repository = new DashboardRepository(Database::getConnection());
        $userId = $this->getCurrentUserId();

        $carCount = $repository->getCarCount($userId);
        $nextInspection = $repository->getNextInspection($userId);
        $nextInsurance = $repository->getNextInsurance($userId);
        $lastFuelLog = $repository->getLastFuelLog($userId);
        $garageCars = $repository->getGarageCars($userId);

        $stats = [
            'nextInspectionDate' => $this->formatDate($nextInspection['valid_until'] ?? null),
            'nextInspectionCar' => $nextInspection['display_name'] ?? 'Brak danych',
            'nextInsuranceDate' => $this->formatDate($nextInsurance['valid_until'] ?? null),
            'nextInsuranceCar' => $nextInsurance['display_name'] ?? 'Brak danych',
            'lastFuelAmount' => $this->formatMoney($lastFuelLog['total_cost'] ?? null, $lastFuelLog['currency'] ?? 'PLN'),
            'lastFuelCount' => $this->formatLiters($lastFuelLog['liters'] ?? null),
            'lastFuelMeta' => $lastFuelLog['display_name'] ?? 'Brak danych',
            'carCount' => (string) $carCount,
            'carCountMeta' => $this->formatCarCountMeta($carCount),
        ];

        $cars = array_map(function (array $car): array {
            return [
                'id' => (int) $car['id'],
                'year' => (string) $car['production_year'],
                'title' => $car['display_name'],
                'subtitle' => $car['trim_name'] ?: 'Brak wersji',
                'imagePath' => $car['image_path'] ?? null,
                'isPrimary' => (bool) $car['is_primary'],
                'primaryLabel' => (bool) $car['is_primary'] ? 'Pojazd glowny' : 'Ustaw jako glowny',
                'mileage' => $this->formatMileage($car['current_mileage_km'] ?? null),
                'inspectionDate' => $this->formatDate($car['next_inspection_date'] ?? null),
                'insuranceDate' => $this->formatDate($car['next_insurance_date'] ?? null),
                'silhouetteClass' => '',
            ];
        }, $garageCars);

        $this->render('dashboard', [
            'stats' => $stats,
            'cars' => $cars,
        ]);
    }

    public function setPrimaryVehicle(): void
    {
        if (!$this->isPost()) {
            $this->redirect('/dashboard');
        }

        $vehicleId = (int) ($_POST['vehicle_id'] ?? 0);

        if ($vehicleId <= 0) {
            $this->redirect('/dashboard');
        }

        $repository = new DashboardRepository(Database::getConnection());
        $repository->setPrimaryVehicle($this->getCurrentUserId(), $vehicleId);

        $this->redirect('/dashboard');
    }

    private function formatDate(?string $date): string
    {
        if (!$date) {
            return 'Brak danych';
        }

        return (new DateTimeImmutable($date))->format('d.m.Y');
    }

    private function formatMoney(float|int|string|null $amount, string $currency): string
    {
        if ($amount === null) {
            return 'Brak danych';
        }

        return number_format((float) $amount, 2, ',', ' ') . ' ' . $currency;
    }

    private function formatLiters(float|int|string|null $liters): string
    {
        if ($liters === null) {
            return 'Brak danych';
        }

        return number_format((float) $liters, 2, ',', ' ') . ' L';
    }

    private function formatMileage(int|string|null $mileage): string
    {
        if ($mileage === null) {
            return 'Brak przebiegu';
        }

        return number_format((int) $mileage, 0, ',', ' ') . ' km';
    }

    private function formatCarCountMeta(int $carCount): string
    {
        if ($carCount === 1) {
            return 'Aktywny pojazd';
        }

        if ($carCount >= 2 && $carCount <= 4) {
            return 'Aktywne pojazdy';
        }

        return 'Aktywnych pojazdow';
    }
}
