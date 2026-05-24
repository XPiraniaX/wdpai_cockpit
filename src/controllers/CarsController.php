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
        $addVehicleForm = $this->consumeAddVehicleFormDraft();
        $brandCatalog = $repository->getBrandCatalog();

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
                'label' => 'Spalanie śr.',
                'value' => $this->formatConsumption($primaryVehicle['average_consumption_l_100km'] ?? null),
                'icon' => '/public/assets/icons/distributor.svg',
            ],
            [
                'label' => 'Nast. przegląd',
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
                'primaryLabel' => (bool) $car['is_primary'] ? 'Pojazd główny' : 'Ustaw jako główny',
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
            'brandCatalog' => $brandCatalog,
            'addVehicleForm' => $addVehicleForm,
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
        $vehicleImages = $repository->getVehicleImages($userId, $vehicleId);

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
            'vehicleImages' => array_map(
                static fn (array $image): array => [
                    'id' => (int) ($image['id'] ?? 0),
                    'path' => (string) ($image['image_path'] ?? ''),
                    'displayOrder' => (int) ($image['display_order'] ?? 0),
                    'isPrimary' => (bool) ($image['is_primary'] ?? false),
                ],
                $vehicleImages
            ),
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
                $payload = $this->buildSpecificationPayload($vehicle);
                if ($message = $this->validateVehicleSpecificationUniqueness($repository, $vehicleId, $payload)) {
                    $this->respondVehicleDetailsError($vehicleId, $message, 'modal-spec-edit');
                }
                $repository->updateVehicleSpecification($userId, $vehicleId, $payload);
                $this->respondVehicleDetailsSuccess($vehicleId, 'Specyfikacja techniczna została zaktualizowana.');
                break;
            case 'fuel_add':
                $repository->addFuelLog($userId, $vehicleId, $this->buildFuelLogPayload($vehicle));
                $this->respondVehicleDetailsSuccess($vehicleId, 'Tankowanie zostało dodane.');
                break;
            case 'service_add':
                $servicePayload = $this->buildServiceRecordPayload();
                $repository->addServiceRecord($userId, $vehicleId, $servicePayload);
                $sourceTaskId = $this->sanitizeNullableInt($_POST['source_task_id'] ?? null);
                if ($sourceTaskId !== null) {
                    $repository->deleteMaintenanceTask($userId, $vehicleId, $sourceTaskId);
                }
                $this->respondVehicleDetailsSuccess($vehicleId, 'Wpis serwisowy został dodany.');
                break;
            case 'task_add':
                $repository->addMaintenanceTask($userId, $vehicleId, $this->buildMaintenanceTaskPayload());
                $this->respondVehicleDetailsSuccess($vehicleId, 'Zadanie zostało dodane.');
                break;
            case 'task_delete':
                $taskId = $this->sanitizeNullableInt($_POST['task_id'] ?? null);
                if ($taskId !== null) {
                    $repository->deleteMaintenanceTask($userId, $vehicleId, $taskId);
                }
                $this->respondVehicleDetailsSuccess($vehicleId, 'Zadanie zostało usunięte.');
                break;
            case 'inspection_update':
                $repository->upsertInspection($userId, $vehicleId, $this->buildInspectionPayload());
                $this->respondVehicleDetailsSuccess($vehicleId, 'Przegląd techniczny został zaktualizowany.');
                break;
            case 'insurance_update':
                $repository->upsertInsurance($userId, $vehicleId, $this->buildInsurancePayload());
                $this->respondVehicleDetailsSuccess($vehicleId, 'Ubezpieczenie zostało zaktualizowane.');
                break;
            case 'vehicle_images_update':
                $this->updateVehicleImages($repository, $userId, $vehicleId, $vehicle);
                break;
            case 'vehicle_delete':
                $this->deleteVehicleWithImages($repository, $userId, $vehicleId);
                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => true,
                        'message' => 'Pojazd został usunięty.',
                        'redirect' => '/my-cars',
                    ]);
                }
                $this->setFlash('success', 'Pojazd został usunięty.');
                $this->redirect('/my-cars');
                break;
            default:
                break;
        }

        $this->redirect('/my-cars/details?id=' . $vehicleId);
    }

    private function respondVehicleDetailsSuccess(int $vehicleId, string $message): void
    {
        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => true,
                'message' => $message,
                'refresh_url' => '/my-cars/details?id=' . $vehicleId,
            ]);
        }

        $this->setFlash('success', $message);
        $this->redirect('/my-cars/details?id=' . $vehicleId);
    }

    private function respondVehicleDetailsError(int $vehicleId, string $message, ?string $modalName = null): void
    {
        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => false,
                'message' => $message,
                'open_modal' => $modalName,
            ], 422);
        }

        $this->setFlash('error', $message);
        $path = '/my-cars/details?id=' . $vehicleId;
        if ($modalName !== null && $modalName !== '') {
            $path .= '&open_modal=' . urlencode($modalName);
        }

        $this->redirect($path);
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
            return 'Pojazd główny';
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
            'Ogólne' => [
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
                ['label' => 'Doładowanie', 'value' => $vehicle['aspiration'] ?: 'Brak danych'],
                ['label' => 'Liczba cylindrów', 'value' => $vehicle['cylinder_count'] ? (string) $vehicle['cylinder_count'] : 'Brak danych'],
                ['label' => 'Układ cylindrów', 'value' => $vehicle['cylinder_layout'] ?: 'Brak danych'],
            ],
            'Napęd' => [
                ['label' => 'Rodzaj napędu', 'value' => $vehicle['drivetrain'] ? strtoupper((string) $vehicle['drivetrain']) : 'Brak danych'],
                ['label' => 'Skrzynia biegów', 'value' => $this->formatTransmission($vehicle['transmission'] ?? null)],
            ],
            'Nadwozie' => [
                ['label' => 'Rodzaj nadwozia', 'value' => $this->formatVehicleBodyType($vehicle['body_type'] ?? null)],
                ['label' => 'Liczba miejsc', 'value' => $vehicle['seat_count'] ? (string) $vehicle['seat_count'] : 'Brak danych'],
                ['label' => 'Długość', 'value' => $this->formatMillimeters($vehicle['length_mm'] ?? null)],
                ['label' => 'Szerokość', 'value' => $this->formatMillimeters($vehicle['width_mm'] ?? null)],
                ['label' => 'Wysokość', 'value' => $this->formatMillimeters($vehicle['height_mm'] ?? null)],
            ],
            'Koła' => [
                ['label' => 'Rozmiar felg', 'value' => $vehicle['wheel_size_label'] ?: 'Brak danych'],
                ['label' => 'Rozmiar opon', 'value' => $vehicle['tire_size_label'] ?: 'Brak danych'],
            ],
            'Hamulce' => [
                ['label' => 'Rodzaj hamulców przód', 'value' => $vehicle['front_brake_type'] ?: 'Brak danych'],
                ['label' => 'Rodzaj hamulców tył', 'value' => $vehicle['rear_brake_type'] ?: 'Brak danych'],
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

        if ($message = $this->validateVehicleCreateUniqueness($repository, $payload)) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => $message,
                ], 422);
            }

            $this->rememberAddVehicleFormDraft();
            $this->setFlash('error', $message);
            $this->redirect('/my-cars?open_modal=cars-add-vehicle');
        }

        $payload['image_paths'] = $this->handleVehicleImageUploads(
            $userId,
            $payload['brand_name'],
            $payload['model_name']
        );

        if (empty($payload['image_paths'])) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Dodaj co najmniej jedno zdjęcie pojazdu.',
                ], 422);
            }
            $this->rememberAddVehicleFormDraft();
            $this->setFlash('error', 'Dodaj co najmniej jedno zdjęcie pojazdu. Pozostałe dane zostały zachowane.');
            $this->redirect('/my-cars?open_modal=cars-add-vehicle');
        }

        try {
            $repository->createVehicle($userId, $payload);
        } catch (PDOException $exception) {
            if ($this->isUniqueViolation($exception)) {
                if ($this->isAjaxRequest()) {
                    $this->jsonResponse([
                        'success' => false,
                        'message' => $this->buildUniqueViolationMessage($exception),
                    ], 422);
                }

                $this->rememberAddVehicleFormDraft();
                $this->setFlash('error', $this->buildUniqueViolationMessage($exception));
                $this->redirect('/my-cars?open_modal=cars-add-vehicle');
            }

            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Nie udało się dodać pojazdu. Spróbuj ponownie.',
                ], 500);
            }

            throw $exception;
        }

        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => true,
                'message' => 'Pojazd został dodany.',
                'redirect' => '/my-cars',
            ]);
        }

        $this->redirect('/my-cars');
    }

    private function updateVehicleImages(CarsRepository $repository, int $userId, int $vehicleId, array $vehicle): void
    {
        $currentImages = $repository->getVehicleImages($userId, $vehicleId);
        $keptImageIds = array_map('intval', $_POST['existing_image_ids'] ?? []);
        $newImagePaths = $this->handleVehicleImageUploads(
            $userId,
            $vehicle['brand_name'] ?? 'vehicle',
            $vehicle['model_name'] ?? 'vehicle',
            'vehicle_images_new'
        );

        $validCurrentImageIds = array_fill_keys(
            array_map(static fn (array $image): int => (int) ($image['id'] ?? 0), $currentImages),
            true
        );
        $keptImageIds = array_values(array_filter(
            $keptImageIds,
            static fn (int $imageId): bool => $imageId > 0 && isset($validCurrentImageIds[$imageId])
        ));

        $totalImagesAfterSave = count($keptImageIds) + count($newImagePaths);
        if ($totalImagesAfterSave <= 0) {
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Pojazd musi mieć co najmniej jedno zdjęcie.',
                    'open_modal' => 'modal-images-edit',
                ], 422);
            }
            $this->setFlash('error', 'Pojazd musi mieć co najmniej jedno zdjęcie.');
            $this->redirect('/my-cars/details?id=' . $vehicleId . '&open_modal=modal-images-edit');
        }

        if ($totalImagesAfterSave > 10) {
            $this->deleteUploadedFiles($newImagePaths);
            if ($this->isAjaxRequest()) {
                $this->jsonResponse([
                    'success' => false,
                    'message' => 'Możesz zapisać maksymalnie 10 zdjęć pojazdu.',
                    'open_modal' => 'modal-images-edit',
                ], 422);
            }
            $this->setFlash('error', 'Możesz zapisać maksymalnie 10 zdjęć pojazdu.');
            $this->redirect('/my-cars/details?id=' . $vehicleId . '&open_modal=modal-images-edit');
        }

        $keptImageIdSet = array_fill_keys($keptImageIds, true);
        $deletedImagePaths = [];
        foreach ($currentImages as $currentImage) {
            $currentImageId = (int) ($currentImage['id'] ?? 0);
            if ($currentImageId > 0 && !isset($keptImageIdSet[$currentImageId]) && !empty($currentImage['image_path'])) {
                $deletedImagePaths[] = (string) $currentImage['image_path'];
            }
        }

        try {
            $repository->replaceVehicleImages($userId, $vehicleId, $keptImageIds, $newImagePaths);
        } catch (Throwable $exception) {
            $this->deleteUploadedFiles($newImagePaths);
            throw $exception;
        }

        $this->deleteUploadedFiles($deletedImagePaths);
        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => true,
                'message' => 'Zdjęcia pojazdu zostały zaktualizowane.',
                'refresh_url' => '/my-cars/details?id=' . $vehicleId,
            ]);
        }
        $this->setFlash('success', 'Zdjęcia pojazdu zostały zaktualizowane.');
        $this->redirect('/my-cars/details?id=' . $vehicleId);
    }

    private function buildVehicleCreatePayload(): array
    {
        return [
            'brand_name' => $this->sanitizeText($_POST['brand_name'] ?? null) ?? 'Brak danych',
            'model_name' => $this->sanitizeText($_POST['model_name'] ?? null) ?? 'Brak danych',
            'catalog_requires_approval' => ($_POST['brand_name_select'] ?? '') === '__custom__',
            'trim_name' => $this->sanitizeText($_POST['trim_name'] ?? null) ?? 'Brak danych',
            'display_name' => $this->sanitizeText($_POST['display_name'] ?? null) ?? 'Brak danych',
            'production_year' => $this->sanitizeSmallInt($_POST['production_year'] ?? null) ?? (int) date('Y'),
            'current_mileage_km' => $this->sanitizeNullablePositiveInt($_POST['current_mileage_km'] ?? null) ?? 0,
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

    private function handleVehicleImageUploads(int $userId, string $brandName, string $modelName, string $fieldName = 'vehicle_images'): array
    {
        if (empty($_FILES[$fieldName]) || !is_array($_FILES[$fieldName]['error'] ?? null)) {
            return [];
        }

        $userRepository = new UserRepository(Database::getConnection());
        $user = $userRepository->getById($userId);
        $username = $user['username'] ?? ('user-' . $userId);
        $uploadDirectory = getcwd() . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'vehicles';

        if (!is_dir($uploadDirectory)) {
            mkdir($uploadDirectory, 0775, true);
        }

        $files = $this->normalizeVehicleImageUploads($_FILES[$fieldName]);
        if (count($files) === 0) {
            return [];
        }

        $uploadedPaths = [];
        $slugBase = $this->slugify($username . '-' . $brandName . '-' . $modelName);
        $timestamp = date('Ymd-His');
        $requestToken = bin2hex(random_bytes(3));

        foreach (array_slice($files, 0, 10) as $index => $file) {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                continue;
            }

            $extension = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
            $safeExtension = in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true) ? $extension : 'jpg';
            $filename = $slugBase . '-' . $timestamp . '-' . $requestToken . '-' . ($index + 1) . '.' . $safeExtension;
            $targetPath = $uploadDirectory . DIRECTORY_SEPARATOR . $filename;

            if (!move_uploaded_file((string) ($file['tmp_name'] ?? ''), $targetPath)) {
                continue;
            }

            $uploadedPaths[] = '/public/uploads/vehicles/' . $filename;
        }

        return $uploadedPaths;
    }

    private function normalizeVehicleImageUploads(array $upload): array
    {
        $names = $upload['name'] ?? [];
        $tmpNames = $upload['tmp_name'] ?? [];
        $errors = $upload['error'] ?? [];

        if (!is_array($names) || !is_array($tmpNames) || !is_array($errors)) {
            return [];
        }

        $normalized = [];
        foreach ($names as $index => $name) {
            $normalized[] = [
                'name' => $name,
                'tmp_name' => $tmpNames[$index] ?? null,
                'error' => $errors[$index] ?? UPLOAD_ERR_NO_FILE,
            ];
        }

        return $normalized;
    }

    private function deleteVehicleWithImages(CarsRepository $repository, int $userId, int $vehicleId): void
    {
        $imagePaths = $repository->getVehicleImagePaths($userId, $vehicleId);

        $this->deleteUploadedFiles($imagePaths);

        $repository->deleteVehicle($userId, $vehicleId);
    }

    private function deleteUploadedFiles(array $imagePaths): void
    {
        foreach ($imagePaths as $imagePath) {
            if (!is_string($imagePath) || $imagePath === '') {
                continue;
            }

            $localPath = $this->resolvePublicPathToFilesystem($imagePath);
            if ($localPath !== null && is_file($localPath)) {
                @unlink($localPath);
            }
        }
    }

    private function resolvePublicPathToFilesystem(string $publicPath): ?string
    {
        $normalized = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($publicPath, '/\\'));
        if ($normalized === '') {
            return null;
        }

        return getcwd() . DIRECTORY_SEPARATOR . $normalized;
    }

    private function slugify(string $value): string
    {
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        $normalized = $normalized === false ? $value : $normalized;
        $normalized = strtolower($normalized);
        $normalized = preg_replace('/[^a-z0-9]+/', '-', $normalized) ?? '';

        return trim($normalized, '-') ?: 'vehicle';
    }

    private function rememberAddVehicleFormDraft(): void
    {
        $fields = [
            'brand_name',
            'model_name',
            'trim_name',
            'display_name',
            'production_year',
            'current_mileage_km',
            'license_plate',
            'vin',
            'exterior_color',
            'inspection_valid_until',
            'insurance_valid_until',
            'policy_number',
            'insurer_name',
            'engine_capacity_cc',
            'power_hp',
            'power_nm',
            'fuel_type',
            'is_factory_power',
            'aspiration',
            'cylinder_count',
            'cylinder_layout',
            'drivetrain',
            'transmission',
            'body_type',
            'seat_count',
            'length_mm',
            'width_mm',
            'height_mm',
            'wheel_size_label',
            'tire_size_label',
            'front_brake_type',
            'rear_brake_type',
        ];

        $draft = [];
        foreach ($fields as $field) {
            $value = $_POST[$field] ?? null;
            if (is_scalar($value) || $value === null) {
                $draft[$field] = $value;
            }
        }

        $_SESSION['cars_add_vehicle_form'] = $draft;
    }

    private function consumeAddVehicleFormDraft(): array
    {
        $draft = $_SESSION['cars_add_vehicle_form'] ?? [];
        unset($_SESSION['cars_add_vehicle_form']);

        return is_array($draft) ? $draft : [];
    }

    private function validateVehicleCreateUniqueness(CarsRepository $repository, array $payload): ?string
    {
        if (!empty($payload['vin']) && $repository->vehicleVinExists((string) $payload['vin'])) {
            return 'Taki numer VIN już istnieje: ' . $payload['vin'] . '.';
        }

        if (!empty($payload['license_plate']) && $repository->vehicleLicensePlateExists((string) $payload['license_plate'])) {
            return 'Takie tablice rejestracyjne już istnieją: ' . $payload['license_plate'] . '.';
        }

        return null;
    }

    private function validateVehicleSpecificationUniqueness(CarsRepository $repository, int $vehicleId, array $payload): ?string
    {
        if (!empty($payload['vin']) && $repository->vehicleVinExists((string) $payload['vin'], $vehicleId)) {
            return 'Taki numer VIN już istnieje: ' . $payload['vin'] . '.';
        }

        if (!empty($payload['license_plate']) && $repository->vehicleLicensePlateExists((string) $payload['license_plate'], $vehicleId)) {
            return 'Takie tablice rejestracyjne już istnieją: ' . $payload['license_plate'] . '.';
        }

        return null;
    }

    private function isUniqueViolation(PDOException $exception): bool
    {
        return ($exception->getCode() === '23505')
            || (($exception->errorInfo[0] ?? null) === '23505');
    }

    private function buildUniqueViolationMessage(PDOException $exception): string
    {
        $message = $exception->getMessage();

        if (preg_match('/Key \(([^)]+)\)=\(([^)]*)\) already exists/', $message, $matches) === 1) {
            $field = trim($matches[1]);
            $value = trim($matches[2]);
            $labels = [
                'vin' => 'Taki numer VIN już istnieje',
                'license_plate' => 'Takie tablice rejestracyjne już istnieją',
                'username' => 'Taki login już istnieje',
                'email' => 'Taki adres email już istnieje',
            ];

            $baseMessage = $labels[$field] ?? 'Taka unikalna wartość już istnieje';

            return $value !== ''
                ? $baseMessage . ': ' . $value . '.'
                : $baseMessage . '.';
        }

        if (str_contains($message, 'uq_vehicles_primary_per_user')) {
            return 'Ten użytkownik ma już pojazd główny.';
        }

        if (str_contains($message, 'uq_vehicle_images_primary_per_vehicle')) {
            return 'Ten pojazd ma już ustawione zdjęcie główne.';
        }

        return 'Jedna z unikalnych wartości już istnieje. Zmień dane i spróbuj ponownie.';
    }
}
