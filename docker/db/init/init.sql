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
    ),
    (
        3, 1, 1, NULL, NULL, 'Weekend Hero', 'Porsche 911 Carrera S', 'Touring Spec',
        2021, 'WP0ZZZ99ZMS000004', 'KR1001K', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 19250, 'Guards Red', 'active',
        1, TRUE, '2023-03-18', 'Jeden samochod do testu dashboardu z pojedyncza karta.'
    ),
    (
        4, 2, 2, NULL, NULL, 'Daily Storm', 'BMW M3 Competition', 'G80 Competition',
        2022, 'WBSZZZ90ZNM000005', 'GD2202L', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 22880, 'Brooklyn Grey', 'active',
        1, TRUE, '2022-08-27', 'Pierwszy samochod uzytkownika z dwoma autami.'
    ),
    (
        4, 3, 3, NULL, NULL, 'Travel Boost', 'Audi RS6 Avant', 'Performance Pack',
        2023, 'WAUZZZF20PN000006', 'GD2203L', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 630, 14540, 'Mythos Black', 'active',
        2, FALSE, '2023-11-09', 'Drugi samochod do sprawdzenia dwoch kart.'
    ),
    (
        5, 1, 1, NULL, NULL, 'City Pulse', 'Porsche 911 Carrera S', 'Urban Edition',
        2020, 'WP0ZZZ99ZLS000007', 'PO3301O', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 38440, 'Jet Black', 'active',
        1, TRUE, '2021-01-15', 'Auto glowne dla ukladu czterech kart.'
    ),
    (
        5, 2, 2, NULL, NULL, 'Track Echo', 'BMW M3 Competition', 'Track Package',
        2021, 'WBSZZZ90ZMM000008', 'PO3302O', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 41200, 'Isle of Man Green', 'active',
        2, FALSE, '2021-09-02', 'Drugie auto uzytkownika z czterema pojazdami.'
    ),
    (
        5, 3, 3, NULL, NULL, 'Family Glide', 'Audi RS6 Avant', 'Comfort Spec',
        2022, 'WAUZZZF20NN000009', 'PO3303O', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 600, 26710, 'Daytona Grey', 'active',
        3, FALSE, '2022-06-21', 'Trzecie auto do testu zawijania siatki.'
    ),
    (
        5, 2, 2, NULL, NULL, 'Night Runner', 'BMW M3 Competition', 'Shadow Line',
        2024, 'WBSZZZ90ZRM000010', 'PO3304O', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 8960, 'Frozen Black', 'active',
        4, FALSE, '2024-02-12', 'Czwarte auto do sprawdzenia wypelnienia rzedu.'
    ),
    (
        6, 1, 1, NULL, NULL, 'Classic Fire', 'Porsche 911 Carrera S', 'Heritage Spec',
        2019, 'WP0ZZZ99ZKS000011', 'WR4401N', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 52110, 'Carmine Red', 'active',
        1, TRUE, '2020-04-04', 'Pierwszy z pieciu samochodow testowych.'
    ),
    (
        6, 2, 2, NULL, NULL, 'Power Line', 'BMW M3 Competition', 'Carbon Pack',
        2020, 'WBSZZZ90ZLM000012', 'WR4402N', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 44760, 'Sao Paulo Yellow', 'active',
        2, FALSE, '2020-10-16', 'Drugie auto do dashboardu z piecioma kartami.'
    ),
    (
        6, 3, 3, NULL, NULL, 'Long Tour', 'Audi RS6 Avant', 'Touring Edition',
        2021, 'WAUZZZF20MN000013', 'WR4403N', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 600, 33420, 'Sebring Black', 'active',
        3, FALSE, '2021-07-07', 'Trzecie auto testowe.'
    ),
    (
        6, 1, 1, NULL, NULL, 'Sunset Drive', 'Porsche 911 Carrera S', 'Coastal Package',
        2023, 'WP0ZZZ99ZPS000014', 'WR4404N', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 12780, 'Racing Yellow', 'active',
        4, FALSE, '2023-05-11', 'Czwarte auto testowe.'
    ),
    (
        6, 3, 3, NULL, NULL, 'Grand Sprint', 'Audi RS6 Avant', 'Ultimate Pack',
        2024, 'WAUZZZF20RN000015', 'WR4405N', 'wagon', 'awd', 'petrol',
        'automatic', 3996, 630, 6930, 'Ascari Blue', 'active',
        5, FALSE, '2024-08-19', 'Piate auto do testu wiekszej liczby kart.'
    );

INSERT INTO vehicle_images (
    vehicle_id,
    image_path,
    alt_text,
    sort_order,
    is_primary
) VALUES
    (1, '/public/uploads/vehicles/porsche-911-main.jpg', 'Porsche 911 Carrera S front view', 1, TRUE),
    (2, '/public/uploads/vehicles/bmw-m3-main.jpg', 'BMW M3 Competition side view', 1, TRUE),
    (3, '/public/uploads/vehicles/audi-rs6-main.jpg', 'Audi RS6 Avant front quarter view', 1, TRUE),
    (4, '/public/uploads/vehicles/porsche-911-main.jpg', 'Porsche 911 Carrera S front view', 1, TRUE),
    (5, '/public/uploads/vehicles/bmw-m3-main.jpg', 'BMW M3 Competition side view', 1, TRUE),
    (6, '/public/uploads/vehicles/audi-rs6-main.jpg', 'Audi RS6 Avant front quarter view', 1, TRUE),
    (7, '/public/uploads/vehicles/porsche-911-main.jpg', 'Porsche 911 Carrera S front view', 1, TRUE),
    (8, '/public/uploads/vehicles/bmw-m3-main.jpg', 'BMW M3 Competition side view', 1, TRUE),
    (9, '/public/uploads/vehicles/audi-rs6-main.jpg', 'Audi RS6 Avant front quarter view', 1, TRUE),
    (10, '/public/uploads/vehicles/bmw-m3-main.jpg', 'BMW M3 Competition side view', 1, TRUE),
    (11, '/public/uploads/vehicles/porsche-911-main.jpg', 'Porsche 911 Carrera S front view', 1, TRUE),
    (12, '/public/uploads/vehicles/bmw-m3-main.jpg', 'BMW M3 Competition side view', 1, TRUE),
    (13, '/public/uploads/vehicles/audi-rs6-main.jpg', 'Audi RS6 Avant front quarter view', 1, TRUE),
    (14, '/public/uploads/vehicles/porsche-911-main.jpg', 'Porsche 911 Carrera S front view', 1, TRUE),
    (15, '/public/uploads/vehicles/audi-rs6-main.jpg', 'Audi RS6 Avant front quarter view', 1, TRUE);

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
    (3, '2025-08-12', '2026-08-12', 29600, 'Audi Sport Service', 'passed', NULL),
    (4, '2025-09-18', '2026-09-18', 18100, 'Porsche Centrum Krakow', 'passed', NULL),
    (5, '2025-07-10', '2026-07-10', 21140, 'BMW Service Gdansk', 'passed', NULL),
    (6, '2025-10-22', '2026-10-22', 13210, 'Audi Centrum Gdynia', 'passed', NULL),
    (7, '2025-05-28', '2026-05-28', 37240, 'Porsche Centrum Poznan', 'passed', NULL),
    (8, '2025-08-30', '2026-08-30', 40150, 'BMW Service Poznan', 'passed', NULL),
    (9, '2025-09-14', '2026-09-14', 25510, 'Audi Sport Service', 'passed', NULL),
    (10, '2025-12-02', '2026-12-02', 8120, 'BMW Service Warszawa', 'passed', NULL),
    (11, '2025-05-19', '2026-05-19', 50300, 'Porsche Centrum Radom', 'passed', NULL),
    (12, '2025-06-07', '2026-06-07', 43980, 'BMW Service Lublin', 'passed', NULL),
    (13, '2025-08-01', '2026-08-01', 32150, 'Audi Service Katowice', 'passed', NULL),
    (14, '2025-11-21', '2026-11-21', 11880, 'Porsche Centrum Warszawa', 'passed', NULL),
    (15, '2025-12-12', '2026-12-12', 6440, 'Audi Service Wroclaw', 'passed', NULL);

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
    (3, 'Warta', 'WAR-RS6-2025-03', 'oc_ac', '2025-09-20', '2026-09-20', 6210.00, 'PLN', TRUE),
    (4, 'PZU', 'PZU-911-2025-04', 'oc_ac', '2025-10-11', '2026-10-11', 3980.00, 'PLN', TRUE),
    (5, 'Allianz', 'ALL-M3-2025-05', 'oc_ac', '2025-06-20', '2026-06-20', 5070.00, 'PLN', TRUE),
    (6, 'Warta', 'WAR-RS6-2025-06', 'oc_ac', '2025-11-02', '2026-11-02', 6440.00, 'PLN', TRUE),
    (7, 'PZU', 'PZU-911-2025-07', 'oc_ac', '2025-07-01', '2026-07-01', 4150.00, 'PLN', TRUE),
    (8, 'Allianz', 'ALL-M3-2025-08', 'oc_ac', '2025-08-08', '2026-08-08', 5480.00, 'PLN', TRUE),
    (9, 'Warta', 'WAR-RS6-2025-09', 'oc_ac', '2025-10-03', '2026-10-03', 5990.00, 'PLN', TRUE),
    (10, 'Ergo Hestia', 'ERG-M3-2025-10', 'oc_ac', '2025-12-18', '2026-12-18', 5210.00, 'PLN', TRUE),
    (11, 'PZU', 'PZU-911-2025-11', 'oc_ac', '2025-05-26', '2026-05-26', 3890.00, 'PLN', TRUE),
    (12, 'Allianz', 'ALL-M3-2025-12', 'oc_ac', '2025-06-14', '2026-06-14', 5360.00, 'PLN', TRUE),
    (13, 'Warta', 'WAR-RS6-2025-13', 'oc_ac', '2025-08-25', '2026-08-25', 6180.00, 'PLN', TRUE),
    (14, 'PZU', 'PZU-911-2025-14', 'oc_ac', '2025-11-28', '2026-11-28', 4010.00, 'PLN', TRUE),
    (15, 'Ergo Hestia', 'ERG-RS6-2025-15', 'oc_ac', '2025-12-30', '2026-12-30', 6620.00, 'PLN', TRUE);

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
    (3, '2026-04-24 09:30:00+02', 31620, 62.70, 507.95, 'PLN', 'premium_petrol', 'Orlen', 'Gdansk', TRUE, NULL),
    (4, '2026-04-27 18:20:00+02', 19190, 47.60, 352.25, 'PLN', 'premium_petrol', 'BP', 'Krakow', TRUE, NULL),
    (5, '2026-04-29 07:50:00+02', 22780, 51.30, 398.60, 'PLN', 'premium_petrol', 'Shell', 'Gdansk', TRUE, NULL),
    (6, '2026-04-23 16:05:00+02', 14310, 60.10, 481.40, 'PLN', 'premium_petrol', 'Orlen', 'Gdynia', TRUE, NULL),
    (7, '2026-04-30 12:40:00+02', 38360, 48.90, 364.00, 'PLN', 'premium_petrol', 'Circle K', 'Poznan', TRUE, NULL),
    (8, '2026-04-25 18:15:00+02', 41020, 53.80, 423.10, 'PLN', 'premium_petrol', 'Shell', 'Poznan', TRUE, NULL),
    (9, '2026-04-22 10:25:00+02', 26440, 61.20, 492.70, 'PLN', 'premium_petrol', 'Orlen', 'Warszawa', TRUE, NULL),
    (10, '2026-05-01 08:05:00+02', 8910, 45.70, 356.80, 'PLN', 'premium_petrol', 'BP', 'Warszawa', TRUE, NULL),
    (11, '2026-04-21 15:35:00+02', 51980, 50.40, 374.20, 'PLN', 'premium_petrol', 'Shell', 'Radom', TRUE, NULL),
    (12, '2026-04-20 19:10:00+02', 44520, 54.90, 431.60, 'PLN', 'premium_petrol', 'Circle K', 'Lublin', TRUE, NULL),
    (13, '2026-04-19 11:45:00+02', 33280, 63.50, 512.30, 'PLN', 'premium_petrol', 'Orlen', 'Katowice', TRUE, NULL),
    (14, '2026-05-02 09:15:00+02', 12610, 46.80, 365.90, 'PLN', 'premium_petrol', 'Shell', 'Warszawa', TRUE, NULL),
    (15, '2026-05-02 20:30:00+02', 6880, 59.10, 479.50, 'PLN', 'premium_petrol', 'BP', 'Wroclaw', TRUE, NULL);

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
