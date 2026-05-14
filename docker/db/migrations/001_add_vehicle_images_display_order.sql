ALTER TABLE vehicle_images
ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 1;

UPDATE vehicle_images
SET display_order = ordered.position
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (PARTITION BY vehicle_id ORDER BY is_primary DESC, id ASC) AS position
    FROM vehicle_images
) AS ordered
WHERE vehicle_images.id = ordered.id;
