CREATE OR REPLACE FUNCTION calculate_vehicle_average_consumption(p_vehicle_id INTEGER)
RETURNS NUMERIC(8, 1)
LANGUAGE SQL
STABLE
AS $$
    SELECT ROUND(AVG(consumption_l_100km)::numeric, 1)
    FROM (
        SELECT
            CASE
                WHEN previous_mileage_km IS NULL THEN NULL
                WHEN mileage_km <= previous_mileage_km THEN NULL
                ELSE (liters / NULLIF(mileage_km - previous_mileage_km, 0)) * 100
            END AS consumption_l_100km
        FROM (
            SELECT
                mileage_km,
                liters,
                LAG(mileage_km) OVER (ORDER BY fueled_at, id) AS previous_mileage_km
            FROM fuel_logs
            WHERE vehicle_id = p_vehicle_id
        ) AS ordered_fuel_logs
    ) AS consumption_samples;
$$;

CREATE OR REPLACE FUNCTION sync_vehicle_mileage_from_fuel_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE vehicles
    SET current_mileage_km = GREATEST(current_mileage_km, NEW.mileage_km)
    WHERE id = NEW.vehicle_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vehicle_mileage_from_fuel_logs ON fuel_logs;

CREATE TRIGGER trg_sync_vehicle_mileage_from_fuel_logs
AFTER INSERT OR UPDATE OF mileage_km
ON fuel_logs
FOR EACH ROW
EXECUTE FUNCTION sync_vehicle_mileage_from_fuel_logs();

CREATE OR REPLACE VIEW vw_vehicle_overview AS
SELECT
    v.id,
    v.user_id,
    v.brand_id,
    v.model_id,
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
    v.status,
    v.display_order,
    v.is_primary,
    primary_image.image_path,
    latest_inspection.inspection_date,
    latest_inspection.valid_until AS next_inspection_date,
    latest_inspection.result AS inspection_result,
    latest_insurance.purchased_on,
    latest_insurance.valid_until AS next_insurance_date,
    latest_insurance.insurer_name,
    latest_insurance.policy_number,
    latest_fuel.fueled_at AS last_fuel_at,
    latest_fuel.total_cost AS last_fuel_cost,
    calculate_vehicle_average_consumption(v.id) AS average_consumption_l_100km
FROM vehicles v
INNER JOIN car_brands cb
    ON cb.id = v.brand_id
LEFT JOIN car_models cm
    ON cm.id = v.model_id
LEFT JOIN LATERAL (
    SELECT vi.image_path
    FROM vehicle_images vi
    WHERE vi.vehicle_id = v.id
        AND vi.is_primary = TRUE
    ORDER BY vi.display_order ASC, vi.id ASC
    LIMIT 1
) AS primary_image ON TRUE
LEFT JOIN LATERAL (
    SELECT ti.inspection_date, ti.valid_until, ti.result
    FROM technical_inspections ti
    WHERE ti.vehicle_id = v.id
    ORDER BY ti.id DESC
    LIMIT 1
) AS latest_inspection ON TRUE
LEFT JOIN LATERAL (
    SELECT ip.purchased_on, ip.valid_until, ip.insurer_name, ip.policy_number
    FROM insurance_policies ip
    WHERE ip.vehicle_id = v.id
    ORDER BY ip.id DESC
    LIMIT 1
) AS latest_insurance ON TRUE
LEFT JOIN LATERAL (
    SELECT fl.fueled_at, fl.total_cost
    FROM fuel_logs fl
    WHERE fl.vehicle_id = v.id
    ORDER BY fl.fueled_at DESC, fl.id DESC
    LIMIT 1
) AS latest_fuel ON TRUE;
