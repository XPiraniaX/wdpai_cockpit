UPDATE vehicles
SET model_id = (
    SELECT m_target.id
    FROM car_models m_target
    JOIN car_brands b_target ON b_target.id = m_target.brand_id
    WHERE b_target.name = 'Seat'
      AND m_target.name = 'Leon II 1P'
    LIMIT 1
)
WHERE model_id = (
    SELECT m_source.id
    FROM car_models m_source
    JOIN car_brands b_source ON b_source.id = m_source.brand_id
    WHERE b_source.name = 'Seat'
      AND m_source.name = 'Leon 2'
    LIMIT 1
);

UPDATE community_posts
SET model_id = (
    SELECT m_target.id
    FROM car_models m_target
    JOIN car_brands b_target ON b_target.id = m_target.brand_id
    WHERE b_target.name = 'Seat'
      AND m_target.name = 'Leon II 1P'
    LIMIT 1
)
WHERE model_id = (
    SELECT m_source.id
    FROM car_models m_source
    JOIN car_brands b_source ON b_source.id = m_source.brand_id
    WHERE b_source.name = 'Seat'
      AND m_source.name = 'Leon 2'
    LIMIT 1
);

DELETE FROM car_models
WHERE id = (
    SELECT m_source.id
    FROM car_models m_source
    JOIN car_brands b_source ON b_source.id = m_source.brand_id
    WHERE b_source.name = 'Seat'
      AND m_source.name = 'Leon 2'
    LIMIT 1
);
