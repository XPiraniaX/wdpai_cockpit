<?php

class CarsRepository
{
    public function __construct(private PDO $connection)
    {
    }

    public function getPrimaryVehicle(int $userId): ?array
    {
        $statement = $this->connection->prepare($this->buildVehicleBaseQuery() . '
            AND v.user_id = :user_id
            AND v.status = :status
            ORDER BY v.is_primary DESC, v.display_order ASC, v.id ASC
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
            'status' => 'active',
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function getVehicleById(int $userId, int $vehicleId): ?array
    {
        $statement = $this->connection->prepare($this->buildVehicleBaseQuery() . '
            AND v.user_id = :user_id
            AND v.id = :vehicle_id
            AND v.status = :status
            LIMIT 1'
        );
        $statement->execute([
            'user_id' => $userId,
            'vehicle_id' => $vehicleId,
            'status' => 'active',
        ]);

        $row = $statement->fetch();

        return $row ?: null;
    }

    public function getRemainingVehicles(int $userId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                v.id,
                v.display_name,
                v.trim_name,
                v.production_year,
                v.current_mileage_km,
                v.is_primary,
                vi.image_path,
                next_inspection.valid_until AS next_inspection_date,
                next_insurance.valid_until AS next_insurance_date
            FROM vehicles v
            LEFT JOIN vehicle_images vi
                ON vi.vehicle_id = v.id
                AND vi.is_primary = TRUE
            LEFT JOIN LATERAL (
                SELECT ti.valid_until
                FROM technical_inspections ti
                WHERE ti.vehicle_id = v.id
                ORDER BY ti.id DESC
                LIMIT 1
            ) AS next_inspection ON TRUE
            LEFT JOIN LATERAL (
                SELECT ip.valid_until
                FROM insurance_policies ip
                WHERE ip.vehicle_id = v.id
                ORDER BY ip.valid_until ASC
                LIMIT 1
            ) AS next_insurance ON TRUE
            WHERE v.user_id = :user_id
                AND v.status = :status
                AND v.is_primary = FALSE
            ORDER BY v.display_order ASC, v.id ASC'
        );
        $statement->execute([
            'user_id' => $userId,
            'status' => 'active',
        ]);

        return $statement->fetchAll();
    }

    public function getServiceHistory(int $vehicleId, int $limit = 3): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                service_date,
                title,
                description,
                cost_amount
            FROM service_records
            WHERE vehicle_id = :vehicle_id
            ORDER BY service_date DESC, id DESC
            LIMIT :limit'
        );
        $statement->bindValue(':vehicle_id', $vehicleId, PDO::PARAM_INT);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }

    public function getRecentFuelLogs(int $vehicleId, int $limit = 3): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                fueled_at,
                liters,
                fuel_type,
                total_cost,
                mileage_km
            FROM fuel_logs
            WHERE vehicle_id = :vehicle_id
            ORDER BY fueled_at DESC, id DESC
            LIMIT :limit'
        );
        $statement->bindValue(':vehicle_id', $vehicleId, PDO::PARAM_INT);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }

    public function getMaintenanceTasks(int $vehicleId, int $limit = 4): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                id,
                title,
                description,
                status,
                estimated_cost_amount,
                sort_order
            FROM maintenance_tasks
            WHERE vehicle_id = :vehicle_id
                AND status = \'open\'
            ORDER BY
                sort_order ASC,
                id ASC
            LIMIT :limit'
        );
        $statement->bindValue(':vehicle_id', $vehicleId, PDO::PARAM_INT);
        $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }

    public function getFuelLogHistory(int $vehicleId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                fueled_at,
                liters,
                fuel_type,
                total_cost,
                mileage_km
            FROM fuel_logs
            WHERE vehicle_id = :vehicle_id
            ORDER BY fueled_at DESC, id DESC'
        );
        $statement->execute(['vehicle_id' => $vehicleId]);

        return $statement->fetchAll();
    }

    public function getInspectionHistory(int $vehicleId): array
    {
        $statement = $this->connection->prepare(
            'SELECT
                inspection_date,
                valid_until,
                result
            FROM technical_inspections
            WHERE vehicle_id = :vehicle_id
            ORDER BY id DESC'
        );
        $statement->execute(['vehicle_id' => $vehicleId]);

        return $statement->fetchAll();
    }

    public function updateVehicleSpecification(int $userId, int $vehicleId, array $data): void
    {
        $this->connection->beginTransaction();

        try {
            $brandId = $this->resolveBrandId($data['brand_name']);
            $modelId = $this->resolveModelId($brandId, $data['model_name']);

            $statement = $this->connection->prepare(
                'UPDATE vehicles
                SET
                    brand_id = :brand_id,
                    model_id = :model_id,
                    display_name = :display_name,
                    trim_name = :trim_name,
                    production_year = :production_year,
                    license_plate = :license_plate,
                    vin = :vin,
                    exterior_color = :exterior_color,
                    drivetrain = :drivetrain,
                    transmission = :transmission,
                    engine_capacity_cc = :engine_capacity_cc,
                    power_hp = :power_hp,
                    power_nm = :power_nm,
                    fuel_type = :fuel_type,
                    is_factory_power = :is_factory_power,
                    engine_mount = :engine_mount,
                    aspiration = :aspiration,
                    cylinder_count = :cylinder_count,
                    cylinder_layout = :cylinder_layout,
                    body_type = :body_type,
                    seat_count = :seat_count,
                    length_mm = :length_mm,
                    width_mm = :width_mm,
                    height_mm = :height_mm,
                    wheel_size_label = :wheel_size_label,
                    tire_size_label = :tire_size_label,
                    front_brake_type = :front_brake_type,
                    rear_brake_type = :rear_brake_type,
                    notes = :notes
                WHERE id = :vehicle_id
                    AND user_id = :user_id'
            );
            $statement->execute([
                'brand_id' => $brandId,
                'model_id' => $modelId,
                'display_name' => $data['display_name'],
                'trim_name' => $data['trim_name'],
                'production_year' => $data['production_year'],
                'license_plate' => $data['license_plate'],
                'vin' => $data['vin'],
                'exterior_color' => $data['exterior_color'],
                'drivetrain' => $data['drivetrain'],
                'transmission' => $data['transmission'],
                'engine_capacity_cc' => $data['engine_capacity_cc'],
                'power_hp' => $data['power_hp'],
                'power_nm' => $data['power_nm'],
                'fuel_type' => $data['fuel_type'],
                'is_factory_power' => $data['is_factory_power'],
                'engine_mount' => $data['engine_mount'],
                'aspiration' => $data['aspiration'],
                'cylinder_count' => $data['cylinder_count'],
                'cylinder_layout' => $data['cylinder_layout'],
                'body_type' => $data['body_type'],
                'seat_count' => $data['seat_count'],
                'length_mm' => $data['length_mm'],
                'width_mm' => $data['width_mm'],
                'height_mm' => $data['height_mm'],
                'wheel_size_label' => $data['wheel_size_label'],
                'tire_size_label' => $data['tire_size_label'],
                'front_brake_type' => $data['front_brake_type'],
                'rear_brake_type' => $data['rear_brake_type'],
                'notes' => $data['notes'],
                'vehicle_id' => $vehicleId,
                'user_id' => $userId,
            ]);

            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function addFuelLog(int $userId, int $vehicleId, array $data): void
    {
        $this->connection->beginTransaction();

        try {
            $insert = $this->connection->prepare(
                'INSERT INTO fuel_logs (vehicle_id, fueled_at, mileage_km, liters, total_cost, fuel_type)
                SELECT v.id, :fueled_at, :mileage_km, :liters, :total_cost, :fuel_type
                FROM vehicles v
                WHERE v.id = :vehicle_id
                    AND v.user_id = :user_id'
            );
            $insert->execute([
                'fueled_at' => $data['fueled_at'],
                'mileage_km' => $data['mileage_km'],
                'liters' => $data['liters'],
                'total_cost' => $data['total_cost'],
                'fuel_type' => $data['fuel_type'],
                'vehicle_id' => $vehicleId,
                'user_id' => $userId,
            ]);

            $updateMileage = $this->connection->prepare(
                'UPDATE vehicles
                SET current_mileage_km = :mileage_km
                WHERE id = :vehicle_id
                    AND user_id = :user_id
                    AND current_mileage_km <= :mileage_km'
            );
            $updateMileage->execute([
                'mileage_km' => $data['mileage_km'],
                'vehicle_id' => $vehicleId,
                'user_id' => $userId,
            ]);

            $this->connection->commit();
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    public function addServiceRecord(int $userId, int $vehicleId, array $data): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO service_records (vehicle_id, title, service_date, description, cost_amount)
            SELECT v.id, :title, :service_date, :description, :cost_amount
            FROM vehicles v
            WHERE v.id = :vehicle_id
                AND v.user_id = :user_id'
        );
        $statement->execute([
            'title' => $data['title'],
            'service_date' => $data['service_date'],
            'description' => $data['description'],
            'cost_amount' => $data['cost_amount'],
            'vehicle_id' => $vehicleId,
            'user_id' => $userId,
        ]);
    }

    public function deleteMaintenanceTask(int $userId, int $vehicleId, int $taskId): void
    {
        $statement = $this->connection->prepare(
            'DELETE FROM maintenance_tasks mt
            USING vehicles v
            WHERE mt.id = :task_id
                AND mt.vehicle_id = :vehicle_id
                AND v.id = mt.vehicle_id
                AND v.user_id = :user_id'
        );
        $statement->execute([
            'task_id' => $taskId,
            'vehicle_id' => $vehicleId,
            'user_id' => $userId,
        ]);
    }

    public function addMaintenanceTask(int $userId, int $vehicleId, array $data): void
    {
        $statement = $this->connection->prepare(
            'INSERT INTO maintenance_tasks (vehicle_id, title, description, status, estimated_cost_amount, sort_order)
            SELECT
                v.id,
                :title,
                :description,
                \'open\',
                :estimated_cost_amount,
                COALESCE((
                    SELECT MAX(mt.sort_order) + 1
                    FROM maintenance_tasks mt
                    WHERE mt.vehicle_id = v.id
                ), 0)
            FROM vehicles v
            WHERE v.id = :vehicle_id
                AND v.user_id = :user_id'
        );
        $statement->execute([
            'title' => $data['title'],
            'description' => $data['description'],
            'estimated_cost_amount' => $data['estimated_cost_amount'],
            'vehicle_id' => $vehicleId,
            'user_id' => $userId,
        ]);
    }

    public function upsertInspection(int $userId, int $vehicleId, array $data): void
    {
        $insert = $this->connection->prepare(
            'INSERT INTO technical_inspections (vehicle_id, inspection_date, valid_until, result)
            SELECT v.id, :inspection_date, :valid_until, :result
            FROM vehicles v
            WHERE v.id = :vehicle_id
                AND v.user_id = :user_id'
        );
        $insert->execute([
            'inspection_date' => $data['inspection_date'],
            'valid_until' => $data['valid_until'],
            'result' => $data['result'],
            'vehicle_id' => $vehicleId,
            'user_id' => $userId,
        ]);
    }

    public function upsertInsurance(int $userId, int $vehicleId, array $data): void
    {
        $statement = $this->connection->prepare(
            'SELECT ip.id
            FROM insurance_policies ip
            INNER JOIN vehicles v ON v.id = ip.vehicle_id
            WHERE ip.vehicle_id = :vehicle_id
                AND v.user_id = :user_id
            LIMIT 1'
        );
        $statement->execute([
            'vehicle_id' => $vehicleId,
            'user_id' => $userId,
        ]);

        $existingId = $statement->fetchColumn();

        if ($existingId !== false) {
            $update = $this->connection->prepare(
                'UPDATE insurance_policies
                SET insurer_name = :insurer_name,
                    policy_number = :policy_number,
                    purchased_on = :purchased_on,
                    valid_until = :valid_until
                WHERE id = :id'
            );
            $update->execute([
                'insurer_name' => $data['insurer_name'],
                'policy_number' => $data['policy_number'],
                'purchased_on' => $data['purchased_on'],
                'valid_until' => $data['valid_until'],
                'id' => (int) $existingId,
            ]);

            return;
        }

        $insert = $this->connection->prepare(
            'INSERT INTO insurance_policies (vehicle_id, insurer_name, policy_number, purchased_on, valid_until)
            SELECT v.id, :insurer_name, :policy_number, :purchased_on, :valid_until
            FROM vehicles v
            WHERE v.id = :vehicle_id
                AND v.user_id = :user_id'
        );
        $insert->execute([
            'insurer_name' => $data['insurer_name'],
            'policy_number' => $data['policy_number'],
            'purchased_on' => $data['purchased_on'],
            'valid_until' => $data['valid_until'],
            'vehicle_id' => $vehicleId,
            'user_id' => $userId,
        ]);
    }

    public function createVehicle(int $userId, array $data): int
    {
        $this->connection->beginTransaction();

        try {
            $brandId = $this->resolveBrandId($data['brand_name']);
            $modelId = $this->resolveModelId($brandId, $data['model_name']);
            $displayOrder = $this->resolveNextDisplayOrder($userId);
            $isPrimary = !$this->userHasActiveVehicles($userId);

            $vehicleStatement = $this->connection->prepare(
                'INSERT INTO vehicles (
                    user_id,
                    brand_id,
                    model_id,
                    display_name,
                    trim_name,
                    production_year,
                    vin,
                    license_plate,
                    body_type,
                    drivetrain,
                    fuel_type,
                    transmission,
                    engine_capacity_cc,
                    power_hp,
                    power_nm,
                    is_factory_power,
                    engine_mount,
                    aspiration,
                    cylinder_count,
                    cylinder_layout,
                    seat_count,
                    length_mm,
                    width_mm,
                    height_mm,
                    wheel_size_label,
                    tire_size_label,
                    front_brake_type,
                    rear_brake_type,
                    current_mileage_km,
                    exterior_color,
                    status,
                    display_order,
                    is_primary,
                    notes
                ) VALUES (
                    :user_id,
                    :brand_id,
                    :model_id,
                    :display_name,
                    :trim_name,
                    :production_year,
                    :vin,
                    :license_plate,
                    :body_type,
                    :drivetrain,
                    :fuel_type,
                    :transmission,
                    :engine_capacity_cc,
                    :power_hp,
                    :power_nm,
                    :is_factory_power,
                    :engine_mount,
                    :aspiration,
                    :cylinder_count,
                    :cylinder_layout,
                    :seat_count,
                    :length_mm,
                    :width_mm,
                    :height_mm,
                    :wheel_size_label,
                    :tire_size_label,
                    :front_brake_type,
                    :rear_brake_type,
                    0,
                    :exterior_color,
                    \'active\',
                    :display_order,
                    :is_primary,
                    NULL
                )
                RETURNING id'
            );
            $vehicleStatement->execute([
                'user_id' => $userId,
                'brand_id' => $brandId,
                'model_id' => $modelId,
                'display_name' => $data['display_name'],
                'trim_name' => $data['trim_name'],
                'production_year' => $data['production_year'],
                'vin' => $data['vin'],
                'license_plate' => $data['license_plate'],
                'body_type' => $data['body_type'],
                'drivetrain' => $data['drivetrain'],
                'fuel_type' => $data['fuel_type'],
                'transmission' => $data['transmission'],
                'engine_capacity_cc' => $data['engine_capacity_cc'],
                'power_hp' => $data['power_hp'],
                'power_nm' => $data['power_nm'],
                'is_factory_power' => $data['is_factory_power'],
                'engine_mount' => $data['engine_mount'],
                'aspiration' => $data['aspiration'],
                'cylinder_count' => $data['cylinder_count'],
                'cylinder_layout' => $data['cylinder_layout'],
                'seat_count' => $data['seat_count'],
                'length_mm' => $data['length_mm'],
                'width_mm' => $data['width_mm'],
                'height_mm' => $data['height_mm'],
                'wheel_size_label' => $data['wheel_size_label'],
                'tire_size_label' => $data['tire_size_label'],
                'front_brake_type' => $data['front_brake_type'],
                'rear_brake_type' => $data['rear_brake_type'],
                'exterior_color' => $data['exterior_color'],
                'display_order' => $displayOrder,
                'is_primary' => $isPrimary,
            ]);

            $vehicleId = (int) $vehicleStatement->fetchColumn();

            $inspectionStatement = $this->connection->prepare(
                'INSERT INTO technical_inspections (vehicle_id, inspection_date, valid_until, result)
                VALUES (:vehicle_id, :inspection_date, :valid_until, \'passed\')'
            );
            $inspectionStatement->execute([
                'vehicle_id' => $vehicleId,
                'inspection_date' => $data['inspection_date'],
                'valid_until' => $data['inspection_valid_until'],
            ]);

            $insuranceStatement = $this->connection->prepare(
                'INSERT INTO insurance_policies (vehicle_id, insurer_name, policy_number, purchased_on, valid_until)
                VALUES (:vehicle_id, :insurer_name, :policy_number, :purchased_on, :valid_until)'
            );
            $insuranceStatement->execute([
                'vehicle_id' => $vehicleId,
                'insurer_name' => $data['insurer_name'],
                'policy_number' => $data['policy_number'],
                'purchased_on' => $data['insurance_purchased_on'],
                'valid_until' => $data['insurance_valid_until'],
            ]);

            if (!empty($data['image_path'])) {
                $imageStatement = $this->connection->prepare(
                    'INSERT INTO vehicle_images (vehicle_id, image_path, is_primary)
                    VALUES (:vehicle_id, :image_path, TRUE)'
                );
                $imageStatement->execute([
                    'vehicle_id' => $vehicleId,
                    'image_path' => $data['image_path'],
                ]);
            }

            $this->connection->commit();

            return $vehicleId;
        } catch (Throwable $exception) {
            $this->connection->rollBack();
            throw $exception;
        }
    }

    private function buildVehicleBaseQuery(): string
    {
        return 'SELECT
                v.id,
                cb.name AS brand_name,
                cm.name AS model_name,
                v.display_name,
                v.trim_name,
                v.production_year,
                v.current_mileage_km,
                v.fuel_type,
                v.transmission,
                v.body_type,
                v.drivetrain,
                v.exterior_color,
                v.notes,
                v.power_hp,
                v.engine_capacity_cc,
                v.power_nm,
                v.is_factory_power,
                v.engine_mount,
                v.aspiration,
                v.cylinder_count,
                v.cylinder_layout,
                v.seat_count,
                v.length_mm,
                v.width_mm,
                v.height_mm,
                v.wheel_size_label,
                v.tire_size_label,
                v.front_brake_type,
                v.rear_brake_type,
                v.vin,
                v.license_plate,
                vi.image_path,
                next_inspection.inspection_date,
                next_inspection.valid_until AS next_inspection_date,
                next_inspection.result AS inspection_result,
                next_insurance.purchased_on,
                next_insurance.valid_until AS next_insurance_date,
                next_insurance.insurer_name AS insurer_name,
                next_insurance.policy_number AS policy_number,
                last_fuel.fueled_at AS last_fuel_at,
                last_fuel.total_cost AS last_fuel_cost,
                avg_consumption.average_consumption_l_100km
            FROM vehicles v
            INNER JOIN car_brands cb
                ON cb.id = v.brand_id
            LEFT JOIN car_models cm
                ON cm.id = v.model_id
            LEFT JOIN vehicle_images vi
                ON vi.vehicle_id = v.id
                AND vi.is_primary = TRUE
            LEFT JOIN LATERAL (
                SELECT ti.inspection_date, ti.valid_until, ti.result
                FROM technical_inspections ti
                WHERE ti.vehicle_id = v.id
                ORDER BY ti.id DESC
                LIMIT 1
            ) AS next_inspection ON TRUE
            LEFT JOIN LATERAL (
                SELECT ip.purchased_on, ip.valid_until, ip.insurer_name, ip.policy_number
                FROM insurance_policies ip
                WHERE ip.vehicle_id = v.id
                ORDER BY ip.valid_until ASC
                LIMIT 1
            ) AS next_insurance ON TRUE
            LEFT JOIN LATERAL (
                SELECT fl.fueled_at, fl.total_cost
                FROM fuel_logs fl
                WHERE fl.vehicle_id = v.id
                ORDER BY fl.fueled_at DESC
                LIMIT 1
            ) AS last_fuel ON TRUE
            LEFT JOIN LATERAL (
                SELECT ROUND(AVG(consumption_l_100km)::numeric, 1) AS average_consumption_l_100km
                FROM (
                    SELECT
                        CASE
                            WHEN previous_log.mileage_km IS NULL THEN NULL
                            WHEN current_log.mileage_km <= previous_log.mileage_km THEN NULL
                            ELSE (current_log.liters / NULLIF(current_log.mileage_km - previous_log.mileage_km, 0)) * 100
                        END AS consumption_l_100km
                    FROM fuel_logs current_log
                    LEFT JOIN LATERAL (
                        SELECT fl_prev.mileage_km
                        FROM fuel_logs fl_prev
                        WHERE fl_prev.vehicle_id = current_log.vehicle_id
                            AND fl_prev.fueled_at < current_log.fueled_at
                        ORDER BY fl_prev.fueled_at DESC
                        LIMIT 1
                    ) AS previous_log ON TRUE
                    WHERE current_log.vehicle_id = v.id
                ) AS consumption_samples
            ) AS avg_consumption ON TRUE
            WHERE 1 = 1';
    }

    private function resolveBrandId(string $brandName): int
    {
        $select = $this->connection->prepare('SELECT id FROM car_brands WHERE LOWER(name) = LOWER(:name) LIMIT 1');
        $select->execute(['name' => $brandName]);
        $existingId = $select->fetchColumn();

        if ($existingId !== false) {
            return (int) $existingId;
        }

        $insert = $this->connection->prepare('INSERT INTO car_brands (name) VALUES (:name)');
        $insert->execute(['name' => $brandName]);

        return (int) $this->connection->lastInsertId();
    }

    private function resolveModelId(int $brandId, string $modelName): int
    {
        $select = $this->connection->prepare(
            'SELECT id
            FROM car_models
            WHERE brand_id = :brand_id
                AND LOWER(name) = LOWER(:name)
            LIMIT 1'
        );
        $select->execute([
            'brand_id' => $brandId,
            'name' => $modelName,
        ]);
        $existingId = $select->fetchColumn();

        if ($existingId !== false) {
            return (int) $existingId;
        }

        $insert = $this->connection->prepare('INSERT INTO car_models (brand_id, name) VALUES (:brand_id, :name)');
        $insert->execute([
            'brand_id' => $brandId,
            'name' => $modelName,
        ]);

        return (int) $this->connection->lastInsertId();
    }

    private function resolveNextDisplayOrder(int $userId): int
    {
        $statement = $this->connection->prepare(
            'SELECT COALESCE(MAX(display_order), 0) + 1
            FROM vehicles
            WHERE user_id = :user_id'
        );
        $statement->execute(['user_id' => $userId]);

        return (int) $statement->fetchColumn();
    }

    private function userHasActiveVehicles(int $userId): bool
    {
        $statement = $this->connection->prepare(
            'SELECT 1
            FROM vehicles
            WHERE user_id = :user_id
                AND status = \'active\'
            LIMIT 1'
        );
        $statement->execute(['user_id' => $userId]);

        return (bool) $statement->fetchColumn();
    }
}
