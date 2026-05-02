CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    membership_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (membership_tier IN ('free', 'pro', 'business')),
    avatar_path TEXT,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Europe/Warsaw',
    locale VARCHAR(10) NOT NULL DEFAULT 'pl_PL',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE car_brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    country_code CHAR(2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE car_models (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES car_brands(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    generation VARCHAR(100),
    production_start_year SMALLINT,
    production_end_year SMALLINT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (brand_id, name, generation)
);

CREATE INDEX idx_car_models_brand_id ON car_models(brand_id);

CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id INTEGER NOT NULL REFERENCES car_brands(id) ON DELETE RESTRICT,
    model_id INTEGER REFERENCES car_models(id) ON DELETE SET NULL,
    custom_make VARCHAR(100),
    custom_model VARCHAR(100),
    nickname VARCHAR(150),
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
    current_mileage_km INTEGER NOT NULL DEFAULT 0 CHECK (current_mileage_km >= 0),
    exterior_color VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    acquired_on DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        model_id IS NOT NULL
        OR (custom_make IS NOT NULL AND custom_model IS NOT NULL)
    )
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
    alt_text VARCHAR(255),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_vehicle_images_primary_per_vehicle
    ON vehicle_images(vehicle_id)
    WHERE is_primary = TRUE;

CREATE TABLE technical_inspections (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    inspection_date DATE NOT NULL,
    valid_until DATE NOT NULL,
    mileage_km INTEGER CHECK (mileage_km >= 0),
    station_name VARCHAR(255),
    result VARCHAR(20) NOT NULL DEFAULT 'passed' CHECK (result IN ('passed', 'failed', 'conditional')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_until >= inspection_date)
);

CREATE INDEX idx_technical_inspections_vehicle_valid_until
    ON technical_inspections(vehicle_id, valid_until);

CREATE TABLE insurance_policies (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    insurer_name VARCHAR(255) NOT NULL,
    policy_number VARCHAR(100),
    policy_type VARCHAR(20) NOT NULL DEFAULT 'oc' CHECK (policy_type IN ('oc', 'ac', 'oc_ac', 'other')),
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    premium_amount NUMERIC(10, 2),
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_until >= valid_from)
);

CREATE INDEX idx_insurance_policies_vehicle_valid_until
    ON insurance_policies(vehicle_id, valid_until);

CREATE UNIQUE INDEX uq_insurance_active_per_vehicle
    ON insurance_policies(vehicle_id)
    WHERE is_active = TRUE;

CREATE TABLE fuel_logs (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    fueled_at TIMESTAMPTZ NOT NULL,
    mileage_km INTEGER NOT NULL CHECK (mileage_km >= 0),
    liters NUMERIC(8, 2) NOT NULL CHECK (liters > 0),
    total_cost NUMERIC(10, 2) NOT NULL CHECK (total_cost >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    fuel_price_per_liter NUMERIC(8, 3) GENERATED ALWAYS AS (ROUND(total_cost / NULLIF(liters, 0), 3)) STORED,
    fuel_type VARCHAR(30) NOT NULL
        CHECK (fuel_type IN ('petrol', 'diesel', 'premium_petrol', 'premium_diesel', 'lpg', 'cng', 'electric', 'other')),
    station_name VARCHAR(255),
    city VARCHAR(100),
    full_tank BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fuel_logs_vehicle_fueled_at
    ON fuel_logs(vehicle_id, fueled_at DESC);

CREATE TABLE service_records (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL
        CHECK (service_type IN ('oil_change', 'inspection', 'tires', 'brakes', 'diagnostics', 'repair', 'detailing', 'other')),
    title VARCHAR(255) NOT NULL,
    service_date DATE NOT NULL,
    mileage_km INTEGER CHECK (mileage_km >= 0),
    cost_amount NUMERIC(10, 2),
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    workshop_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_records_vehicle_service_date
    ON service_records(vehicle_id, service_date DESC);

CREATE TABLE maintenance_tasks (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'done', 'dismissed')),
    estimated_cost_amount NUMERIC(10, 2),
    currency CHAR(3) NOT NULL DEFAULT 'PLN',
    target_date DATE,
    completed_at TIMESTAMPTZ,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_tasks_vehicle_status
    ON maintenance_tasks(vehicle_id, status);

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
) VALUES (
    'alexrivera',
    'alex.rivera@example.com',
    '$2y$10$examplehashedpasswordvalueforseedonly1234567890',
    'Alex',
    'Rivera',
    'pro',
    NULL,
    'Europe/Warsaw',
    'pl_PL',
    '2026-05-01 18:25:00+02'
);

INSERT INTO user_settings (
    user_id,
    email_notifications,
    push_notifications,
    maintenance_reminders,
    inspection_reminders,
    insurance_reminders,
    privacy_profile_visibility
) VALUES (
    1,
    TRUE,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    'private'
);

INSERT INTO car_brands (name, country_code) VALUES
    ('Porsche', 'DE'),
    ('BMW', 'DE'),
    ('Audi', 'DE');

INSERT INTO car_models (brand_id, name, generation, production_start_year, production_end_year) VALUES
    (1, '911 Carrera S', '992', 2019, NULL),
    (2, 'M3 Competition', 'G80', 2020, NULL),
    (3, 'RS6 Avant', 'C8', 2019, NULL);

INSERT INTO vehicles (
    user_id,
    brand_id,
    model_id,
    custom_make,
    custom_model,
    nickname,
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
    acquired_on,
    notes
) VALUES
    (
        1, 1, 1, NULL, NULL, 'Daily Classic', 'Porsche 911 Carrera S', '992 Generation',
        2022, 'WP0ZZZ99ZNS000001', 'WA1234P', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 28420, 'Ivory White', 'active',
        1, TRUE, '2022-02-10', 'Auto glowne do codziennej jazdy i wyjazdow weekendowych.'
    ),
    (
        1, 2, 2, NULL, NULL, 'Track Build', 'BMW M3 Competition', 'G80 Performance',
        2021, 'WBSZZZ90ZMM000002', 'WA5678P', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 46500, 'Frozen Turquoise', 'active',
        2, FALSE, '2021-06-18', 'Samochod do szybszej jazdy i okazjonalnych eventow.'
    ),
    (
        1, 3, 3, NULL, NULL, 'Family Rocket', 'Audi RS6 Avant', 'V8 TFSI Quattro',
        2022, 'WAUZZZF20NN000003', 'WA9012P', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 600, 31850, 'Nardo Grey', 'active',
        3, FALSE, '2022-04-05', 'Auto rodzinne z duzym bagaznikiem i mocnym silnikiem.'
    );

INSERT INTO vehicle_images (
    vehicle_id,
    image_path,
    alt_text,
    sort_order,
    is_primary
) VALUES
    (1, '/uploads/vehicles/porsche-911-main.jpg', 'Porsche 911 Carrera S front view', 1, TRUE),
    (2, '/uploads/vehicles/bmw-m3-main.jpg', 'BMW M3 Competition side view', 1, TRUE),
    (3, '/uploads/vehicles/audi-rs6-main.jpg', 'Audi RS6 Avant front quarter view', 1, TRUE);

INSERT INTO technical_inspections (
    vehicle_id,
    inspection_date,
    valid_until,
    mileage_km,
    station_name,
    result,
    notes
) VALUES
    (1, '2025-11-05', '2026-11-05', 26100, 'Porsche Centrum Warszawa', 'passed', NULL),
    (2, '2025-06-15', '2026-06-15', 44120, 'BMW Service Krakow', 'passed', NULL),
    (3, '2025-08-12', '2026-08-12', 29600, 'Audi Sport Service', 'passed', NULL);

INSERT INTO insurance_policies (
    vehicle_id,
    insurer_name,
    policy_number,
    policy_type,
    valid_from,
    valid_until,
    premium_amount,
    currency,
    is_active
) VALUES
    (1, 'PZU', 'PZU-911-2025-01', 'oc_ac', '2025-12-15', '2026-12-15', 4320.00, 'PLN', TRUE),
    (2, 'Allianz', 'ALL-M3-2025-02', 'oc_ac', '2025-08-15', '2026-08-15', 5580.00, 'PLN', TRUE),
    (3, 'Warta', 'WAR-RS6-2025-03', 'oc_ac', '2025-09-20', '2026-09-20', 6210.00, 'PLN', TRUE);

INSERT INTO fuel_logs (
    vehicle_id,
    fueled_at,
    mileage_km,
    liters,
    total_cost,
    currency,
    fuel_type,
    station_name,
    city,
    full_tank,
    notes
) VALUES
    (1, '2026-04-28 08:15:00+02', 28340, 49.20, 368.10, 'PLN', 'premium_petrol', 'Shell', 'Warszawa', TRUE, NULL),
    (2, '2026-04-26 17:45:00+02', 46380, 54.20, 428.20, 'PLN', 'premium_petrol', 'Shell', 'Krakow', TRUE, NULL),
    (3, '2026-04-24 09:30:00+02', 31620, 62.70, 507.95, 'PLN', 'premium_petrol', 'Orlen', 'Gdansk', TRUE, NULL);

INSERT INTO service_records (
    vehicle_id,
    service_type,
    title,
    service_date,
    mileage_km,
    cost_amount,
    currency,
    workshop_name,
    description
) VALUES
    (1, 'inspection', 'Przeglad okresowy', '2025-11-05', 26100, 1490.00, 'PLN', 'Porsche Centrum Warszawa', 'Kontrola okresowa i wymiana filtrow kabinowych.'),
    (2, 'oil_change', 'Wymiana oleju i filtrow', '2026-03-12', 45820, 1180.00, 'PLN', 'BMW Service Krakow', 'Wymiana oleju, filtra oleju i filtra powietrza.'),
    (3, 'tires', 'Nowy komplet opon', '2025-10-01', 30110, 4600.00, 'PLN', 'Audi Sport Service', 'Montaż nowego kompletu opon letnich.');

INSERT INTO maintenance_tasks (
    vehicle_id,
    title,
    description,
    priority,
    status,
    estimated_cost_amount,
    currency,
    target_date,
    completed_at,
    sort_order
) VALUES
    (1, 'Wymiana przednich klockow hamulcowych', 'Do sprawdzenia grubosc i ewentualna wymiana przy najblizszej wizycie.', 'high', 'open', 1400.00, 'PLN', '2026-05-20', NULL, 1),
    (2, 'Detailing lakieru', 'Polerka i zabezpieczenie lakieru po sezonie zimowym.', 'medium', 'in_progress', 1800.00, 'PLN', '2026-05-30', NULL, 2),
    (3, 'Kontrola akumulatora', 'Sprawdzic stan akumulatora przed dluzszym wyjazdem.', 'low', 'open', 300.00, 'PLN', '2026-05-15', NULL, 1);
