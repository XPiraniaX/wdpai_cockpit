WITH seed_rows (
    user_id,
    brand_id,
    model_id,
    title,
    trim_name,
    description,
    price_amount,
    production_year,
    mileage_km,
    fuel_type,
    transmission,
    body_type,
    drivetrain,
    engine_capacity_cc,
    power_hp,
    exterior_color,
    city,
    contact_name,
    contact_phone,
    contact_email,
    steering_side,
    technical_condition,
    created_at,
    image_path
) AS (
    VALUES
        (1, 3, 60, '[MARKETPLACE_SEED] Audi A4 B9 2.0 TDI S line', 'S line', 'Demo ogloszenie do testow filtrow i infinite scroll.', 104900.00, 2018, 168000, 'diesel', 'automatic', 'sedan', 'fwd', 1968, 190, 'szary', 'Poznan', 'Alex Rivera', '123 456 781', 'alex.seed+1@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-24 10:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-1.jpg'),
        (2, 3, 60, '[MARKETPLACE_SEED] Audi A4 B9 2.0 TFSI quattro', 'quattro', 'Demo ogloszenie do testow filtrow i infinite scroll.', 128500.00, 2019, 121000, 'petrol', 'automatic', 'sedan', 'awd', 1984, 252, 'niebieski', 'Warszawa', 'Marta Zero', '123 456 782', 'marta.seed+2@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-24 09:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-2.jpg'),
        (3, 3, 60, '[MARKETPLACE_SEED] Audi A4 B9 35 TDI kombi', '35 TDI', 'Demo ogloszenie do testow filtrow i infinite scroll.', 99900.00, 2017, 201000, 'diesel', 'manual', 'wagon', 'fwd', 1968, 150, 'bialy', 'Gdansk', 'Kacper One', '123 456 783', 'kacper.seed+3@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-24 09:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-3.jpg'),
        (4, 3, 60, '[MARKETPLACE_SEED] Audi A4 B9 1.4 TFSI city car', 'city car', 'Demo ogloszenie do testow filtrow i infinite scroll.', 83900.00, 2016, 178000, 'petrol', 'manual', 'sedan', 'fwd', 1395, 150, 'czerwony', 'Lodz', 'Lena Two', '123 456 784', 'lena.seed+4@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-24 08:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-1.jpg'),
        (5, 3, 72, '[MARKETPLACE_SEED] Audi TT 8S 2.0 TFSI coupe', 'coupe', 'Demo ogloszenie do testow filtrow i infinite scroll.', 149900.00, 2018, 92000, 'petrol', 'automatic', 'coupe', 'awd', 1984, 230, 'zolty', 'Wroclaw', 'Oskar Four', '123 456 785', 'oskar.seed+5@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-24 08:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-tt-8s-rs-super-stan-20260526-231821-94be97-1.jpg'),
        (6, 3, 72, '[MARKETPLACE_SEED] Audi TT 8S 45 TFSI quattro', '45 TFSI', 'Demo ogloszenie do testow filtrow i infinite scroll.', 164500.00, 2020, 61000, 'petrol', 'automatic', 'coupe', 'awd', 1984, 245, 'czarny', 'Krakow', 'Nina Five', '123 456 786', 'nina.seed+6@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-24 07:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-tt-8s-rs-super-stan-20260526-231821-94be97-2.jpg'),
        (1, 2, 43, '[MARKETPLACE_SEED] BMW Seria 5 G30 530i xDrive', '530i xDrive', 'Demo ogloszenie do testow filtrow i infinite scroll.', 142000.00, 2018, 147000, 'petrol', 'automatic', 'sedan', 'awd', 1998, 252, 'grafitowy', 'Poznan', 'Alex Rivera', '123 456 787', 'alex.seed+7@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-23 18:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-1.jpg'),
        (2, 2, 43, '[MARKETPLACE_SEED] BMW Seria 5 G30 520d flotowy', '520d', 'Demo ogloszenie do testow filtrow i infinite scroll.', 118900.00, 2019, 219000, 'diesel', 'automatic', 'sedan', 'rwd', 1995, 190, 'srebrny', 'Katowice', 'Marta Zero', '123 456 788', 'marta.seed+8@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-23 17:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-2.jpg'),
        (3, 2, 43, '[MARKETPLACE_SEED] BMW Seria 5 G30 540i M pakiet', '540i', 'Demo ogloszenie do testow filtrow i infinite scroll.', 189900.00, 2020, 111000, 'petrol', 'automatic', 'sedan', 'rwd', 2998, 340, 'bialy', 'Szczecin', 'Kacper One', '123 456 789', 'kacper.seed+9@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-23 17:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-3.jpg'),
        (4, 2, 2, '[MARKETPLACE_SEED] BMW M3 G80 Competition RWD', 'Competition', 'Demo ogloszenie do testow filtrow i infinite scroll.', 329900.00, 2022, 28000, 'petrol', 'automatic', 'sedan', 'rwd', 2993, 510, 'zielony', 'Poznan', 'Lena Two', '223 456 780', 'lena.seed+10@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-23 16:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-tt-8s-rs-super-stan-20260526-231821-94be97-1.jpg'),
        (5, 2, 2, '[MARKETPLACE_SEED] BMW M3 G80 track toy', 'track toy', 'Demo ogloszenie do testow filtrow i infinite scroll.', 289000.00, 2021, 54000, 'petrol', 'automatic', 'sedan', 'awd', 2993, 480, 'pomaranczowy', 'Lublin', 'Oskar Four', '223 456 781', 'oskar.seed+11@example.com', 'left', 'damaged', TIMESTAMPTZ '2026-05-23 16:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-tt-8s-rs-super-stan-20260526-231821-94be97-2.jpg'),
        (6, 19, 132, '[MARKETPLACE_SEED] Cupra Formentor KM VZ 2.0 TSI', 'VZ', 'Demo ogloszenie do testow filtrow i infinite scroll.', 159500.00, 2022, 43000, 'petrol', 'automatic', 'suv', 'awd', 1984, 310, 'matowy szary', 'Warszawa', 'Nina Five', '223 456 782', 'nina.seed+12@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-23 15:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-1.jpg'),
        (1, 19, 132, '[MARKETPLACE_SEED] Cupra Formentor KM 1.5 eTSI', 'eTSI', 'Demo ogloszenie do testow filtrow i infinite scroll.', 123500.00, 2021, 76000, 'petrol', 'automatic', 'suv', 'fwd', 1498, 150, 'granatowy', 'Poznan', 'Alex Rivera', '223 456 783', 'alex.seed+13@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-23 15:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-2.jpg'),
        (2, 16, 96, '[MARKETPLACE_SEED] Mercedes-Benz Klasa C W205 C200', 'C200', 'Demo ogloszenie do testow filtrow i infinite scroll.', 114900.00, 2017, 164000, 'petrol', 'automatic', 'sedan', 'rwd', 1991, 184, 'czarny', 'Gdynia', 'Marta Zero', '223 456 784', 'marta.seed+14@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-22 18:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-1.jpg'),
        (3, 16, 96, '[MARKETPLACE_SEED] Mercedes-Benz Klasa C W205 C220d', 'C220d', 'Demo ogloszenie do testow filtrow i infinite scroll.', 126900.00, 2018, 187000, 'diesel', 'automatic', 'sedan', 'rwd', 2143, 170, 'srebrny', 'Bydgoszcz', 'Kacper One', '223 456 785', 'kacper.seed+15@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-22 17:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-2.jpg'),
        (4, 16, 96, '[MARKETPLACE_SEED] Mercedes-Benz Klasa C W205 coupe AMG', 'AMG line', 'Demo ogloszenie do testow filtrow i infinite scroll.', 149500.00, 2019, 129000, 'petrol', 'automatic', 'coupe', 'awd', 1991, 258, 'czerwony', 'Rzeszow', 'Lena Two', '223 456 786', 'lena.seed+16@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-22 17:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-3.jpg'),
        (5, 17, 109, '[MARKETPLACE_SEED] Opel Astra K 1.6 CDTI kombi', 'CDTI', 'Demo ogloszenie do testow filtrow i infinite scroll.', 48900.00, 2017, 212000, 'diesel', 'manual', 'wagon', 'fwd', 1598, 136, 'bialy', 'Opole', 'Oskar Four', '223 456 787', 'oskar.seed+17@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-22 16:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-1.jpg'),
        (6, 17, 109, '[MARKETPLACE_SEED] Opel Astra K 1.4 Turbo hatchback', 'Turbo', 'Demo ogloszenie do testow filtrow i infinite scroll.', 45900.00, 2016, 175000, 'petrol', 'manual', 'hatchback', 'fwd', 1399, 150, 'niebieski', 'Kielce', 'Nina Five', '223 456 788', 'nina.seed+18@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-22 16:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-2.jpg'),
        (1, 17, 109, '[MARKETPLACE_SEED] Opel Astra K LPG ekonomiczna', 'LPG', 'Demo ogloszenie do testow filtrow i infinite scroll.', 41900.00, 2016, 243000, 'lpg', 'manual', 'hatchback', 'fwd', 1399, 125, 'szary', 'Poznan', 'Alex Rivera', '223 456 789', 'alex.seed+19@example.com', 'left', 'damaged', TIMESTAMPTZ '2026-05-22 15:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-3.jpg'),
        (2, 11, 123, '[MARKETPLACE_SEED] Seat Leon II 1P 2.0 TFSI FR', 'FR', 'Demo ogloszenie do testow filtrow i infinite scroll.', 39900.00, 2008, 251000, 'petrol', 'manual', 'hatchback', 'fwd', 1984, 200, 'czerwony', 'Warszawa', 'Marta Zero', '323 456 780', 'marta.seed+20@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-21 19:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230137-2e0755-1.jpg'),
        (3, 11, 123, '[MARKETPLACE_SEED] Seat Leon II 1P 1.9 TDI', '1.9 TDI', 'Demo ogloszenie do testow filtrow i infinite scroll.', 27900.00, 2007, 318000, 'diesel', 'manual', 'hatchback', 'fwd', 1896, 105, 'czarny', 'Bialystok', 'Kacper One', '323 456 781', 'kacper.seed+21@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-21 18:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-1.jpg'),
        (4, 11, 123, '[MARKETPLACE_SEED] Seat Leon II 1P 2.0 TDI DSG', 'DSG', 'Demo ogloszenie do testow filtrow i infinite scroll.', 33900.00, 2010, 286000, 'diesel', 'automatic', 'hatchback', 'fwd', 1968, 170, 'srebrny', 'Plock', 'Lena Two', '323 456 782', 'lena.seed+22@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-21 18:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-2.jpg'),
        (5, 20, 141, '[MARKETPLACE_SEED] Skoda Octavia III 5E 1.5 TSI', 'Style', 'Demo ogloszenie do testow filtrow i infinite scroll.', 64900.00, 2019, 153000, 'petrol', 'manual', 'liftback', 'fwd', 1498, 150, 'bialy', 'Torun', 'Oskar Four', '323 456 783', 'oskar.seed+23@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-21 17:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-2.jpg'),
        (6, 20, 141, '[MARKETPLACE_SEED] Skoda Octavia III 5E 2.0 TDI DSG', 'Ambition', 'Demo ogloszenie do testow filtrow i infinite scroll.', 70900.00, 2018, 198000, 'diesel', 'automatic', 'wagon', 'fwd', 1968, 150, 'zielony', 'Zielona Gora', 'Nina Five', '323 456 784', 'nina.seed+24@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-21 17:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-audi-a4-b9-sedan-niski-przebieg-20260526-180235-5efa19-3.jpg'),
        (1, 15, 76, '[MARKETPLACE_SEED] Volkswagen Golf VII 1.5 TSI EVO', 'EVO', 'Demo ogloszenie do testow filtrow i infinite scroll.', 58900.00, 2018, 166000, 'petrol', 'manual', 'hatchback', 'fwd', 1498, 150, 'granatowy', 'Poznan', 'Alex Rivera', '323 456 785', 'alex.seed+25@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-21 16:30:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-3.jpg'),
        (2, 15, 76, '[MARKETPLACE_SEED] Volkswagen Golf VII GTD', 'GTD', 'Demo ogloszenie do testow filtrow i infinite scroll.', 72900.00, 2017, 224000, 'diesel', 'automatic', 'hatchback', 'fwd', 1968, 184, 'szary', 'Warszawa', 'Marta Zero', '323 456 786', 'marta.seed+26@example.com', 'left', 'undamaged', TIMESTAMPTZ '2026-05-21 16:00:00+02', '/public/uploads/marketplace/lenatwo-marketplace-seat-leon-2-cupra-tanio-20260526-230340-fb5fc5-1.jpg')
),
inserted_listings AS (
    INSERT INTO marketplace_listings (
        user_id,
        brand_id,
        model_id,
        title,
        trim_name,
        description,
        price_amount,
        production_year,
        mileage_km,
        fuel_type,
        transmission,
        body_type,
        drivetrain,
        engine_capacity_cc,
        power_hp,
        exterior_color,
        city,
        contact_name,
        contact_phone,
        contact_email,
        is_active,
        created_at,
        updated_at,
        steering_side,
        technical_condition
    )
    SELECT
        sr.user_id,
        sr.brand_id,
        sr.model_id,
        sr.title,
        sr.trim_name,
        sr.description,
        sr.price_amount,
        sr.production_year,
        sr.mileage_km,
        sr.fuel_type,
        sr.transmission,
        sr.body_type,
        sr.drivetrain,
        sr.engine_capacity_cc,
        sr.power_hp,
        sr.exterior_color,
        sr.city,
        sr.contact_name,
        sr.contact_phone,
        sr.contact_email,
        TRUE,
        sr.created_at,
        sr.created_at,
        sr.steering_side,
        sr.technical_condition
    FROM seed_rows sr
    WHERE NOT EXISTS (
        SELECT 1
        FROM marketplace_listings existing
        WHERE existing.title = sr.title
    )
    RETURNING id, title
),
target_listings AS (
    SELECT id, title
    FROM inserted_listings
    UNION
    SELECT existing.id, existing.title
    FROM marketplace_listings existing
    INNER JOIN seed_rows sr
        ON sr.title = existing.title
)
INSERT INTO marketplace_listing_images (listing_id, image_path, display_order)
SELECT
    listing.id,
    sr.image_path,
    1
FROM seed_rows sr
INNER JOIN target_listings listing
    ON listing.title = sr.title
WHERE NOT EXISTS (
    SELECT 1
    FROM marketplace_listing_images existing_image
    WHERE existing_image.listing_id = listing.id
      AND existing_image.display_order = 1
);

WITH saved_targets (title, user_id, created_at) AS (
    VALUES
        ('[MARKETPLACE_SEED] Audi A4 B9 2.0 TDI S line', 4, TIMESTAMPTZ '2026-05-24 10:10:00+02'),
        ('[MARKETPLACE_SEED] Audi TT 8S 2.0 TFSI coupe', 4, TIMESTAMPTZ '2026-05-24 08:10:00+02'),
        ('[MARKETPLACE_SEED] BMW Seria 5 G30 530i xDrive', 4, TIMESTAMPTZ '2026-05-23 18:10:00+02'),
        ('[MARKETPLACE_SEED] Cupra Formentor KM VZ 2.0 TSI', 4, TIMESTAMPTZ '2026-05-23 15:40:00+02'),
        ('[MARKETPLACE_SEED] Mercedes-Benz Klasa C W205 C220d', 4, TIMESTAMPTZ '2026-05-22 17:40:00+02'),
        ('[MARKETPLACE_SEED] Seat Leon II 1P 2.0 TFSI FR', 5, TIMESTAMPTZ '2026-05-21 19:10:00+02'),
        ('[MARKETPLACE_SEED] Skoda Octavia III 5E 2.0 TDI DSG', 5, TIMESTAMPTZ '2026-05-21 17:10:00+02'),
        ('[MARKETPLACE_SEED] Volkswagen Golf VII GTD', 5, TIMESTAMPTZ '2026-05-21 16:10:00+02')
)
INSERT INTO marketplace_listing_saves (listing_id, user_id, created_at)
SELECT
    listing.id,
    st.user_id,
    st.created_at
FROM saved_targets st
INNER JOIN marketplace_listings listing
    ON listing.title = st.title
WHERE NOT EXISTS (
    SELECT 1
    FROM marketplace_listing_saves existing_save
    WHERE existing_save.listing_id = listing.id
      AND existing_save.user_id = st.user_id
);
