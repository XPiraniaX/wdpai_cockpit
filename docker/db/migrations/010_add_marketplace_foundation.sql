CREATE TABLE IF NOT EXISTS marketplace_listings (
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

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created_at
    ON marketplace_listings(created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_brand_model
    ON marketplace_listings(brand_id, model_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_price
    ON marketplace_listings(price_amount);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id
    ON marketplace_listings(user_id);

CREATE TABLE IF NOT EXISTS marketplace_listing_images (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1 CHECK (display_order >= 1)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listing_images_listing_id
    ON marketplace_listing_images(listing_id, display_order, id);

CREATE TABLE IF NOT EXISTS marketplace_listing_saves (
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (listing_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listing_saves_user_id
    ON marketplace_listing_saves(user_id);

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
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.membership_tier,
    cb.name AS brand_name,
    cm.name AS model_name,
    COALESCE(saved.save_count, 0) AS save_count,
    l.steering_side,
    l.technical_condition
FROM marketplace_listings l
INNER JOIN users u
    ON u.id = l.user_id
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
