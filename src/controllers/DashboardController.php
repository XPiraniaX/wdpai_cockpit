<?php

require_once 'AppController.php';

class DashboardController extends AppController
{
    public function index()
    {
        $this->requireAuthentication();

        $repository = new DashboardRepository(Database::getConnection());
        $userId = $this->getCurrentUserId();

        $carCount = $repository->getCarCount($userId);
        $nextInspection = $repository->getNextInspection($userId);
        $nextInsurance = $repository->getNextInsurance($userId);
        $lastFuelLog = $repository->getLastFuelLog($userId);
        $garageCars = $repository->getGarageCars($userId, 12);
        $communitySneakPeeks = $repository->getCommunitySneakPeeks($userId, 2);
        $marketplaceSneakPeek = $repository->getMarketplaceSneakPeek($userId);

        $stats = [
            'nextInspectionDate' => $this->formatDate($nextInspection['valid_until'] ?? null),
            'nextInspectionCar' => $nextInspection['display_name'] ?? 'Brak danych',
            'nextInspectionAction' => $this->buildDetailsModalPath($nextInspection['vehicle_id'] ?? null, $nextInspection['display_name'] ?? null, 'modal-inspection-edit'),
            'nextInsuranceDate' => $this->formatDate($nextInsurance['valid_until'] ?? null),
            'nextInsuranceCar' => $nextInsurance['display_name'] ?? 'Brak danych',
            'nextInsuranceAction' => $this->buildDetailsModalPath($nextInsurance['vehicle_id'] ?? null, $nextInsurance['display_name'] ?? null, 'modal-insurance-edit'),
            'lastFuelAmount' => $this->formatMoney($lastFuelLog['total_cost'] ?? null, $lastFuelLog['currency'] ?? 'PLN'),
            'lastFuelCount' => $this->formatLiters($lastFuelLog['liters'] ?? null),
            'lastFuelMeta' => $lastFuelLog['display_name'] ?? 'Brak danych',
            'lastFuelAction' => $this->buildDetailsModalPath($lastFuelLog['vehicle_id'] ?? null, $lastFuelLog['display_name'] ?? null, 'modal-fuel-add'),
            'carCount' => (string) $carCount,
            'carCountMeta' => $this->formatCarCountMeta($carCount),
        ];

        $cars = array_map(function (array $car): array {
            return [
                'id' => (int) $car['id'],
                'detailsPath' => $this->buildVehicleDetailsPath((int) $car['id'], (string) $car['display_name']) ?? '/my-cars',
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
        }, $garageCars);

        $placeholderCount = $this->calculateGaragePlaceholderCount(count($cars));

        $this->render('dashboard', [
            'stats' => $stats,
            'cars' => $cars,
            'garagePlaceholderCount' => $placeholderCount,
            'currentUserId' => $userId,
            'communitySneakPeeks' => $communitySneakPeeks,
            'marketplaceSneakPeek' => $marketplaceSneakPeek !== null ? [
                'id' => $marketplaceSneakPeek['id'],
                'title' => $marketplaceSneakPeek['title'],
                'priceLabel' => $this->formatMoney($marketplaceSneakPeek['priceAmount'], 'PLN'),
                'yearLabel' => (string) $marketplaceSneakPeek['productionYear'],
                'mileageLabel' => $this->formatMileage($marketplaceSneakPeek['mileageKm']),
                'fuelLabel' => $this->formatFuelType($marketplaceSneakPeek['fuelType']),
                'categoryLabel' => $marketplaceSneakPeek['brandName'] . ' / ' . $marketplaceSneakPeek['modelName'],
                'locationLabel' => $marketplaceSneakPeek['city'],
                'imagePath' => $marketplaceSneakPeek['imagePath'],
                'marketplacePath' => $marketplaceSneakPeek['marketplacePath'],
            ] : null,
            'fuelChooserCars' => array_map(function (array $car): array {
                return [
                    'id' => (int) $car['id'],
                    'title' => $car['display_name'],
                    'subtitle' => $car['trim_name'] ?: 'Brak wersji',
                    'fuelActionPath' => $this->buildVehicleDetailsPath((int) $car['id'], (string) $car['display_name'], 'modal-fuel-add') ?? '/my-cars',
                ];
            }, $garageCars),
            'scriptFiles' => ['dashboard.js'],
        ]);
    }

    public function setPrimaryVehicle(): void
    {
        $this->requireAuthentication();

        if (!$this->isPost()) {
            $this->redirect('/dashboard');
        }

        $vehicleId = (int) ($_POST['vehicle_id'] ?? 0);
        $redirectTo = (string) ($_POST['redirect_to'] ?? '/dashboard');

        if ($vehicleId <= 0) {
            $this->redirect('/dashboard');
        }

        $repository = new DashboardRepository(Database::getConnection());
        $repository->setPrimaryVehicle($this->getCurrentUserId(), $vehicleId);

        if ($this->isAjaxRequest()) {
            $this->jsonResponse([
                'success' => true,
                'message' => 'Pojazd główny został zmieniony.',
                'refresh_url' => $this->sanitizeRedirectPath($redirectTo),
            ]);
        }

        $this->redirect($this->sanitizeRedirectPath($redirectTo));
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

    private function formatFuelType(?string $fuelType): string
    {
        return match ($fuelType) {
            'petrol' => 'Benzyna',
            'diesel' => 'Diesel',
            'hybrid' => 'Hybryda',
            'plug_in_hybrid' => 'Plug-in hybrid',
            'electric' => 'Elektryk',
            'lpg' => 'LPG',
            'cng' => 'CNG',
            'other' => 'Inne',
            default => 'Brak danych',
        };
    }

    private function formatCarCountMeta(int $carCount): string
    {
        if ($carCount === 1) {
            return 'Aktywny pojazd';
        }

        if ($carCount >= 2 && $carCount <= 4) {
            return 'Aktywne pojazdy';
        }

        return 'Aktywnych pojazdów';
    }

    private function calculateGaragePlaceholderCount(int $carCount): int
    {
        if ($carCount === 0) {
            return 1;
        }

        return $carCount % 3 === 0 ? 0 : 1;
    }

    private function sanitizeRedirectPath(string $redirectTo): string
    {
        if ($redirectTo === '' || $redirectTo[0] !== '/') {
            return '/dashboard';
        }

        return $redirectTo;
    }

    private function buildDetailsModalPath(int|string|null $vehicleId, ?string $displayName, string $modal): ?string
    {
        return $this->buildVehicleDetailsPath($vehicleId, $displayName, $modal);
    }
}
