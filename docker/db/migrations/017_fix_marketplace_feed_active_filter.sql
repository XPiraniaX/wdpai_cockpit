DROP VIEW IF EXISTS vw_marketplace_feed;

CREATE VIEW vw_marketplace_feed AS
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
    cb.name AS brand_name,
    cm.name AS model_name,
    COALESCE(saved.save_count, 0) AS save_count,
    l.steering_side,
    l.technical_condition,
    l.is_active
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
