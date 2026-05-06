<?php

class CarsController extends AppController
{
    public function index()
    {
        $this->requireAuthentication();

        $repository = new CarsRepository(Database::getConnection());
        $userId = $this->getCurrentUserId();

        $primaryVehicle = $repository->getPrimaryVehicle($userId);
        $remainingVehicles = $repository->getRemainingVehicles($userId);
        $serviceHistory = $primaryVehicle ? $repository->getServiceHistory((int) $primaryVehicle['id'], 3) : [];

        $heroVehicle = $primaryVehicle ? [
            'id' => (int) $primaryVehicle['id'],
            'title' => $primaryVehicle['display_name'],
            'subtitle' => $primaryVehicle['trim_name'] ?: 'Brak wersji',
            'year' => (string) $primaryVehicle['production_year'],
            'imagePath' => $primaryVehicle['image_path'] ?? null,
            'bodyType' => $this->formatBodyType($primaryVehicle['body_type'] ?? null),
            'detailsPath' => '/my-cars/details?id=' . (int) $primaryVehicle['id'],
        ] : null;

        $stats = [
            [
                'label' => 'Przebieg',
                'value' => $this->formatMileage($primaryVehicle['current_mileage_km'] ?? null),
                'icon' => '/public/assets/icons/mileage.svg',
            ],
            [
                'label' => 'Spalanie sr.',
                'value' => $this->formatConsumption($primaryVehicle['average_consumption_l_100km'] ?? null),
                'icon' => '/public/assets/icons/distributor.svg',
            ],
            [
                'label' => 'Nast. przeglad',
                'value' => $this->formatDate($primaryVehicle['next_inspection_date'] ?? null),
                'icon' => '/public/assets/icons/calendar.svg',
            ],
            [
                'label' => 'Ubezpieczenie',
                'value' => $this->formatDate($primaryVehicle['next_insurance_date'] ?? null),
                'icon' => '/public/assets/icons/insurance.svg',
            ],
        ];

        $cars = array_map(function (array $car): array {
            return [
                'id' => (int) $car['id'],
                'detailsPath' => '/my-cars/details?id=' . (int) $car['id'],
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
        }, $remainingVehicles);

        $placeholderCount = $this->calculateGaragePlaceholderCount(count($cars));
        $title = 'Moje samochody';

        return $this->render('my_cars', [
            'title' => $title,
            'heroVehicle' => $heroVehicle,
            'stats' => $stats,
            'serviceHistory' => $this->mapServiceHistory($serviceHistory),
            'cars' => $cars,
            'garagePlaceholderCount' => $placeholderCount,
        ]);
    }

    public function details()
    {
        $this->requireAuthentication();

        $vehicleId = (int) ($_GET['id'] ?? 0);

        if ($vehicleId <= 0) {
            $this->redirect('/my-cars');
        }

        $repository = new CarsRepository(Database::getConnection());
        $vehicle = $repository->getVehicleById($this->getCurrentUserId(), $vehicleId);
        $recentFuelLogs = $vehicle ? $repository->getRecentFuelLogs($vehicleId, 3) : [];
        $serviceHistory = $vehicle ? $repository->getServiceHistory($vehicleId, 3) : [];
        $maintenanceTasks = $vehicle ? $repository->getMaintenanceTasks($vehicleId, 3) : [];

        if (!$vehicle) {
            http_response_code(404);
            $title = 'Nie znaleziono pojazdu';

            return $this->render('404', ['title' => $title]);
        }

        return $this->render('vehicle_details', [
            'title' => $vehicle['display_name'],
            'vehicle' => [
                'title' => $vehicle['display_name'],
                'subtitle' => $vehicle['trim_name'] ?: 'Brak wersji',
                'brand' => $vehicle['brand_name'] ?: 'Brak danych',
                'model' => $vehicle['model_name'] ?: 'Brak danych',
                'year' => (string) $vehicle['production_year'],
                'imagePath' => $vehicle['image_path'] ?? null,
                'bodyType' => $this->formatBodyType($vehicle['body_type'] ?? null),
                'mileage' => $this->formatMileage($vehicle['current_mileage_km'] ?? null),
                'inspectionDate' => $this->formatDate($vehicle['next_inspection_date'] ?? null),
                'inspectionDaysLeft' => $this->formatDaysLeft($vehicle['next_inspection_date'] ?? null),
                'insuranceDate' => $this->formatDate($vehicle['next_insurance_date'] ?? null),
                'insuranceDaysLeft' => $this->formatDaysLeft($vehicle['next_insurance_date'] ?? null),
                'insurerName' => $vehicle['insurer_name'] ?: 'Brak danych',
                'policyNumber' => $vehicle['policy_number'] ?: 'Brak danych',
                'power' => $this->formatPower($vehicle['power_hp'] ?? null),
                'engine' => $vehicle['engine_capacity_cc'] ? number_format(((int) $vehicle['engine_capacity_cc']) / 1000, 1, ',', '') . ' L' : 'Brak danych',
                'plate' => $vehicle['license_plate'] ?: 'Brak danych',
                'notes' => $vehicle['notes'] ?: 'Brak dodatkowych notatek.',
                'averageConsumption' => $this->formatConsumption($vehicle['average_consumption_l_100km'] ?? null),
                'drivetrain' => $vehicle['drivetrain'] ? strtoupper((string) $vehicle['drivetrain']) : 'Brak danych',
                'fuelType' => $this->formatVehicleFuelType($vehicle['fuel_type'] ?? null),
                'addedDate' => $this->formatDateTime($vehicle['created_at'] ?? null),
                'technicalSpec' => $this->buildTechnicalSpec($vehicle),
            ],
            'serviceHistory' => $this->mapServiceHistory($serviceHistory),
            'maintenanceTasks' => $this->mapMaintenanceTasks($maintenanceTasks),
            'recentFuelLogs' => $this->mapRecentFuelLogs($recentFuelLogs),
        ]);
    }

    private function calculateGaragePlaceholderCount(int $carCount): int
    {
        if ($carCount === 0) {
            return 1;
        }

        return $carCount % 3 === 0 ? 0 : 1;
    }

    private function formatDate(?string $date): string
    {
        if (!$date) {
            return 'Brak danych';
        }

        return (new DateTimeImmutable($date))->format('d.m.Y');
    }

    private function formatMileage(int|string|null $mileage): string
    {
        if ($mileage === null) {
            return 'Brak przebiegu';
        }

        return number_format((int) $mileage, 0, ',', ' ') . ' km';
    }

    private function formatConsumption(float|int|string|null $value): string
    {
        if ($value === null || $value === '') {
            return 'Brak danych';
        }

        return number_format((float) $value, 1, ',', ' ') . ' L/100km';
    }

    private function formatBodyType(?string $bodyType): string
    {
        if (!$bodyType) {
            return 'Pojazd glowny';
        }

        return ucfirst($bodyType);
    }

    private function mapServiceHistory(array $serviceHistory): array
    {
        return array_map(function (array $entry): array {
            $date = new DateTimeImmutable($entry['service_date']);

            return [
                'monthYear' => $date->format('M Y'),
                'title' => $entry['title'],
                'description' => $entry['description'] ?: '',
                'cost' => $this->formatMoney($entry['cost_amount'] ?? null, $entry['currency'] ?? 'PLN'),
            ];
        }, $serviceHistory);
    }

    private function mapRecentFuelLogs(array $fuelLogs): array
    {
        return array_map(function (array $entry): array {
            $date = new DateTimeImmutable($entry['fueled_at']);

            return [
                'date' => $date->format('d.m.Y'),
                'liters' => number_format((float) $entry['liters'], 2, ',', ' '),
                'fuelType' => $this->formatFuelLogType($entry['fuel_type'] ?? null),
                'cost' => $this->formatMoney($entry['total_cost'] ?? null, $entry['currency'] ?? 'PLN'),
                'mileage' => $this->formatMileage($entry['mileage_km'] ?? null),
            ];
        }, $fuelLogs);
    }

    private function formatMoney(float|int|string|null $amount, string $currency): string
    {
        if ($amount === null || $amount === '') {
            return 'Brak kwoty';
        }

        return number_format((float) $amount, 2, ',', ' ') . ' ' . $currency;
    }

    private function mapMaintenanceTasks(array $tasks): array
    {
        return array_map(function (array $task): array {
            $cost = $this->formatMoney($task['estimated_cost_amount'] ?? null, $task['currency'] ?? 'PLN');

            return [
                'title' => $task['title'],
                'description' => $task['description'] ?: '',
                'cost' => $cost === 'Brak kwoty' ? $cost : '~' . $cost,
            ];
        }, $tasks);
    }

    private function formatDaysLeft(?string $date): string
    {
        if (!$date) {
            return 'Brak danych';
        }

        $today = new DateTimeImmutable('today');
        $target = new DateTimeImmutable($date);
        $days = (int) $today->diff($target)->format('%r%a');

        if ($days < 0) {
            return 'Po terminie o ' . abs($days) . ' dni';
        }

        return $days . ' dni';
    }

    private function formatDateTime(?string $date): string
    {
        if (!$date) {
            return 'Brak danych';
        }

        return (new DateTimeImmutable($date))->format('d.m.Y');
    }

    private function formatPower(int|string|null $horsePower): string
    {
        if ($horsePower === null || $horsePower === '') {
            return 'Brak danych';
        }

        $hp = (int) $horsePower;
        $kw = (int) round($hp * 0.7355);

        return $kw . ' kW / ' . $hp . ' KM / Brak danych';
    }

    private function formatVehicleFuelType(?string $fuelType): string
    {
        return match ($fuelType) {
            'petrol' => 'Benzyna',
            'diesel' => 'Diesel',
            'hybrid' => 'Hybryda',
            'plug_in_hybrid' => 'Plug-in Hybrid',
            'electric' => 'Elektryczny',
            'lpg' => 'LPG',
            'cng' => 'CNG',
            default => 'Brak danych',
        };
    }

    private function formatFuelLogType(?string $fuelType): string
    {
        return match ($fuelType) {
            'petrol' => 'PB95',
            'premium_petrol' => 'PB100',
            'diesel' => 'Diesel',
            'premium_diesel' => 'Diesel Premium',
            'lpg' => 'LPG',
            'cng' => 'CNG',
            'electric' => 'EV',
            default => 'Inne',
        };
    }

    private function buildTechnicalSpec(array $vehicle): array
    {
        $overrides = $this->getTechnicalSpecOverrides((int) $vehicle['id']);

        return [
            'Ogolne' => [
                ['label' => 'Marka', 'value' => $vehicle['brand_name'] ?: 'Brak danych'],
                ['label' => 'Model', 'value' => $vehicle['model_name'] ?: 'Brak danych'],
                ['label' => 'Wersja', 'value' => $vehicle['trim_name'] ?: 'Brak danych'],
                ['label' => 'Rocznik', 'value' => (string) $vehicle['production_year']],
                ['label' => 'Tablice', 'value' => $vehicle['license_plate'] ?: 'Brak danych'],
                ['label' => 'Data dodania', 'value' => $this->formatDateTime($vehicle['created_at'] ?? null)],
            ],
            'Silnik' => [
                ['label' => 'Silnik', 'value' => $vehicle['engine_capacity_cc'] ? number_format(((int) $vehicle['engine_capacity_cc']) / 1000, 1, ',', '') . ' L' : 'Brak danych'],
                ['label' => 'Moc kW / KM / Nm', 'value' => $overrides['power_with_torque'] ?? $this->formatPower($vehicle['power_hp'] ?? null)],
                ['label' => 'Rodzaj paliwa', 'value' => $this->formatVehicleFuelType($vehicle['fuel_type'] ?? null)],
                ['label' => 'Moc fabryczna', 'value' => $overrides['factory_power'] ?? 'Brak danych'],
                ['label' => 'Montaz silnika', 'value' => $overrides['engine_layout'] ?? 'Brak danych'],
                ['label' => 'Doladowanie', 'value' => $overrides['aspiration'] ?? 'Brak danych'],
                ['label' => 'Liczba cylindrow', 'value' => $overrides['cylinder_count'] ?? 'Brak danych'],
                ['label' => 'Uklad cylindrow', 'value' => $overrides['cylinder_layout'] ?? 'Brak danych'],
            ],
            'Nadwozie' => [
                ['label' => 'Rodzaj nadwozia', 'value' => $this->formatBodyType($vehicle['body_type'] ?? null)],
                ['label' => 'Liczba miejsc', 'value' => $overrides['seat_count'] ?? 'Brak danych'],
                ['label' => 'Dlugosc', 'value' => $overrides['length'] ?? 'Brak danych'],
                ['label' => 'Szerokosc', 'value' => $overrides['width'] ?? 'Brak danych'],
                ['label' => 'Wysokosc', 'value' => $overrides['height'] ?? 'Brak danych'],
            ],
        ];
    }

    private function getTechnicalSpecOverrides(int $vehicleId): array
    {
        return match ($vehicleId) {
            5 => [
                'power_with_torque' => '375 kW / 510 KM / 650 Nm',
                'factory_power' => 'Tak',
                'engine_layout' => 'Z przodu, wzdluznie',
                'aspiration' => 'TwinPower Turbo',
                'cylinder_count' => '6',
                'cylinder_layout' => 'Rzedowy',
                'seat_count' => '5',
                'length' => '4794 mm',
                'width' => '1903 mm',
                'height' => '1437 mm',
            ],
            6 => [
                'power_with_torque' => '463 kW / 630 KM / 850 Nm',
                'factory_power' => 'Tak',
                'engine_layout' => 'Z przodu, wzdluznie',
                'aspiration' => 'BiTurbo',
                'cylinder_count' => '8',
                'cylinder_layout' => 'V',
                'seat_count' => '5',
                'length' => '4995 mm',
                'width' => '1951 mm',
                'height' => '1487 mm',
            ],
            default => [],
        };
    }
}
