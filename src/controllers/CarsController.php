<?php

class CarsController extends AppController
{
    public function index()
    {
        $this->requireAuthentication();

        $repository = new CarsRepository(Database::getConnection());
        $userId = $this->getCurrentUserId();

        if ($this->isPost() && ($_POST['modal_action'] ?? '') === 'vehicle_add') {
            $this->handleVehicleCreate($repository, $userId);
        }

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
            'transmissionOptions' => [
                'manual' => 'Manualna',
                'automatic' => 'Automatyczna',
                'semi_automatic' => 'Polautomatyczna',
            ],
            'fuelTypeOptions' => [
                'petrol' => 'Benzyna',
                'diesel' => 'Diesel',
                'hybrid' => 'Hybryda',
                'plug_in_hybrid' => 'Plug-in Hybrid',
                'electric' => 'Elektryczny',
                'lpg' => 'LPG',
                'cng' => 'CNG',
                'other' => 'Inne',
            ],
            'scriptFiles' => ['my_cars.js'],
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
        $userId = $this->getCurrentUserId();
        $vehicle = $repository->getVehicleById($userId, $vehicleId);

        if ($this->isPost()) {
            if (!$vehicle) {
                $this->redirect('/my-cars');
            }

            $this->handleVehicleDetailsAction($repository, $userId, $vehicleId, $vehicle);
        }

        if (!$vehicle) {
            http_response_code(404);
            $title = 'Nie znaleziono pojazdu';

            return $this->render('404', ['title' => $title]);
        }

        $recentFuelLogs = $repository->getRecentFuelLogs($vehicleId, 3);
        $fuelHistory = $repository->getFuelLogHistory($vehicleId);
        $serviceHistory = $repository->getServiceHistory($vehicleId, 3);
        $fullServiceHistory = $repository->getServiceHistory($vehicleId, 50);
        $maintenanceTasks = $repository->getMaintenanceTasks($vehicleId, 4);
        $allMaintenanceTasks = $repository->getMaintenanceTasks($vehicleId, 50);
        $inspectionHistory = $repository->getInspectionHistory($vehicleId);

        return $this->render('vehicle_details', [
            'title' => $vehicle['display_name'],
            'vehicle' => [
                'id' => (int) $vehicle['id'],
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
                'inspectionDaysLeftRaw' => $this->calculateDaysLeft($vehicle['next_inspection_date'] ?? null),
                'insuranceDate' => $this->formatDate($vehicle['next_insurance_date'] ?? null),
                'insuranceDaysLeft' => $this->formatDaysLeft($vehicle['next_insurance_date'] ?? null),
                'insuranceDaysLeftRaw' => $this->calculateDaysLeft($vehicle['next_insurance_date'] ?? null),
                'insurerName' => $vehicle['insurer_name'] ?: 'Brak danych',
                'policyNumber' => $vehicle['policy_number'] ?: 'Brak danych',
                'power' => $this->formatPower($vehicle['power_hp'] ?? null),
                'engine' => $vehicle['engine_capacity_cc'] ? number_format(((int) $vehicle['engine_capacity_cc']) / 1000, 1, ',', '') . ' L' : 'Brak danych',
                'vin' => $vehicle['vin'] ?: 'Brak danych',
                'plate' => $vehicle['license_plate'] ?: 'Brak danych',
                'notes' => $vehicle['notes'] ?: 'Brak dodatkowych notatek.',
                'averageConsumption' => $this->formatConsumption($vehicle['average_consumption_l_100km'] ?? null),
                'drivetrain' => $vehicle['drivetrain'] ? strtoupper((string) $vehicle['drivetrain']) : 'Brak danych',
                'fuelType' => $this->formatVehicleFuelType($vehicle['fuel_type'] ?? null),
                'technicalSpec' => $this->buildTechnicalSpec($vehicle),
            ],
            'vehicleRecord' => $vehicle,
            'serviceHistory' => $this->mapServiceHistory($serviceHistory),
            'fullServiceHistory' => $this->mapServiceHistory($fullServiceHistory),
            'maintenanceTasks' => $this->mapMaintenanceTasks($maintenanceTasks),
            'allMaintenanceTasks' => $this->mapMaintenanceTasks($allMaintenanceTasks),
            'recentFuelLogs' => $this->mapRecentFuelLogs($recentFuelLogs),
            'fuelHistory' => $this->mapRecentFuelLogs($fuelHistory),
            'fuelFormOptions' => $this->buildFuelFormOptions($vehicle['fuel_type'] ?? null),
            'inspectionHistory' => $this->mapInspectionHistory($inspectionHistory),
            'scriptFiles' => ['vehicle_details.js'],
        ]);
    }

    private function handleVehicleDetailsAction(CarsRepository $repository, int $userId, int $vehicleId, array $vehicle): void
    {
        $action = $_POST['modal_action'] ?? '';

        switch ($action) {
            case 'spec_update':
                $repository->updateVehicleSpecification($userId, $vehicleId, $this->buildSpecificationPayload($vehicle));
                break;
            case 'fuel_add':
                $repository->addFuelLog($userId, $vehicleId, $this->buildFuelLogPayload($vehicle));
                break;
            case 'service_add':
                $servicePayload = $this->buildServiceRecordPayload();
                $repository->addServiceRecord($userId, $vehicleId, $servicePayload);
                $sourceTaskId = $this->sanitizeNullableInt($_POST['source_task_id'] ?? null);
                if ($sourceTaskId !== null) {
                    $repository->deleteMaintenanceTask($userId, $vehicleId, $sourceTaskId);
                }
                break;
            case 'task_add':
                $repository->addMaintenanceTask($userId, $vehicleId, $this->buildMaintenanceTaskPayload());
                break;
            case 'task_delete':
                $taskId = $this->sanitizeNullableInt($_POST['task_id'] ?? null);
                if ($taskId !== null) {
                    $repository->deleteMaintenanceTask($userId, $vehicleId, $taskId);
                }
                break;
            case 'inspection_update':
                $repository->upsertInspection($userId, $vehicleId, $this->buildInspectionPayload());
                break;
            case 'insurance_update':
                $repository->upsertInsurance($userId, $vehicleId, $this->buildInsurancePayload());
                break;
            default:
                break;
        }

        $this->redirect('/my-cars/details?id=' . $vehicleId);
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
                'cost' => $this->formatMoney($entry['cost_amount'] ?? null, 'PLN'),
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
                'cost' => $this->formatMoney($entry['total_cost'] ?? null, 'PLN'),
                'mileage' => $this->formatMileage($entry['mileage_km'] ?? null),
            ];
        }, $fuelLogs);
    }

    private function mapInspectionHistory(array $inspectionHistory): array
    {
        return array_map(function (array $entry): array {
            return [
                'inspectionDate' => $this->formatDate($entry['inspection_date'] ?? null),
                'validUntil' => $this->formatDate($entry['valid_until'] ?? null),
                'result' => $this->formatInspectionResult($entry['result'] ?? null),
            ];
        }, $inspectionHistory);
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
            $cost = $this->formatMoney($task['estimated_cost_amount'] ?? null, 'PLN');

            return [
                'id' => isset($task['id']) ? (int) $task['id'] : 0,
                'title' => $task['title'],
                'description' => $task['description'] ?: '',
                'cost' => $cost === 'Brak kwoty' ? $cost : '~' . $cost,
                'costValue' => $task['estimated_cost_amount'] ?? null,
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
        return [
            'Ogolne' => [
                ['label' => 'Marka', 'value' => $vehicle['brand_name'] ?: 'Brak danych'],
                ['label' => 'Model', 'value' => $vehicle['model_name'] ?: 'Brak danych'],
                ['label' => 'Wersja', 'value' => $vehicle['trim_name'] ?: 'Brak danych'],
                ['label' => 'Rocznik', 'value' => (string) $vehicle['production_year']],
                ['label' => 'Tablice', 'value' => $vehicle['license_plate'] ?: 'Brak danych'],
                ['label' => 'VIN', 'value' => $vehicle['vin'] ?: 'Brak danych'],
                ['label' => 'Kolor', 'value' => $vehicle['exterior_color'] ?: 'Brak danych'],
            ],
            'Silnik' => [
                ['label' => 'Silnik', 'value' => $vehicle['engine_capacity_cc'] ? number_format(((int) $vehicle['engine_capacity_cc']) / 1000, 1, ',', '') . ' L' : 'Brak danych'],
                ['label' => 'Moc kW / KM / Nm', 'value' => $this->formatPowerWithTorque($vehicle['power_hp'] ?? null, $vehicle['power_nm'] ?? null)],
                ['label' => 'Rodzaj paliwa', 'value' => $this->formatVehicleFuelType($vehicle['fuel_type'] ?? null)],
                ['label' => 'Moc fabryczna', 'value' => $this->formatBooleanLabel($vehicle['is_factory_power'] ?? null)],
                ['label' => 'Doladowanie', 'value' => $vehicle['aspiration'] ?: 'Brak danych'],
                ['label' => 'Liczba cylindrow', 'value' => $vehicle['cylinder_count'] ? (string) $vehicle['cylinder_count'] : 'Brak danych'],
                ['label' => 'Uklad cylindrow', 'value' => $vehicle['cylinder_layout'] ?: 'Brak danych'],
            ],
            'Naped' => [
                ['label' => 'Rodzaj napedu', 'value' => $vehicle['drivetrain'] ? strtoupper((string) $vehicle['drivetrain']) : 'Brak danych'],
                ['label' => 'Skrzynia biegow', 'value' => $this->formatTransmission($vehicle['transmission'] ?? null)],
            ],
            'Nadwozie' => [
                ['label' => 'Rodzaj nadwozia', 'value' => $this->formatVehicleBodyType($vehicle['body_type'] ?? null)],
                ['label' => 'Liczba miejsc', 'value' => $vehicle['seat_count'] ? (string) $vehicle['seat_count'] : 'Brak danych'],
                ['label' => 'Dlugosc', 'value' => $this->formatMillimeters($vehicle['length_mm'] ?? null)],
                ['label' => 'Szerokosc', 'value' => $this->formatMillimeters($vehicle['width_mm'] ?? null)],
                ['label' => 'Wysokosc', 'value' => $this->formatMillimeters($vehicle['height_mm'] ?? null)],
            ],
            'Kola' => [
                ['label' => 'Rozmiar felg', 'value' => $vehicle['wheel_size_label'] ?: 'Brak danych'],
                ['label' => 'Rozmiar opon', 'value' => $vehicle['tire_size_label'] ?: 'Brak danych'],
            ],
            'Hamulce' => [
                ['label' => 'Rodzaj hamulcow przod', 'value' => $vehicle['front_brake_type'] ?: 'Brak danych'],
                ['label' => 'Rodzaj hamulcow tyl', 'value' => $vehicle['rear_brake_type'] ?: 'Brak danych'],
            ],
        ];
    }

    private function formatTransmission(?string $transmission): string
    {
        return match ($transmission) {
            'manual' => 'Manualna',
            'automatic' => 'Automatyczna',
            'semi_automatic' => 'Polautomatyczna',
            default => 'Brak danych',
        };
    }

    private function formatPowerWithTorque(int|string|null $horsePower, int|string|null $torque): string
    {
        if ($horsePower === null || $horsePower === '') {
            return 'Brak danych';
        }

        $hp = (int) $horsePower;
        $kw = (int) round($hp * 0.7355);
        $torqueLabel = ($torque === null || $torque === '') ? 'Brak danych' : ((int) $torque . ' Nm');

        return $kw . ' kW / ' . $hp . ' KM / ' . $torqueLabel;
    }

    private function formatBooleanLabel(bool|int|string|null $value): string
    {
        if ($value === null || $value === '') {
            return 'Brak danych';
        }

        return (bool) $value ? 'Tak' : 'Nie';
    }

    private function formatMillimeters(int|string|null $value): string
    {
        if ($value === null || $value === '') {
            return 'Brak danych';
        }

        return (int) $value . ' mm';
    }

    private function formatVehicleBodyType(?string $bodyType): string
    {
        if (!$bodyType) {
            return 'Brak danych';
        }

        return ucfirst((string) $bodyType);
    }

    private function buildSpecificationPayload(array $vehicle): array
    {
        return [
            'brand_name' => $this->sanitizeText($_POST['brand_name'] ?? $vehicle['brand_name']) ?? ($vehicle['brand_name'] ?: 'Brak danych'),
            'model_name' => $this->sanitizeText($_POST['model_name'] ?? $vehicle['model_name']) ?? ($vehicle['model_name'] ?: 'Brak danych'),
            'display_name' => $this->sanitizeText($_POST['display_name'] ?? $vehicle['display_name']) ?? $vehicle['display_name'],
            'trim_name' => $this->sanitizeNullableText($_POST['trim_name'] ?? $vehicle['trim_name']),
            'production_year' => $this->sanitizeSmallInt($_POST['production_year'] ?? $vehicle['production_year']) ?? (int) $vehicle['production_year'],
            'license_plate' => $this->sanitizeNullableText($_POST['license_plate'] ?? $vehicle['license_plate']),
            'vin' => $this->sanitizeNullableText($_POST['vin'] ?? $vehicle['vin']),
            'exterior_color' => $this->sanitizeNullableText($_POST['exterior_color'] ?? $vehicle['exterior_color']),
            'drivetrain' => $this->sanitizeNullableText($_POST['drivetrain'] ?? $vehicle['drivetrain']),
            'transmission' => $this->sanitizeNullableEnum($_POST['transmission'] ?? $vehicle['transmission'], ['manual', 'automatic', 'semi_automatic']),
            'engine_capacity_cc' => $this->sanitizeNullablePositiveInt($_POST['engine_capacity_cc'] ?? $vehicle['engine_capacity_cc']),
            'power_hp' => $this->sanitizeNullablePositiveInt($_POST['power_hp'] ?? $vehicle['power_hp']),
            'power_nm' => $this->sanitizeNullablePositiveInt($_POST['power_nm'] ?? $vehicle['power_nm']),
            'fuel_type' => $this->sanitizeOptionalFuelType($_POST['fuel_type'] ?? $vehicle['fuel_type']),
            'is_factory_power' => $this->sanitizeNullableBool($_POST['is_factory_power'] ?? $vehicle['is_factory_power']),
            'engine_mount' => $this->sanitizeNullableDisplayText($_POST['engine_mount'] ?? $vehicle['engine_mount']),
            'aspiration' => $this->sanitizeNullableDisplayText($_POST['aspiration'] ?? $vehicle['aspiration']),
            'cylinder_count' => $this->sanitizeNullablePositiveInt($_POST['cylinder_count'] ?? $vehicle['cylinder_count']),
            'cylinder_layout' => $this->sanitizeNullableDisplayText($_POST['cylinder_layout'] ?? $vehicle['cylinder_layout']),
            'body_type' => $this->sanitizeNullableDisplayText($_POST['body_type'] ?? $vehicle['body_type']),
            'seat_count' => $this->sanitizeNullablePositiveInt($_POST['seat_count'] ?? $vehicle['seat_count']),
            'length_mm' => $this->sanitizeNullablePositiveInt($_POST['length_mm'] ?? $vehicle['length_mm']),
            'width_mm' => $this->sanitizeNullablePositiveInt($_POST['width_mm'] ?? $vehicle['width_mm']),
            'height_mm' => $this->sanitizeNullablePositiveInt($_POST['height_mm'] ?? $vehicle['height_mm']),
            'wheel_size_label' => $this->sanitizeNullableDisplayText($_POST['wheel_size_label'] ?? $vehicle['wheel_size_label']),
            'tire_size_label' => $this->sanitizeNullableDisplayText($_POST['tire_size_label'] ?? $vehicle['tire_size_label']),
            'front_brake_type' => $this->sanitizeNullableDisplayText($_POST['front_brake_type'] ?? $vehicle['front_brake_type']),
            'rear_brake_type' => $this->sanitizeNullableDisplayText($_POST['rear_brake_type'] ?? $vehicle['rear_brake_type']),
            'notes' => $this->sanitizeNullableText($_POST['notes'] ?? $vehicle['notes']),
        ];
    }

    private function buildFuelLogPayload(array $vehicle): array
    {
        $allowedFuelTypes = $this->getAllowedFuelLogTypes($vehicle['fuel_type'] ?? null);
        $selectedFuelType = $this->sanitizeRequiredEnum($_POST['fuel_type'] ?? null, $allowedFuelTypes);
        $currentMileage = max(0, (int) ($vehicle['current_mileage_km'] ?? 0));
        $enteredMileage = $this->sanitizeNullableInt($_POST['mileage_km'] ?? null);

        return [
            'fueled_at' => $this->sanitizeDateTime($_POST['fueled_at'] ?? null) ?? date('Y-m-d H:i:s'),
            'mileage_km' => $enteredMileage === null ? $currentMileage : max($currentMileage, $enteredMileage),
            'liters' => $this->sanitizeNullableDecimal($_POST['liters'] ?? null) ?? 0,
            'total_cost' => $this->sanitizeNullableDecimal($_POST['total_cost'] ?? null) ?? 0,
            'fuel_type' => $selectedFuelType ?? ($allowedFuelTypes[0] ?? 'other'),
        ];
    }

    private function buildServiceRecordPayload(): array
    {
        return [
            'service_date' => $this->sanitizeDate($_POST['service_date'] ?? null) ?? date('Y-m-d'),
            'title' => $this->sanitizeText($_POST['title'] ?? null) ?? 'Nowy wpis',
            'description' => $this->sanitizeNullableText($_POST['description'] ?? null),
            'cost_amount' => $this->sanitizeNullableDecimal($_POST['cost_amount'] ?? null),
        ];
    }

    private function buildMaintenanceTaskPayload(): array
    {
        return [
            'title' => $this->sanitizeText($_POST['title'] ?? null) ?? 'Nowe zadanie',
            'description' => $this->sanitizeNullableText($_POST['description'] ?? null),
            'estimated_cost_amount' => $this->sanitizeNullableDecimal($_POST['estimated_cost_amount'] ?? null),
        ];
    }

    private function buildInspectionPayload(): array
    {
        return [
            'inspection_date' => $this->sanitizeDate($_POST['inspection_date'] ?? null) ?? date('Y-m-d'),
            'valid_until' => $this->sanitizeDate($_POST['valid_until'] ?? null) ?? date('Y-m-d'),
            'result' => $this->sanitizeRequiredEnum($_POST['result'] ?? null, ['passed', 'failed', 'conditional']) ?? 'passed',
        ];
    }

    private function buildInsurancePayload(): array
    {
        return [
            'insurer_name' => $this->sanitizeText($_POST['insurer_name'] ?? null) ?? 'Brak danych',
            'policy_number' => $this->sanitizeNullableText($_POST['policy_number'] ?? null),
            'purchased_on' => $this->sanitizeDate($_POST['purchased_on'] ?? null) ?? date('Y-m-d'),
            'valid_until' => $this->sanitizeDate($_POST['valid_until'] ?? null) ?? date('Y-m-d'),
        ];
    }

    private function sanitizeText(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    private function sanitizeNullableText(mixed $value): ?string
    {
        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    private function sanitizeNullableDisplayText(mixed $value): ?string
    {
        $text = trim((string) $value);

        if ($text === '' || mb_strtolower($text) === 'brak danych') {
            return null;
        }

        return $text;
    }

    private function sanitizeNullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return filter_var($value, FILTER_VALIDATE_INT) === false ? null : (int) $value;
    }

    private function sanitizeNullablePositiveInt(mixed $value): ?int
    {
        $number = $this->sanitizeNullableInt($value);

        if ($number === null || $number <= 0) {
            return null;
        }

        return $number;
    }

    private function sanitizeSmallInt(mixed $value): ?int
    {
        return $this->sanitizeNullableInt($value);
    }

    private function sanitizeNullableDecimal(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $normalized = str_replace(',', '.', (string) $value);

        return is_numeric($normalized) ? (float) $normalized : null;
    }

    private function sanitizeDate(mixed $value): ?string
    {
        $text = trim((string) $value);

        if ($text === '') {
            return null;
        }

        $date = DateTimeImmutable::createFromFormat('Y-m-d', $text);

        return $date ? $date->format('Y-m-d') : null;
    }

    private function sanitizeDateTime(mixed $value): ?string
    {
        $text = trim((string) $value);

        if ($text === '') {
            return null;
        }

        $date = DateTimeImmutable::createFromFormat('Y-m-d\TH:i', $text);

        if ($date) {
            return $date->format('Y-m-d H:i:s');
        }

        $date = DateTimeImmutable::createFromFormat('Y-m-d', $text);

        return $date ? $date->format('Y-m-d 12:00:00') : null;
    }

    private function sanitizeNullableBool(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        return match ((string) $value) {
            '1' => true,
            '0' => false,
            default => null,
        };
    }

    private function sanitizeRequiredEnum(mixed $value, array $allowedValues): ?string
    {
        $text = trim((string) $value);

        return in_array($text, $allowedValues, true) ? $text : null;
    }

    private function sanitizeNullableEnum(mixed $value, array $allowedValues): ?string
    {
        $text = trim((string) $value);

        if ($text === '') {
            return null;
        }

        return in_array($text, $allowedValues, true) ? $text : null;
    }

    private function sanitizeOptionalFuelType(mixed $value): string
    {
        $fuelType = $this->sanitizeNullableEnum($value, ['petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'cng', 'other']);

        return $fuelType ?? 'other';
    }

    private function getAllowedFuelLogTypes(?string $vehicleFuelType): array
    {
        return match ($vehicleFuelType) {
            'petrol' => ['petrol', 'premium_petrol'],
            'diesel' => ['diesel', 'premium_diesel'],
            'electric' => ['electric'],
            'hybrid', 'plug_in_hybrid', 'lpg', 'cng', 'other' => ['petrol', 'premium_petrol', 'lpg', 'cng', 'diesel', 'premium_diesel', 'electric'],
            default => ['petrol', 'premium_petrol', 'lpg', 'cng', 'diesel', 'premium_diesel', 'electric'],
        };
    }

    private function buildFuelFormOptions(?string $vehicleFuelType): array
    {
        $labels = [
            'petrol' => 'PB95',
            'premium_petrol' => 'PB98 / PB100 / Benzyna premium',
            'diesel' => 'Diesel',
            'premium_diesel' => 'Diesel Premium',
            'lpg' => 'LPG',
            'cng' => 'CNG',
            'electric' => 'EV',
        ];

        return array_map(function (string $value) use ($labels): array {
            return [
                'value' => $value,
                'label' => $labels[$value] ?? $value,
            ];
        }, $this->getAllowedFuelLogTypes($vehicleFuelType));
    }

    private function formatInspectionResult(?string $result): string
    {
        return match ($result) {
            'passed' => 'Pozytywny',
            'failed' => 'Negatywny',
            'conditional' => 'Warunkowy',
            default => 'Brak danych',
        };
    }

    private function calculateDaysLeft(?string $date): ?int
    {
        if (!$date) {
            return null;
        }

        $today = new DateTimeImmutable('today');
        $target = new DateTimeImmutable($date);

        return (int) $today->diff($target)->format('%r%a');
    }

    private function handleVehicleCreate(CarsRepository $repository, int $userId): void
    {
        $payload = $this->buildVehicleCreatePayload();
        $payload['image_path'] = $this->handleVehicleImageUpload(
            $userId,
            $payload['brand_name'],
            $payload['model_name']
        );

        if ($payload['image_path'] === null) {
            $this->redirect('/my-cars?open_modal=cars-add-vehicle');
        }

        $repository->createVehicle($userId, $payload);
        $this->redirect('/my-cars');
    }

    private function buildVehicleCreatePayload(): array
    {
        return [
            'brand_name' => $this->sanitizeText($_POST['brand_name'] ?? null) ?? 'Brak danych',
            'model_name' => $this->sanitizeText($_POST['model_name'] ?? null) ?? 'Brak danych',
            'trim_name' => $this->sanitizeText($_POST['trim_name'] ?? null) ?? 'Brak danych',
            'display_name' => $this->sanitizeText($_POST['display_name'] ?? null) ?? 'Brak danych',
            'production_year' => $this->sanitizeSmallInt($_POST['production_year'] ?? null) ?? (int) date('Y'),
            'license_plate' => $this->sanitizeText($_POST['license_plate'] ?? null) ?? 'Brak danych',
            'vin' => $this->sanitizeText($_POST['vin'] ?? null) ?? 'Brak danych',
            'exterior_color' => $this->sanitizeText($_POST['exterior_color'] ?? null) ?? 'Brak danych',
            'fuel_type' => $this->sanitizeOptionalFuelType($_POST['fuel_type'] ?? null),
            'engine_capacity_cc' => $this->sanitizeNullablePositiveInt($_POST['engine_capacity_cc'] ?? null),
            'power_hp' => $this->sanitizeNullablePositiveInt($_POST['power_hp'] ?? null),
            'power_nm' => $this->sanitizeNullablePositiveInt($_POST['power_nm'] ?? null),
            'is_factory_power' => $this->sanitizeNullableBool($_POST['is_factory_power'] ?? null),
            'aspiration' => $this->sanitizeNullableDisplayText($_POST['aspiration'] ?? null),
            'cylinder_count' => $this->sanitizeNullablePositiveInt($_POST['cylinder_count'] ?? null),
            'cylinder_layout' => $this->sanitizeNullableDisplayText($_POST['cylinder_layout'] ?? null),
            'drivetrain' => $this->sanitizeNullableDisplayText($_POST['drivetrain'] ?? null),
            'transmission' => $this->sanitizeNullableEnum($_POST['transmission'] ?? null, ['manual', 'automatic', 'semi_automatic']),
            'body_type' => $this->sanitizeNullableDisplayText($_POST['body_type'] ?? null),
            'seat_count' => $this->sanitizeNullablePositiveInt($_POST['seat_count'] ?? null),
            'length_mm' => $this->sanitizeNullablePositiveInt($_POST['length_mm'] ?? null),
            'width_mm' => $this->sanitizeNullablePositiveInt($_POST['width_mm'] ?? null),
            'height_mm' => $this->sanitizeNullablePositiveInt($_POST['height_mm'] ?? null),
            'wheel_size_label' => $this->sanitizeNullableDisplayText($_POST['wheel_size_label'] ?? null),
            'tire_size_label' => $this->sanitizeNullableDisplayText($_POST['tire_size_label'] ?? null),
            'front_brake_type' => $this->sanitizeNullableDisplayText($_POST['front_brake_type'] ?? null),
            'rear_brake_type' => $this->sanitizeNullableDisplayText($_POST['rear_brake_type'] ?? null),
            'engine_mount' => null,
            'inspection_date' => date('Y-m-d'),
            'inspection_valid_until' => $this->sanitizeDate($_POST['inspection_valid_until'] ?? null) ?? date('Y-m-d', strtotime('+1 year')),
            'insurance_purchased_on' => date('Y-m-d'),
            'insurance_valid_until' => $this->sanitizeDate($_POST['insurance_valid_until'] ?? null) ?? date('Y-m-d', strtotime('+1 year')),
            'policy_number' => $this->sanitizeText($_POST['policy_number'] ?? null) ?? 'Brak danych',
            'insurer_name' => $this->sanitizeText($_POST['insurer_name'] ?? null) ?? 'Brak danych',
        ];
    }

    private function handleVehicleImageUpload(int $userId, string $brandName, string $modelName): ?string
    {
        if (empty($_FILES['vehicle_image']) || ($_FILES['vehicle_image']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return null;
        }

        $userRepository = new UserRepository(Database::getConnection());
        $user = $userRepository->getById($userId);
        $username = $user['username'] ?? ('user-' . $userId);
        $extension = strtolower(pathinfo((string) $_FILES['vehicle_image']['name'], PATHINFO_EXTENSION));
        $safeExtension = in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true) ? $extension : 'jpg';
        $filename = $this->slugify($username . '-' . $brandName . '-' . $modelName) . '-' . date('Ymd-His') . '.' . $safeExtension;
        $uploadDirectory = getcwd() . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'vehicles';

        if (!is_dir($uploadDirectory)) {
            mkdir($uploadDirectory, 0775, true);
        }

        $targetPath = $uploadDirectory . DIRECTORY_SEPARATOR . $filename;
        if (!move_uploaded_file((string) $_FILES['vehicle_image']['tmp_name'], $targetPath)) {
            return null;
        }

        return '/public/uploads/vehicles/' . $filename;
    }

    private function slugify(string $value): string
    {
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        $normalized = $normalized === false ? $value : $normalized;
        $normalized = strtolower($normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';

        return trim($normalized, '-') ?: 'vehicle';
    }
}
