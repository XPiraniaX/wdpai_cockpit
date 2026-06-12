CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    pseudonym VARCHAR(80),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    membership_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (membership_tier IN ('free', 'pro', 'business')),
    avatar_path TEXT,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Warsaw',
    locale VARCHAR(10) NOT NULL DEFAULT 'pl_PL',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX uq_users_pseudonym_ci
    ON users (LOWER(pseudonym))
    WHERE pseudonym IS NOT NULL;

CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    push_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    maintenance_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    inspection_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    insurance_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    privacy_profile_visibility VARCHAR(20) NOT NULL DEFAULT 'private'
        CHECK (privacy_profile_visibility IN ('private', 'friends', 'public')),
    privacy_full_name_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy_full_name_visibility IN ('public', 'private')),
    privacy_membership_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy_membership_visibility IN ('public', 'private')),
    privacy_profile_posts_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy_profile_posts_visibility IN ('public', 'private')),
    privacy_profile_listings_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy_profile_listings_visibility IN ('public', 'private')),
    app_distance_unit VARCHAR(10) NOT NULL DEFAULT 'km'
        CHECK (app_distance_unit IN ('km', 'mi')),
    app_consumption_format VARCHAR(20) NOT NULL DEFAULT 'l_100km'
        CHECK (app_consumption_format IN ('l_100km', 'km_l')),
    community_default_scope VARCHAR(20) NOT NULL DEFAULT 'all'
        CHECK (community_default_scope IN ('all', 'liked', 'saved', 'commented')),
    notification_profile_membership BOOLEAN NOT NULL DEFAULT TRUE,
    notification_post_likes BOOLEAN NOT NULL DEFAULT TRUE,
    notification_post_comments BOOLEAN NOT NULL DEFAULT TRUE,
    notification_marketplace_activity BOOLEAN NOT NULL DEFAULT TRUE,
    marketplace_default_scope VARCHAR(20) NOT NULL DEFAULT 'all'
        CHECK (marketplace_default_scope IN ('all', 'saved')),
    marketplace_default_sort VARCHAR(20) NOT NULL DEFAULT 'newest'
        CHECK (marketplace_default_sort IN ('newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc')),
    marketplace_preferred_contact_channel VARCHAR(20) NOT NULL DEFAULT 'both'
        CHECK (marketplace_preferred_contact_channel IN ('both', 'phone', 'email')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE car_brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE car_models (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES car_brands(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (brand_id, name)
);

CREATE INDEX idx_car_models_brand_id ON car_models(brand_id);

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id INTEGER NOT NULL REFERENCES car_brands(id) ON DELETE RESTRICT,
    model_id INTEGER NOT NULL REFERENCES car_models(id) ON DELETE RESTRICT,
    display_name VARCHAR(150) NOT NULL,
    trim_name VARCHAR(150),
    production_year SMALLINT NOT NULL CHECK (production_year BETWEEN 1886 AND 2100),
    vin CHAR(17) UNIQUE,
    license_plate VARCHAR(20),
    body_type VARCHAR(50),
    drivetrain VARCHAR(50),
    fuel_type VARCHAR(30) NOT NULL
        CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'cng', 'other')),
    transmission VARCHAR(30)
        CHECK (transmission IN ('manual', 'automatic', 'semi_automatic')),
    engine_capacity_cc INTEGER CHECK (engine_capacity_cc > 0),
    power_hp INTEGER CHECK (power_hp > 0),
    power_nm INTEGER CHECK (power_nm > 0),
    is_factory_power BOOLEAN,
    engine_mount VARCHAR(100),
    aspiration VARCHAR(100),
    cylinder_count SMALLINT CHECK (cylinder_count > 0),
    cylinder_layout VARCHAR(50),
    seat_count SMALLINT CHECK (seat_count > 0),
    length_mm INTEGER CHECK (length_mm > 0),
    width_mm INTEGER CHECK (width_mm > 0),
    height_mm INTEGER CHECK (height_mm > 0),
    wheel_size_label VARCHAR(50),
    tire_size_label VARCHAR(50),
    front_brake_type VARCHAR(100),
    rear_brake_type VARCHAR(100),
    current_mileage_km INTEGER NOT NULL DEFAULT 0 CHECK (current_mileage_km >= 0),
    exterior_color VARCHAR(50),
    approval_rejection_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_user_display_order ON vehicles(user_id, display_order);

CREATE UNIQUE INDEX uq_vehicles_primary_per_user
    ON vehicles(user_id)
    WHERE is_primary = TRUE AND status = 'active';

CREATE TABLE vehicle_images (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_vehicle_images_primary_per_vehicle
    ON vehicle_images(vehicle_id)
    WHERE is_primary = TRUE;

CREATE TABLE technical_inspections (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    inspection_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    result VARCHAR(20) NOT NULL DEFAULT 'passed' CHECK (result IN ('passed', 'failed', 'conditional')),
    CHECK (valid_until >= inspection_date)
);

CREATE INDEX idx_technical_inspections_vehicle_valid_until
    ON technical_inspections(vehicle_id, valid_until);

CREATE TABLE insurance_policies (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    insurer_name VARCHAR(255) NOT NULL,
    policy_number VARCHAR(100),
    purchased_on DATE NOT NULL,
    valid_until DATE NOT NULL,
    CHECK (valid_until >= purchased_on)
);

CREATE INDEX idx_insurance_policies_vehicle_valid_until
    ON insurance_policies(vehicle_id, valid_until);

CREATE UNIQUE INDEX uq_insurance_per_vehicle
    ON insurance_policies(vehicle_id);

CREATE TABLE fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    fueled_at TIMESTAMPTZ NOT NULL,
    mileage_km INTEGER NOT NULL CHECK (mileage_km >= 0),
    liters NUMERIC(8, 2) NOT NULL CHECK (liters > 0),
    total_cost NUMERIC(10, 2) NOT NULL CHECK (total_cost >= 0),
    fuel_type VARCHAR(30) NOT NULL
        CHECK (fuel_type IN ('petrol', 'diesel', 'premium_petrol', 'premium_diesel', 'lpg', 'cng', 'electric', 'other')),
    CHECK (fueled_at IS NOT NULL)
);

CREATE INDEX idx_fuel_logs_vehicle_fueled_at
    ON fuel_logs(vehicle_id, fueled_at DESC);

CREATE TABLE service_records (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    service_date DATE NOT NULL,
    description TEXT,
    cost_amount NUMERIC(10, 2)
);

CREATE INDEX idx_service_records_vehicle_service_date
    ON service_records(vehicle_id, service_date DESC);

CREATE TABLE maintenance_tasks (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'done')),
    estimated_cost_amount NUMERIC(10, 2),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_maintenance_tasks_vehicle_status
    ON maintenance_tasks(vehicle_id, status);

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

INSERT INTO users (
    username,
    email,
    password,
    first_name,
    last_name,
    membership_tier,
    avatar_path,
    timezone,
    locale,
    last_login_at
) VALUES
    (
        'alexrivera',
        'alex.rivera@example.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Alex',
        'Rivera',
        'pro',
        NULL,
        'Europe/Warsaw',
        'pl_PL',
        '2026-05-01 18:25:00+02'
    ),
    (
        'martazero',
        'marta.zero@example.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Marta',
        'Nowak',
        'free',
        NULL,
        'Europe/Warsaw',
        'pl_PL',
        '2026-05-02 09:10:00+02'
    ),
    (
        'kacperone',
        'kacper.one@example.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Kacper',
        'Wojcik',
        'pro',
        NULL,
        'Europe/Warsaw',
        'pl_PL',
        '2026-05-02 11:35:00+02'
    ),
    (
        'lenatwo',
        'lena.two@example.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Lena',
        'Krawczyk',
        'business',
        NULL,
        'Europe/Warsaw',
        'pl_PL',
        '2026-05-02 13:20:00+02'
    ),
    (
        'oskarfour',
        'oskar.four@example.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Oskar',
        'Mazur',
        'pro',
        NULL,
        'Europe/Warsaw',
        'pl_PL',
        '2026-05-02 19:40:00+02'
    ),
    (
        'ninafive',
        'nina.five@example.com',
        '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Nina',
        'Zielinska',
        'business',
        NULL,
        'Europe/Warsaw',
        'pl_PL',
        '2026-05-03 08:05:00+02'
    );

INSERT INTO users (
    username,
    email,
    password,
    first_name,
    last_name,
    role,
    membership_tier,
    avatar_path,
    timezone,
    locale,
    last_login_at
) VALUES (
    'admin',
    'admin@cockpit.local',
    '$2y$10$Oel5tNrw/aPpf7U9w4rTbeOJHF7R4IiMuHXOkz0QKn2Phe3ElA93O',
    'Panel',
    'Administratora',
    'admin',
    'free',
    NULL,
    'Europe/Warsaw',
    'pl_PL',
    NULL
);

INSERT INTO user_settings (
    user_id,
    email_notifications,
    push_notifications,
    maintenance_reminders,
    inspection_reminders,
    insurance_reminders,
    privacy_profile_visibility
) VALUES
    (1, TRUE, FALSE, TRUE, TRUE, TRUE, 'private'),
    (2, TRUE, FALSE, TRUE, TRUE, TRUE, 'private'),
    (3, TRUE, TRUE, TRUE, TRUE, TRUE, 'friends'),
    (4, TRUE, TRUE, TRUE, TRUE, TRUE, 'public'),
    (5, TRUE, FALSE, TRUE, TRUE, TRUE, 'friends'),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE, 'public');

INSERT INTO user_settings (user_id)
SELECT id
FROM users
WHERE username = 'admin';

INSERT INTO car_brands (name) VALUES
    ('Porsche'),
    ('BMW'),
    ('Audi'),
    ('Volkswagen'),
    ('Mercedes-Benz'),
    ('Opel'),
    ('Seat'),
    ('Cupra'),
    ('Skoda'),
    ('Renault'),
    ('Peugeot'),
    ('Citroen'),
    ('Toyota'),
    ('Honda'),
    ('Mazda'),
    ('Ford'),
    ('Nissan'),
    ('Hyundai'),
    ('Kia'),
    ('Alfa Romeo'),
    ('Volvo'),
    ('Mini'),
    ('Lexus'),
    ('Subaru'),
    ('Tesla');

INSERT INTO car_models (brand_id, name) VALUES
    (1, '911 992'),
    (2, 'M3 G80'),
    (3, 'RS6 C8'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), '911 997 Carrera'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), '911 991 Carrera'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), '911 992 Carrera'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), 'Cayman 987'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), 'Cayman 981'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), '718 Cayman 982'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), 'Panamera 971'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), 'Macan 95B'),
    ((SELECT id FROM car_brands WHERE name = 'Porsche'), 'Cayenne 958'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 1 E87'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 1 F20'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 2 F22'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'M2 F87'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 3 E36'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 3 E46'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 3 E90'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 3 F30'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 3 G20'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'M3 E46'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'M3 E92'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'M3 F80'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'M3 G80'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 4 F32'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'M4 F82'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'M4 G82'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 5 E39'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 5 E60'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 5 F10'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'Seria 5 G30'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'X3 E83'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'X3 F25'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'X5 E53'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'X5 E70'),
    ((SELECT id FROM car_brands WHERE name = 'BMW'), 'X5 G05'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A3 8L'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A3 8P'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A3 8V'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A3 8Y'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'S3 8P'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'S3 8V'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'RS3 8V'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A4 B5'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A4 B6'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A4 B7'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A4 B8'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A4 B9'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'RS4 B7'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'RS4 B9'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A6 C5'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A6 C6'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A6 C7'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'A6 C8'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'RS6 C6'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'RS6 C7'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'RS6 C8'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'TT 8N'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'TT 8J'),
    ((SELECT id FROM car_brands WHERE name = 'Audi'), 'TT 8S'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Golf IV'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Golf V'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Golf VI'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Golf VII'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Golf VIII'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Passat B5'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Passat B6'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Passat B7'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Passat B8'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Arteon 3H'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Scirocco III'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Polo 6N'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Polo 9N'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Polo 6R'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Polo AW'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Tiguan I'),
    ((SELECT id FROM car_brands WHERE name = 'Volkswagen'), 'Tiguan II'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa A W176'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa A W177'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'CLA C117'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'CLA C118'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa C W203'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa C W204'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa C W205'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa C W206'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa E W211'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa E W212'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa E W213'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'Klasa E W214'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'CLS C219'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'CLS C257'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'GLC X253'),
    ((SELECT id FROM car_brands WHERE name = 'Mercedes-Benz'), 'GLC X254'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Astra G'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Astra H'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Astra J'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Astra K'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Astra L'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Corsa C'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Corsa D'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Corsa E'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Corsa F'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Insignia A'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Insignia B'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Vectra B'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Vectra C'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Zafira A'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Zafira B'),
    ((SELECT id FROM car_brands WHERE name = 'Opel'), 'Zafira C'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Leon I 1M'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Leon II 1P'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Leon III 5F'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Leon IV KL'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Ibiza III 6L'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Ibiza IV 6J'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Ibiza V KJ'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Exeo 3R'),
    ((SELECT id FROM car_brands WHERE name = 'Seat'), 'Ateca 5FP'),
    ((SELECT id FROM car_brands WHERE name = 'Cupra'), 'Leon KL'),
    ((SELECT id FROM car_brands WHERE name = 'Cupra'), 'Formentor KM'),
    ((SELECT id FROM car_brands WHERE name = 'Cupra'), 'Ateca 5FP'),
    ((SELECT id FROM car_brands WHERE name = 'Cupra'), 'Born K1'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Fabia I 6Y'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Fabia II 5J'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Fabia III NJ'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Fabia IV PJ'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Octavia I 1U'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Octavia II 1Z'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Octavia III 5E'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Octavia IV NX'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Superb II 3T'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Superb III 3V'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Kodiaq I NS'),
    ((SELECT id FROM car_brands WHERE name = 'Skoda'), 'Scala NW'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Clio II'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Clio III'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Clio IV'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Clio V'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Megane II'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Megane III'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Megane IV'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Laguna II'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Laguna III'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Talisman'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Scenic III'),
    ((SELECT id FROM car_brands WHERE name = 'Renault'), 'Scenic IV'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '206'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '207'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '208 I'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '208 II'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '308 I'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '308 II'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '308 III'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '407'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '508 I'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), '508 II'),
    ((SELECT id FROM car_brands WHERE name = 'Peugeot'), 'RCZ'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'C4 I'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'C4 II'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'C4 III'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'C5 I'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'C5 II'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'C5 X'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'DS3'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'Berlingo II'),
    ((SELECT id FROM car_brands WHERE name = 'Citroen'), 'Berlingo III'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Corolla E11'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Corolla E12'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Corolla E15'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Corolla E18'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Corolla E21'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Avensis T22'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Avensis T25'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Avensis T27'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Yaris XP10'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Yaris XP90'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Yaris XP130'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Yaris XP210'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'GT86 ZN6'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'Supra A90'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'RAV4 XA30'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'RAV4 XA40'),
    ((SELECT id FROM car_brands WHERE name = 'Toyota'), 'RAV4 XA50'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Civic VI'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Civic VII'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Civic VIII'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Civic IX'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Civic X'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Civic XI'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Accord VI'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Accord VII'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'Accord VIII'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'CR-V II'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'CR-V III'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'CR-V IV'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'CR-V V'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'S2000 AP1'),
    ((SELECT id FROM car_brands WHERE name = 'Honda'), 'S2000 AP2'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'Mazda 3 BK'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'Mazda 3 BL'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'Mazda 3 BM'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'Mazda 3 BP'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'Mazda 6 GG'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'Mazda 6 GH'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'Mazda 6 GJ'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'Mazda 6 GL'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'MX-5 NA'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'MX-5 NB'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'MX-5 NC'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'MX-5 ND'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'CX-5 KE'),
    ((SELECT id FROM car_brands WHERE name = 'Mazda'), 'CX-5 KF'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Focus Mk1'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Focus Mk2'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Focus Mk3'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Focus Mk4'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Mondeo Mk3'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Mondeo Mk4'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Mondeo Mk5'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Fiesta Mk5'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Fiesta Mk6'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Fiesta Mk7'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Fiesta Mk8'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Mustang S197'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Mustang S550'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Kuga Mk1'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Kuga Mk2'),
    ((SELECT id FROM car_brands WHERE name = 'Ford'), 'Kuga Mk3'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), 'Micra K11'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), 'Micra K12'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), 'Micra K13'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), 'Micra K14'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), '350Z Z33'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), '370Z Z34'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), 'GT-R R35'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), 'Qashqai J10'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), 'Qashqai J11'),
    ((SELECT id FROM car_brands WHERE name = 'Nissan'), 'Qashqai J12'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'i20 PB'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'i20 GB'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'i20 BC3'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'i30 FD'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'i30 GD'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'i30 PD'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'Tucson LM'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'Tucson TL'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'Tucson NX4'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'Kona OS'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'Kona SX2'),
    ((SELECT id FROM car_brands WHERE name = 'Hyundai'), 'Ioniq AE'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'Ceed ED'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'Ceed JD'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'Ceed CD'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'Proceed CD'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'Sportage SL'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'Sportage QL'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'Sportage NQ5'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'Stinger CK'),
    ((SELECT id FROM car_brands WHERE name = 'Kia'), 'EV6 CV'),
    ((SELECT id FROM car_brands WHERE name = 'Alfa Romeo'), '147'),
    ((SELECT id FROM car_brands WHERE name = 'Alfa Romeo'), '156'),
    ((SELECT id FROM car_brands WHERE name = 'Alfa Romeo'), '159'),
    ((SELECT id FROM car_brands WHERE name = 'Alfa Romeo'), 'Giulietta 940'),
    ((SELECT id FROM car_brands WHERE name = 'Alfa Romeo'), 'Giulia 952'),
    ((SELECT id FROM car_brands WHERE name = 'Alfa Romeo'), 'Stelvio 949'),
    ((SELECT id FROM car_brands WHERE name = 'Alfa Romeo'), 'Brera 939'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'S60 I'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'S60 II'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'S60 III'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'V60 I'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'V60 II'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'XC60 I'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'XC60 II'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'V70 II'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'V70 III'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'XC90 I'),
    ((SELECT id FROM car_brands WHERE name = 'Volvo'), 'XC90 II'),
    ((SELECT id FROM car_brands WHERE name = 'Mini'), 'Hatch R50'),
    ((SELECT id FROM car_brands WHERE name = 'Mini'), 'Hatch R56'),
    ((SELECT id FROM car_brands WHERE name = 'Mini'), 'Hatch F56'),
    ((SELECT id FROM car_brands WHERE name = 'Mini'), 'Clubman R55'),
    ((SELECT id FROM car_brands WHERE name = 'Mini'), 'Clubman F54'),
    ((SELECT id FROM car_brands WHERE name = 'Mini'), 'Countryman R60'),
    ((SELECT id FROM car_brands WHERE name = 'Mini'), 'Countryman F60'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'IS XE10'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'IS XE20'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'IS XE30'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'GS S160'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'GS S190'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'GS L10'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'RC XC10'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'NX AZ10'),
    ((SELECT id FROM car_brands WHERE name = 'Lexus'), 'NX AZ20'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'Impreza GD'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'Impreza GH'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'Impreza GR'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'Impreza GT'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'WRX VA'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'WRX VB'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'Forester SG'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'Forester SH'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'Forester SJ'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'Forester SK'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'BRZ ZC6'),
    ((SELECT id FROM car_brands WHERE name = 'Subaru'), 'BRZ ZD8'),
    ((SELECT id FROM car_brands WHERE name = 'Tesla'), 'Model S'),
    ((SELECT id FROM car_brands WHERE name = 'Tesla'), 'Model 3'),
    ((SELECT id FROM car_brands WHERE name = 'Tesla'), 'Model X'),
    ((SELECT id FROM car_brands WHERE name = 'Tesla'), 'Model Y');

INSERT INTO vehicles (
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
    current_mileage_km,
    exterior_color,
    status,
    display_order,
    is_primary,
    notes
) VALUES
    (
        1, 1, 1, 'Porsche 911 992 Carrera S', 'Carrera S',
        2022, 'WP0ZZZ99ZNS000001', 'WA1234P', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 28420, 'Ivory White', 'active',
        1, TRUE, 'Auto glowne do codziennej jazdy i wyjazdow weekendowych.'
    ),
    (
        1, 2, 2, 'BMW M3 G80 Competition', 'Competition',
        2021, 'WBSZZZ90ZMM000002', 'WA5678P', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 46500, 'Frozen Turquoise', 'active',
        2, FALSE, 'Samochod do szybszej jazdy i okazjonalnych eventow.'
    ),
    (
        1, 3, 3, 'Audi RS6 C8 Avant', 'Avant',
        2022, 'WAUZZZF20NN000003', 'WA9012P', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 600, 31850, 'Nardo Grey', 'active',
        3, FALSE, 'Auto rodzinne z duzym bagaznikiem i mocnym silnikiem.'
    ),
    (
        3, 1, 1, 'Porsche 911 Carrera S', 'Touring Spec',
        2021, 'WP0ZZZ99ZMS000004', 'KR1001K', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 19250, 'Guards Red', 'active',
        1, TRUE, 'Jeden samochod do testu dashboardu z pojedyncza karta.'
    ),
    (
        4, 2, 2, 'BMW M3 Competition', 'G80 Competition',
        2022, 'WBSZZZ90ZNM000005', 'GD2202L', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 22880, 'Brooklyn Grey', 'active',
        1, TRUE, 'Pierwszy samochod uzytkownika z dwoma autami.'
    ),
    (
        4, 3, 3, 'Audi RS6 Avant', 'Performance Pack',
        2023, 'WAUZZZF20PN000006', 'GD2203L', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 630, 14540, 'Mythos Black', 'active',
        2, FALSE, 'Drugi samochod do sprawdzenia dwoch kart.'
    ),
    (
        5, 1, 1, 'Porsche 911 Carrera S', 'Urban Edition',
        2020, 'WP0ZZZ99ZLS000007', 'PO3301O', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 38440, 'Jet Black', 'active',
        1, TRUE, 'Auto glowne dla ukladu czterech kart.'
    ),
    (
        5, 2, 2, 'BMW M3 Competition', 'Track Package',
        2021, 'WBSZZZ90ZMM000008', 'PO3302O', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 41200, 'Isle of Man Green', 'active',
        2, FALSE, 'Drugie auto uzytkownika z czterema pojazdami.'
    ),
    (
        5, 3, 3, 'Audi RS6 Avant', 'Comfort Spec',
        2022, 'WAUZZZF20NN000009', 'PO3303O', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 600, 26710, 'Daytona Grey', 'active',
        3, FALSE, 'Trzecie auto do testu zawijania siatki.'
    ),
    (
        5, 2, 2, 'BMW M3 Competition', 'Shadow Line',
        2024, 'WBSZZZ90ZRM000010', 'PO3304O', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 8960, 'Frozen Black', 'active',
        4, FALSE, 'Czwarte auto do sprawdzenia wypelnienia rzedu.'
    ),
    (
        6, 1, 1, 'Porsche 911 Carrera S', 'Heritage Spec',
        2019, 'WP0ZZZ99ZKS000011', 'WR4401N', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 52110, 'Carmine Red', 'active',
        1, TRUE, 'Pierwszy z pieciu samochodow testowych.'
    ),
    (
        6, 2, 2, 'BMW M3 Competition', 'Carbon Pack',
        2020, 'WBSZZZ90ZLM000012', 'WR4402N', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 44760, 'Sao Paulo Yellow', 'active',
        2, FALSE, 'Drugie auto do dashboardu z piecioma kartami.'
    ),
    (
        6, 3, 3, 'Audi RS6 Avant', 'Touring Edition',
        2021, 'WAUZZZF20MN000013', 'WR4403N', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 600, 33420, 'Sebring Black', 'active',
        3, FALSE, 'Trzecie auto testowe.'
    ),
    (
        6, 1, 1, 'Porsche 911 Carrera S', 'Coastal Package',
        2023, 'WP0ZZZ99ZPS000014', 'WR4404N', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 12780, 'Racing Yellow', 'active',
        4, FALSE, 'Czwarte auto testowe.'
    ),
    (
        6, 3, 3, 'Audi RS6 Avant', 'Ultimate Pack',
        2024, 'WAUZZZF20RN000015', 'WR4405N', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 630, 6930, 'Ascari Blue', 'active',
        5, FALSE, 'Piate auto do testu wiekszej liczby kart.'
    );

INSERT INTO vehicle_images (
    vehicle_id,
    image_path,
    display_order,
    is_primary
) VALUES
    (1, '/public/uploads/vehicles/porsche-911-main.jpg', 1, TRUE),
    (2, '/public/uploads/vehicles/bmw-m3-main.jpg', 1, TRUE),
    (3, '/public/uploads/vehicles/audi-rs6-main.jpg', 1, TRUE),
    (4, '/public/uploads/vehicles/porsche-911-main.jpg', 1, TRUE),
    (5, '/public/uploads/vehicles/bmw-m3-main.jpg', 1, TRUE),
    (6, '/public/uploads/vehicles/audi-rs6-main.jpg', 1, TRUE),
    (7, '/public/uploads/vehicles/porsche-911-main.jpg', 1, TRUE),
    (8, '/public/uploads/vehicles/bmw-m3-main.jpg', 1, TRUE),
    (9, '/public/uploads/vehicles/audi-rs6-main.jpg', 1, TRUE),
    (10, '/public/uploads/vehicles/bmw-m3-main.jpg', 1, TRUE),
    (11, '/public/uploads/vehicles/porsche-911-main.jpg', 1, TRUE),
    (12, '/public/uploads/vehicles/bmw-m3-main.jpg', 1, TRUE),
    (13, '/public/uploads/vehicles/audi-rs6-main.jpg', 1, TRUE),
    (14, '/public/uploads/vehicles/porsche-911-main.jpg', 1, TRUE),
    (15, '/public/uploads/vehicles/audi-rs6-main.jpg', 1, TRUE);

INSERT INTO technical_inspections (
    vehicle_id,
    inspection_date,
    valid_until,
    result
) VALUES
    (1, '2025-11-05', '2026-11-05', 'passed'),
    (2, '2025-06-15', '2026-06-15', 'passed'),
    (3, '2025-08-12', '2026-08-12', 'passed'),
    (4, '2025-09-18', '2026-09-18', 'passed'),
    (5, '2025-07-10', '2026-07-10', 'passed'),
    (6, '2025-10-22', '2026-10-22', 'passed'),
    (7, '2025-05-28', '2026-05-28', 'passed'),
    (8, '2025-08-30', '2026-08-30', 'passed'),
    (9, '2025-09-14', '2026-09-14', 'passed'),
    (10, '2025-12-02', '2026-12-02', 'passed'),
    (11, '2025-05-19', '2026-05-19', 'passed'),
    (12, '2025-06-07', '2026-06-07', 'passed'),
    (13, '2025-08-01', '2026-08-01', 'passed'),
    (14, '2025-11-21', '2026-11-21', 'passed'),
    (15, '2025-12-12', '2026-12-12', 'passed');

INSERT INTO insurance_policies (
    vehicle_id,
    insurer_name,
    policy_number,
    purchased_on,
    valid_until
) VALUES
    (1, 'PZU', 'PZU-911-2025-01', '2025-12-15', '2026-12-15'),
    (2, 'Allianz', 'ALL-M3-2025-02', '2025-08-15', '2026-08-15'),
    (3, 'Warta', 'WAR-RS6-2025-03', '2025-09-20', '2026-09-20'),
    (4, 'PZU', 'PZU-911-2025-04', '2025-10-11', '2026-10-11'),
    (5, 'Allianz', 'ALL-M3-2025-05', '2025-06-20', '2026-06-20'),
    (6, 'Warta', 'WAR-RS6-2025-06', '2025-11-02', '2026-11-02'),
    (7, 'PZU', 'PZU-911-2025-07', '2025-07-01', '2026-07-01'),
    (8, 'Allianz', 'ALL-M3-2025-08', '2025-08-08', '2026-08-08'),
    (9, 'Warta', 'WAR-RS6-2025-09', '2025-10-03', '2026-10-03'),
    (10, 'Ergo Hestia', 'ERG-M3-2025-10', '2025-12-18', '2026-12-18'),
    (11, 'PZU', 'PZU-911-2025-11', '2025-05-26', '2026-05-26'),
    (12, 'Allianz', 'ALL-M3-2025-12', '2025-06-14', '2026-06-14'),
    (13, 'Warta', 'WAR-RS6-2025-13', '2025-08-25', '2026-08-25'),
    (14, 'PZU', 'PZU-911-2025-14', '2025-11-28', '2026-11-28'),
    (15, 'Ergo Hestia', 'ERG-RS6-2025-15', '2025-12-30', '2026-12-30');

INSERT INTO fuel_logs (
    vehicle_id,
    fueled_at,
    mileage_km,
    liters,
    total_cost,
    fuel_type
) VALUES
    (1, '2026-04-28 08:15:00+02', 28340, 49.20, 368.10, 'premium_petrol'),
    (2, '2026-04-26 17:45:00+02', 46380, 54.20, 428.20, 'premium_petrol'),
    (3, '2026-04-24 09:30:00+02', 31620, 62.70, 507.95, 'premium_petrol'),
    (4, '2026-04-27 18:20:00+02', 19190, 47.60, 352.25, 'premium_petrol'),
    (5, '2026-04-29 07:50:00+02', 22780, 51.30, 398.60, 'premium_petrol'),
    (6, '2026-04-23 16:05:00+02', 14310, 60.10, 481.40, 'premium_petrol'),
    (7, '2026-04-30 12:40:00+02', 38360, 48.90, 364.00, 'premium_petrol'),
    (8, '2026-04-25 18:15:00+02', 41020, 53.80, 423.10, 'premium_petrol'),
    (9, '2026-04-22 10:25:00+02', 26440, 61.20, 492.70, 'premium_petrol'),
    (10, '2026-05-01 08:05:00+02', 8910, 45.70, 356.80, 'premium_petrol'),
    (11, '2026-04-21 15:35:00+02', 51980, 50.40, 374.20, 'premium_petrol'),
    (12, '2026-04-20 19:10:00+02', 44520, 54.90, 431.60, 'premium_petrol'),
    (13, '2026-04-19 11:45:00+02', 33280, 63.50, 512.30, 'premium_petrol'),
    (14, '2026-05-02 09:15:00+02', 12610, 46.80, 365.90, 'premium_petrol'),
    (15, '2026-05-02 20:30:00+02', 6880, 59.10, 479.50, 'premium_petrol'),
    (5, '2026-04-14 18:35:00+02', 21920, 42.60, 298.60, 'petrol'),
    (5, '2026-03-29 09:05:00+02', 21160, 48.80, 360.15, 'premium_petrol'),
    (5, '2026-03-10 19:20:00+02', 20310, 41.90, 291.20, 'petrol'),
    (5, '2026-02-18 08:10:00+02', 19640, 50.40, 376.80, 'premium_petrol'),
    (6, '2026-04-08 17:40:00+02', 13680, 45.10, 332.40, 'petrol'),
    (6, '2026-03-15 07:55:00+02', 12980, 52.60, 401.25, 'premium_petrol'),
    (6, '2026-02-21 20:15:00+02', 12140, 43.80, 321.90, 'petrol'),
    (6, '2026-01-27 11:05:00+02', 11420, 54.30, 418.70, 'premium_petrol');

INSERT INTO service_records (
    vehicle_id,
    title,
    service_date,
    description,
    cost_amount
) VALUES
    (1, 'Przeglad okresowy', '2025-11-05', 'Kontrola okresowa i wymiana filtrow kabinowych.', 1490.00),
    (1, 'Wymiana klockow hamulcowych', '2025-07-18', 'Komplet przednich klockow i kontrola tarcz.', 1840.00),
    (1, 'Korekta lakieru i powloka', '2025-04-09', 'Jednoetapowa korekta lakieru i zabezpieczenie ceramiczne.', 2200.00),
    (2, 'Wymiana oleju i filtrow', '2026-03-12', 'Wymiana oleju, filtra oleju i filtra powietrza.', 1180.00),
    (2, 'Nowy komplet opon Pirelli P-Zero', '2025-11-26', 'Zakup i montaz nowego kompletu opon letnich.', 3850.00),
    (2, 'Przeglad przedsezonowy', '2025-03-19', 'Kontrola zawieszenia, ukladu hamulcowego i plynow eksploatacyjnych.', 760.00),
    (3, 'Nowy komplet opon', '2025-10-01', 'Montaz nowego kompletu opon letnich.', 4600.00),
    (4, 'Przeglad okresowy', '2026-02-14', 'Kontrola stanu ukladu kierowniczego i wymiana filtrow.', 1290.00),
    (4, 'Zabezpieczenie lakieru', '2025-09-09', 'Polerka i aplikacja powloki ochronnej.', 1650.00),
    (4, 'Wymiana oleju i filtrow', '2025-06-11', 'Wymiana oleju silnikowego oraz filtrow eksploatacyjnych.', 1180.00),
    (4, 'Nowe opony letnie', '2025-03-22', 'Zakup i montaz nowego kompletu opon letnich Michelin.', 3420.00),
    (4, 'Serwis ukladu hamulcowego', '2024-11-18', 'Czyszczenie zaciskow i wymiana przednich klockow hamulcowych.', 1960.00),
    (5, 'Wymiana oleju i filtrow', '2026-01-22', 'Wymiana oleju silnikowego i kompletu filtrow.', 1320.00),
    (5, 'Serwis ukladu hamulcowego', '2025-08-20', 'Czyszczenie zaciskow i wymiana przednich klockow.', 6150.00),
    (5, 'Nowy komplet opon zimowych', '2025-05-09', 'Zakup i montaz kompletu opon zimowych Pirelli Sottozero.', 3680.00),
    (5, 'Przeglad przed sezonem', '2025-02-27', 'Kontrola geometrii, plynow eksploatacyjnych i stanu zawieszenia.', 790.00),
    (5, 'Korekta lakieru i zabezpieczenie', '2024-10-15', 'Jednoetapowa korekta lakieru i aplikacja powloki ochronnej.', 1740.00),
    (6, 'Przeglad po sezonie', '2026-03-05', 'Kontrola zawieszenia i geometrii po zimie.', 980.00),
    (6, 'Wymiana oleju i filtrow', '2025-11-14', 'Wymiana oleju silnikowego i filtrow powietrza oraz kabinowego.', 1260.00),
    (6, 'Nowe opony zimowe', '2025-09-30', 'Zakup i montaz kompletu opon zimowych wraz z wywazeniem kol.', 3560.00),
    (6, 'Wymiana klockow tylnej osi', '2025-06-18', 'Wymiana tylnych klockow hamulcowych i kontrola stanu tarcz.', 1640.00),
    (6, 'Powloka ceramiczna', '2025-04-08', 'Przygotowanie lakieru i aplikacja powloki ceramicznej.', 2080.00),
    (7, 'Przeglad roczny', '2026-02-28', 'Kontrola okresowa i diagnostyka komputerowa.', 1410.00),
    (7, 'Wymiana akumulatora', '2025-10-16', 'Wymiana akumulatora AGM i adaptacja systemu.', 1190.00),
    (8, 'Nowe opony letnie', '2026-01-11', 'Zakup i montaz kompletu Michelin Pilot Sport.', 3720.00),
    (9, 'Przeglad przed wyjazdem', '2025-11-04', 'Kontrola plynow i ukladu hamulcowego przed trasa.', 840.00),
    (10, 'Korekta lakieru', '2026-03-27', 'Jednoetapowa korekta i zabezpieczenie lakieru.', 1750.00),
    (11, 'Przeglad okresowy', '2026-01-19', 'Kompleksowa kontrola mechaniczna i test drogowy.', 1360.00),
    (11, 'Wymiana opon zimowych', '2025-10-07', 'Nowy komplet opon zimowych i wywazenie.', 3480.00),
    (12, 'Wymiana oleju', '2026-02-09', 'Wymiana oleju silnikowego wraz z filtrem.', 1210.00),
    (13, 'Przeglad po trasie', '2026-03-14', 'Kontrola zawieszenia po dlugim wyjezdzie autostradowym.', 910.00),
    (14, 'Powloka ochronna', '2026-04-02', 'Aplikacja powloki ochronnej i przygotowanie lakieru.', 1890.00),
    (15, 'Pierwszy przeglad roczny', '2026-04-18', 'Kontrola po pierwszym roku eksploatacji.', 990.00);

INSERT INTO maintenance_tasks (
    vehicle_id,
    title,
    description,
    status,
    estimated_cost_amount,
    sort_order
) VALUES
    (1, 'Wymiana przednich klockow hamulcowych', 'Do sprawdzenia grubosc i ewentualna wymiana przy najblizszej wizycie.', 'open', 1400.00, 1),
    (2, 'Detailing lakieru', 'Polerka i zabezpieczenie lakieru po sezonie zimowym.', 'open', 1800.00, 2),
    (3, 'Kontrola akumulatora', 'Sprawdzic stan akumulatora przed dluzszym wyjazdem.', 'open', 300.00, 1),
    (5, 'Geometria zawieszenia', 'Kontrola i ustawienie geometrii po wymianie opon oraz twardszej eksploatacji.', 'open', 450.00, 1),
    (5, 'Korekta lakieru maski', 'Usuniecie drobnych rys i odswiezenie frontu auta przed sezonem letnim.', 'open', 900.00, 2),
    (5, 'Wymiana oleju dyferencjalu', 'Profilaktyczna wymiana oleju w dyferencjale przy najblizszym serwisie.', 'open', 780.00, 3),
    (5, 'Sprawdzenie tulei wahaczy', 'Kontrola przedniego zawieszenia i ewentualna wycena wymiany zuzytych tulei.', 'open', 980.00, 4),
    (6, 'Nowe klocki tylnej osi', 'Przygotowac wymiane tylnych klockow wraz z przegladem stanu tarcz.', 'open', 1250.00, 1),
    (6, 'Czyszczenie dolotu', 'Profilaktyczne czyszczenie ukladu dolotowego i sprawdzenie przeplywomierza.', 'open', 650.00, 2),
    (6, 'Detailing wnetrza', 'Pelne odswiezenie wnetrza i impregnacja tapicerki po zimie.', 'open', 520.00, 3),
    (6, 'Serwis klimatyzacji', 'Odgrzybianie ukladu, uzupelnienie czynnika i kontrola szczelnosci przed latem.', 'open', 430.00, 4);

UPDATE vehicles
SET
    power_nm = 650,
    is_factory_power = TRUE,
    engine_mount = 'Z przodu, wzdluznie',
    aspiration = 'TwinPower Turbo',
    cylinder_count = 6,
    cylinder_layout = 'Rzedowy',
    seat_count = 5,
    length_mm = 4794,
    width_mm = 1903,
    height_mm = 1437,
    wheel_size_label = '19\" / 10J',
    tire_size_label = '275 / 35 R19',
    front_brake_type = 'Wentylowane tarczowe',
    rear_brake_type = 'Wentylowane tarczowe'
WHERE id = 5;

UPDATE vehicles
SET
    power_nm = 850,
    is_factory_power = TRUE,
    engine_mount = 'Z przodu, wzdluznie',
    aspiration = 'BiTurbo',
    cylinder_count = 8,
    cylinder_layout = 'V',
    seat_count = 5,
    length_mm = 4995,
    width_mm = 1951,
    height_mm = 1487,
    wheel_size_label = '22\" / 10.5J',
    tire_size_label = '285 / 30 R22',
    front_brake_type = 'Wentylowane tarczowe ceramiczne',
    rear_brake_type = 'Wentylowane tarczowe'
WHERE id = 6;

CREATE TABLE community_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id INTEGER REFERENCES car_brands(id) ON DELETE SET NULL,
    model_id INTEGER REFERENCES car_models(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (model_id IS NULL OR brand_id IS NOT NULL)
);

CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_brand_id ON community_posts(brand_id);
CREATE INDEX idx_community_posts_model_id ON community_posts(model_id);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);

CREATE TABLE community_post_likes (
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_community_post_likes_user_id ON community_post_likes(user_id);

CREATE TABLE community_post_saves (
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_community_post_saves_user_id ON community_post_saves(user_id);

CREATE TABLE community_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_comments_post_id ON community_comments(post_id, created_at ASC);
CREATE INDEX idx_community_comments_user_id ON community_comments(user_id);

CREATE TABLE community_post_images (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    image_path VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL CHECK (display_order >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_post_images_post_id ON community_post_images(post_id, display_order ASC, id ASC);

CREATE OR REPLACE VIEW vw_community_feed AS
SELECT
    p.id,
    p.user_id,
    p.brand_id,
    p.model_id,
    p.content,
    p.created_at,
    p.updated_at,
    p.is_active,
    u.username,
    u.pseudonym,
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.membership_tier,
    cb.name AS brand_name,
    cm.name AS model_name,
    COALESCE(likes.like_count, 0) AS like_count,
    COALESCE(saves.save_count, 0) AS save_count,
    COALESCE(comments.comment_count, 0) AS comment_count
FROM community_posts p
INNER JOIN users u
    ON u.id = p.user_id
LEFT JOIN car_brands cb
    ON cb.id = p.brand_id
LEFT JOIN car_models cm
    ON cm.id = p.model_id
LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS like_count
    FROM community_post_likes l
    WHERE l.post_id = p.id
) AS likes ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS save_count
    FROM community_post_saves s
    WHERE s.post_id = p.id
) AS saves ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS comment_count
    FROM community_comments c
    WHERE c.post_id = p.id
        AND c.is_active = TRUE
) AS comments ON TRUE
WHERE p.is_active = TRUE;

CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id INTEGER NOT NULL REFERENCES car_brands(id) ON DELETE RESTRICT,
    model_id INTEGER NOT NULL REFERENCES car_models(id) ON DELETE RESTRICT,
    title VARCHAR(180) NOT NULL,
    trim_name VARCHAR(150),
    description TEXT NOT NULL,
    price_amount NUMERIC(12, 2) NOT NULL CHECK (price_amount >= 0),
    production_year SMALLINT NOT NULL CHECK (production_year BETWEEN 1886 AND 2100),
    mileage_km INTEGER NOT NULL CHECK (mileage_km >= 0),
    fuel_type VARCHAR(30)
        CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'cng', 'other')),
    transmission VARCHAR(30)
        CHECK (transmission IN ('manual', 'automatic', 'semi_automatic')),
    body_type VARCHAR(50),
    drivetrain VARCHAR(50),
    steering_side VARCHAR(10)
        CHECK (steering_side IN ('left', 'right')),
    technical_condition VARCHAR(20)
        CHECK (technical_condition IN ('undamaged', 'damaged')),
    engine_capacity_cc INTEGER CHECK (engine_capacity_cc > 0),
    power_hp INTEGER CHECK (power_hp > 0),
    exterior_color VARCHAR(50),
    city VARCHAR(100) NOT NULL,
    contact_name VARCHAR(150) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_listings_created_at
    ON marketplace_listings(created_at DESC, id DESC);

CREATE INDEX idx_marketplace_listings_brand_model
    ON marketplace_listings(brand_id, model_id);

CREATE INDEX idx_marketplace_listings_price
    ON marketplace_listings(price_amount);

CREATE INDEX idx_marketplace_listings_user_id
    ON marketplace_listings(user_id);

CREATE TABLE marketplace_listing_images (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1 CHECK (display_order >= 1)
);

CREATE INDEX idx_marketplace_listing_images_listing_id
    ON marketplace_listing_images(listing_id, display_order, id);

CREATE TABLE marketplace_listing_saves (
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (listing_id, user_id)
);

CREATE INDEX idx_marketplace_listing_saves_user_id
    ON marketplace_listing_saves(user_id);

CREATE TABLE content_reports (
    id SERIAL PRIMARY KEY,
    reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL
        CHECK (content_type IN ('listing', 'post', 'comment', 'profile')),
    content_id INTEGER NOT NULL,
    reported_subject TEXT NOT NULL,
    reason_code VARCHAR(80) NOT NULL,
    reason_label VARCHAR(180) NOT NULL,
    reason_text TEXT,
    target_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    closed_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_content_reports_status_created_at
    ON content_reports(status, created_at ASC, id ASC);

CREATE INDEX idx_content_reports_content
    ON content_reports(content_type, content_id);

CREATE INDEX idx_content_reports_reported_user_id
    ON content_reports(reported_user_id);

CREATE OR REPLACE VIEW vw_marketplace_feed AS
SELECT
    l.id,
    l.user_id,
    l.brand_id,
    l.model_id,
    l.title,
    l.trim_name,
    l.description,
    l.price_amount,
    l.production_year,
    l.mileage_km,
    l.fuel_type,
    l.transmission,
    l.body_type,
    l.drivetrain,
    l.engine_capacity_cc,
    l.power_hp,
    l.exterior_color,
    l.city,
    l.contact_name,
    l.contact_phone,
    l.contact_email,
    l.created_at,
    l.updated_at,
    u.username,
    u.pseudonym,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.membership_tier,
    COALESCE(us.marketplace_preferred_contact_channel, 'both') AS preferred_contact_channel,
    cb.name AS brand_name,
    cm.name AS model_name,
    COALESCE(saved.save_count, 0) AS save_count,
    l.steering_side,
    l.technical_condition
FROM marketplace_listings l
INNER JOIN users u
    ON u.id = l.user_id
LEFT JOIN user_settings us
    ON us.user_id = u.id
INNER JOIN car_brands cb
    ON cb.id = l.brand_id
INNER JOIN car_models cm
    ON cm.id = l.model_id
LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS save_count
    FROM marketplace_listing_saves s
    WHERE s.listing_id = l.id
) AS saved ON TRUE
WHERE l.is_active = TRUE;

INSERT INTO community_posts (user_id, brand_id, model_id, content, created_at, updated_at) VALUES
    (1, NULL, NULL, 'Pierwszy post testowy bez kategorii. Szukam opinii o najlepszych trasach na weekend.', '2026-05-18 08:15:00+02', '2026-05-18 08:15:00+02'),
    (4, 2, 2, 'Ktoś już robił pełny setup hamulców w M3 G80 i może polecić konkretny zestaw pod street plus track day?', '2026-05-18 13:40:00+02', '2026-05-18 13:40:00+02'),
    (6, 3, NULL, 'Myślę nad RS6 jako daily. Jak wygląda realne spalanie i koszty przy spokojnej jeździe?', '2026-05-19 09:25:00+02', '2026-05-19 09:25:00+02'),
    (5, 1, 1, 'Czy ktoś porównywał 911 Carrera S do M3 jako auto na co dzień? Najbardziej interesuje mnie komfort i frajda z jazdy.', '2026-05-19 18:05:00+02', '2026-05-19 18:05:00+02'),
    (3, 2, NULL, 'Wrzućcie swoje ulubione ustawienia detailingu wnętrza. Szukam czegoś, co faktycznie dobrze działa przy jasnej tapicerce.', '2026-05-20 07:50:00+02', '2026-05-20 07:50:00+02');

INSERT INTO community_post_likes (post_id, user_id, created_at) VALUES
    (1, 4, '2026-05-18 09:10:00+02'),
    (1, 6, '2026-05-18 10:20:00+02'),
    (2, 1, '2026-05-18 14:05:00+02'),
    (2, 5, '2026-05-18 16:15:00+02'),
    (3, 1, '2026-05-19 09:40:00+02'),
    (3, 4, '2026-05-19 10:05:00+02'),
    (3, 5, '2026-05-19 10:25:00+02'),
    (4, 3, '2026-05-19 18:20:00+02'),
    (4, 4, '2026-05-19 19:10:00+02'),
    (4, 6, '2026-05-19 20:35:00+02'),
    (5, 1, '2026-05-20 08:05:00+02');

INSERT INTO community_post_saves (post_id, user_id, created_at) VALUES
    (2, 6, '2026-05-18 14:30:00+02'),
    (3, 1, '2026-05-19 10:00:00+02'),
    (4, 4, '2026-05-19 18:50:00+02'),
    (4, 5, '2026-05-19 19:15:00+02'),
    (5, 6, '2026-05-20 08:25:00+02');

INSERT INTO community_comments (post_id, user_id, content, created_at) VALUES
    (1, 3, 'Na Dolnym Śląsku polecam okolice Gór Sowich, jest sporo fajnych odcinków.', '2026-05-18 09:40:00+02'),
    (1, 5, 'Jeśli chcesz bardziej widokowo, to okolice Beskidu Niskiego robią robotę.', '2026-05-18 11:05:00+02'),
    (2, 1, 'Pod street i okazjonalny tor dobrze sprawdził mi się zestaw z lepszym płynem i przewodami.', '2026-05-18 14:15:00+02'),
    (2, 6, 'Jeśli auto ma zostać też na daily, to nie szedłbym od razu w najbardziej agresywne klocki.', '2026-05-18 17:00:00+02'),
    (3, 4, 'Przy spokojnej jeździe da się zejść sensownie, ale w mieście dalej swoje bierze.', '2026-05-19 10:40:00+02'),
    (4, 6, 'M3 jest praktyczniejsze, ale 911 daje znacznie więcej czystej frajdy z jazdy.', '2026-05-19 18:45:00+02'),
    (4, 1, 'Przy codziennym użytkowaniu 911 i tak potrafi zaskoczyć komfortem, szczególnie na dobrym setupie.', '2026-05-19 19:55:00+02'),
    (5, 2, 'Do jasnej tapicerki dobrze działa delikatne APC i regularne zabezpieczenie po czyszczeniu.', '2026-05-20 08:35:00+02');
