ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS approval_submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS approval_rejected_at TIMESTAMPTZ;

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS approval_rejection_reason TEXT;

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS approval_rejection_fields_json JSONB;

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS approval_correction_due_at TIMESTAMPTZ;

ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS approval_reviewed_at TIMESTAMPTZ;

UPDATE vehicles
SET approval_status = 'approved'
WHERE approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_vehicles_approval_status_submitted_at
    ON vehicles (approval_status, approval_submitted_at, id);

DROP VIEW IF EXISTS vw_vehicle_overview;

CREATE VIEW vw_vehicle_overview AS
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
    v.approval_status,
    v.approval_submitted_at,
    v.approval_rejected_at,
    v.approval_rejection_reason,
    v.approval_rejection_fields_json,
    v.approval_correction_due_at,
    v.approval_reviewed_at,
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
