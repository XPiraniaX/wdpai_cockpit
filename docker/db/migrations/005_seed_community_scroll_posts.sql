DO $$
DECLARE
    already_seeded BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM community_posts
        WHERE content LIKE '[SCROLL_SEED] %'
    )
    INTO already_seeded;

    IF already_seeded THEN
        RAISE NOTICE 'Community scroll seed already exists. Skipping migration 005.';
        RETURN;
    END IF;

    WITH active_users AS (
        SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM users
        WHERE is_active = TRUE
    ),
    user_meta AS (
        SELECT COUNT(*)::INTEGER AS total
        FROM active_users
    ),
    brand_rows AS (
        SELECT
            id,
            name,
            ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM car_brands
    ),
    brand_meta AS (
        SELECT COUNT(*)::INTEGER AS total
        FROM brand_rows
    ),
    model_rows AS (
        SELECT
            cm.id AS model_id,
            cb.id AS brand_id,
            cb.name AS brand_name,
            cm.name AS model_name,
            ROW_NUMBER() OVER (ORDER BY cb.id, cm.id) AS rn
        FROM car_models cm
        INNER JOIN car_brands cb
            ON cb.id = cm.brand_id
    ),
    model_meta AS (
        SELECT COUNT(*)::INTEGER AS total
        FROM model_rows
    ),
    generated_posts AS (
        SELECT
            gs AS seed_no,
            au.id AS user_id,
            CASE
                WHEN gs % 4 = 1 THEN NULL
                WHEN gs % 4 = 2 THEN br.id
                ELSE mr.brand_id
            END AS brand_id,
            CASE
                WHEN gs % 4 IN (0, 3) THEN mr.model_id
                ELSE NULL
            END AS model_id,
            format(
                '[SCROLL_SEED] Post #%s. Test infinite scrolla, prosty wpis numer %s o codziennym użytkowaniu auta, trasach i kosztach.',
                gs,
                gs
            ) AS content,
            (CURRENT_TIMESTAMP - ((101 - gs) * INTERVAL '3 minutes')) AS created_at
        FROM generate_series(1, 100) AS gs
        CROSS JOIN user_meta um
        CROSS JOIN brand_meta bm
        CROSS JOIN model_meta mm
        INNER JOIN active_users au
            ON au.rn = ((gs - 1) % GREATEST(um.total, 1)) + 1
        LEFT JOIN brand_rows br
            ON br.rn = ((gs - 1) % GREATEST(bm.total, 1)) + 1
        LEFT JOIN model_rows mr
            ON mr.rn = ((gs - 1) % GREATEST(mm.total, 1)) + 1
    ),
    inserted_posts AS (
        INSERT INTO community_posts (user_id, brand_id, model_id, content, created_at, updated_at)
        SELECT
            user_id,
            brand_id,
            model_id,
            content,
            created_at,
            created_at
        FROM generated_posts
        ORDER BY seed_no
        RETURNING id, user_id, created_at
    ),
    numbered_posts AS (
        SELECT
            id,
            user_id,
            created_at,
            ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS seed_no
        FROM inserted_posts
    )
    INSERT INTO community_post_likes (post_id, user_id, created_at)
    SELECT
        np.id,
        au.id,
        np.created_at + INTERVAL '6 minutes'
    FROM numbered_posts np
    INNER JOIN user_meta um ON TRUE
    INNER JOIN active_users au
        ON au.rn = ((np.seed_no) % GREATEST(um.total, 1)) + 1
    WHERE au.id <> np.user_id
        AND np.seed_no % 2 = 0;

    WITH active_users AS (
        SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM users
        WHERE is_active = TRUE
    ),
    user_meta AS (
        SELECT COUNT(*)::INTEGER AS total
        FROM active_users
    ),
    seeded_posts AS (
        SELECT
            id,
            user_id,
            created_at,
            ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS seed_no
        FROM community_posts
        WHERE content LIKE '[SCROLL_SEED] %'
    )
    INSERT INTO community_post_saves (post_id, user_id, created_at)
    SELECT
        sp.id,
        au.id,
        sp.created_at + INTERVAL '11 minutes'
    FROM seeded_posts sp
    INNER JOIN user_meta um ON TRUE
    INNER JOIN active_users au
        ON au.rn = ((sp.seed_no + 1) % GREATEST(um.total, 1)) + 1
    WHERE au.id <> sp.user_id
        AND sp.seed_no % 3 = 0;

    WITH active_users AS (
        SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM users
        WHERE is_active = TRUE
    ),
    user_meta AS (
        SELECT COUNT(*)::INTEGER AS total
        FROM active_users
    ),
    seeded_posts AS (
        SELECT
            id,
            user_id,
            created_at,
            ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS seed_no
        FROM community_posts
        WHERE content LIKE '[SCROLL_SEED] %'
    )
    INSERT INTO community_comments (post_id, user_id, content, created_at)
    SELECT
        sp.id,
        au.id,
        format('Testowy komentarz do posta #%s. Sprawdzam działanie listy komentarzy i popupu.', sp.seed_no),
        sp.created_at + INTERVAL '14 minutes'
    FROM seeded_posts sp
    INNER JOIN user_meta um ON TRUE
    INNER JOIN active_users au
        ON au.rn = ((sp.seed_no + 2) % GREATEST(um.total, 1)) + 1
    WHERE au.id <> sp.user_id
        AND sp.seed_no % 4 = 0;
END $$;
