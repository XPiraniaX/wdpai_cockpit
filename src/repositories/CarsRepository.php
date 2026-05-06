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
                ORDER BY ti.valid_until ASC
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
                next_inspection.valid_until AS next_inspection_date,
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
                SELECT ti.valid_until
                FROM technical_inspections ti
                WHERE ti.vehicle_id = v.id
                ORDER BY ti.valid_until ASC
                LIMIT 1
            ) AS next_inspection ON TRUE
            LEFT JOIN LATERAL (
                SELECT ip.valid_until, ip.insurer_name, ip.policy_number
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
}
