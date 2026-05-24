UPDATE vehicles
SET model_id = 1
WHERE model_id IN (
    SELECT m.id
    FROM car_models m
    JOIN car_brands b ON b.id = m.brand_id
    WHERE b.name = 'Porsche'
      AND m.name = '911 992'
      AND m.id <> 1
);

DELETE FROM car_models
WHERE id IN (
    SELECT m.id
    FROM car_models m
    JOIN car_brands b ON b.id = m.brand_id
    WHERE b.name = 'Porsche'
      AND m.name = '911 992'
      AND m.id <> 1
);

UPDATE car_models
SET name = '911 992'
WHERE id = 1
  AND brand_id = (SELECT id FROM car_brands WHERE name = 'Porsche');

UPDATE vehicles
SET model_id = 2
WHERE model_id IN (
    SELECT m.id
    FROM car_models m
    JOIN car_brands b ON b.id = m.brand_id
    WHERE b.name = 'BMW'
      AND m.name = 'M3 G80'
      AND m.id <> 2
);

DELETE FROM car_models
WHERE id IN (
    SELECT m.id
    FROM car_models m
    JOIN car_brands b ON b.id = m.brand_id
    WHERE b.name = 'BMW'
      AND m.name = 'M3 G80'
      AND m.id <> 2
);

UPDATE car_models
SET name = 'M3 G80'
WHERE id = 2
  AND brand_id = (SELECT id FROM car_brands WHERE name = 'BMW');

UPDATE vehicles
SET model_id = 3
WHERE model_id IN (
    SELECT m.id
    FROM car_models m
    JOIN car_brands b ON b.id = m.brand_id
    WHERE b.name = 'Audi'
      AND m.name = 'RS6 C8'
      AND m.id <> 3
);

DELETE FROM car_models
WHERE id IN (
    SELECT m.id
    FROM car_models m
    JOIN car_brands b ON b.id = m.brand_id
    WHERE b.name = 'Audi'
      AND m.name = 'RS6 C8'
      AND m.id <> 3
);

UPDATE car_models
SET name = 'RS6 C8'
WHERE id = 3
  AND brand_id = (SELECT id FROM car_brands WHERE name = 'Audi');

UPDATE vehicles
SET display_name = 'Porsche 911 992 Carrera S',
    trim_name = 'Carrera S'
WHERE model_id = 1
  AND brand_id = (SELECT id FROM car_brands WHERE name = 'Porsche');

UPDATE vehicles
SET display_name = 'BMW M3 G80 Competition',
    trim_name = 'Competition'
WHERE model_id = 2
  AND brand_id = (SELECT id FROM car_brands WHERE name = 'BMW');

UPDATE vehicles
SET display_name = 'Audi RS6 C8 Avant',
    trim_name = 'Avant'
WHERE model_id = 3
  AND brand_id = (SELECT id FROM car_brands WHERE name = 'Audi');
