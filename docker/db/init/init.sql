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
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE car_models (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES car_brands(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
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

INSERT INTO car_brands (name) VALUES
    ('Porsche'),
    ('BMW'),
    ('Audi');

INSERT INTO car_models (brand_id, name) VALUES
    (1, '911 Carrera S'),
    (2, 'M3 Competition'),
    (3, 'RS6 Avant');

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
        1, 1, 1, 'Porsche 911 Carrera S', '992 Generation',
        2022, 'WP0ZZZ99ZNS000001', 'WA1234P', 'coupe', 'rwd', 'petrol',
        'automatic', 2981, 450, 28420, 'Ivory White', 'active',
        1, TRUE, 'Auto glowne do codziennej jazdy i wyjazdow weekendowych.'
    ),
    (
        1, 2, 2, 'BMW M3 Competition', 'G80 Performance',
        2021, 'WBSZZZ90ZMM000002', 'WA5678P', 'sedan', 'awd', 'petrol',
        'automatic', 2993, 510, 46500, 'Frozen Turquoise', 'active',
        2, FALSE, 'Samochod do szybszej jazdy i okazjonalnych eventow.'
    ),
    (
        1, 3, 3, 'Audi RS6 Avant', 'V8 TFSI Quattro',
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
