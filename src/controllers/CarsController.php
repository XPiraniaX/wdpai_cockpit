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
        $serviceHistory = $primaryVehicle ? $repository->getServiceHistory((int) $primaryVehicle['id'], 2) : [];

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
                'year' => (string) $vehicle['production_year'],
                'imagePath' => $vehicle['image_path'] ?? null,
                'bodyType' => $this->formatBodyType($vehicle['body_type'] ?? null),
                'mileage' => $this->formatMileage($vehicle['current_mileage_km'] ?? null),
                'inspectionDate' => $this->formatDate($vehicle['next_inspection_date'] ?? null),
                'insuranceDate' => $this->formatDate($vehicle['next_insurance_date'] ?? null),
                'power' => $vehicle['power_hp'] ? ((int) $vehicle['power_hp'] . ' HP') : 'Brak danych',
                'engine' => $vehicle['engine_capacity_cc'] ? number_format(((int) $vehicle['engine_capacity_cc']) / 1000, 1, ',', '') . ' L' : 'Brak danych',
                'plate' => $vehicle['license_plate'] ?: 'Brak danych',
                'notes' => $vehicle['notes'] ?: 'Brak dodatkowych notatek.',
            ],
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

    private function formatMoney(float|int|string|null $amount, string $currency): string
    {
        if ($amount === null || $amount === '') {
            return 'Brak kwoty';
        }

        return number_format((float) $amount, 2, ',', ' ') . ' ' . $currency;
    }
}
