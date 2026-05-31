CREATE TABLE community_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id INTEGER REFERENCES car_brands(id) ON DELETE SET NULL,
    model_id INTEGER REFERENCES car_models(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (model_id IS NULL OR brand_id IS NOT NULL)
);

CREATE INDEX idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX idx_community_posts_brand_id ON community_posts(brand_id);
CREATE INDEX idx_community_posts_model_id ON community_posts(model_id);
CREATE INDEX idx_community_posts_created_at ON community_posts(created_at DESC);

CREATE TABLE community_post_likes (
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_community_post_likes_user_id ON community_post_likes(user_id);

CREATE TABLE community_post_saves (
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX idx_community_post_saves_user_id ON community_post_saves(user_id);

CREATE TABLE community_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_comments_post_id ON community_comments(post_id, created_at ASC);
CREATE INDEX idx_community_comments_user_id ON community_comments(user_id);

CREATE OR REPLACE VIEW vw_community_feed AS
SELECT
    p.id,
    p.user_id,
    p.brand_id,
    p.model_id,
    p.content,
    p.created_at,
    p.updated_at,
    p.is_active,
    u.username,
    u.pseudonym,
    u.first_name,
    u.last_name,
    CONCAT(u.first_name, ' ', u.last_name) AS full_name,
    u.membership_tier,
    cb.name AS brand_name,
    cm.name AS model_name,
    COALESCE(likes.like_count, 0) AS like_count,
    COALESCE(saves.save_count, 0) AS save_count,
    COALESCE(comments.comment_count, 0) AS comment_count
FROM community_posts p
INNER JOIN users u
    ON u.id = p.user_id
LEFT JOIN car_brands cb
    ON cb.id = p.brand_id
LEFT JOIN car_models cm
    ON cm.id = p.model_id
LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS like_count
    FROM community_post_likes l
    WHERE l.post_id = p.id
) AS likes ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS save_count
    FROM community_post_saves s
    WHERE s.post_id = p.id
) AS saves ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS comment_count
    FROM community_comments c
    WHERE c.post_id = p.id
        AND c.is_active = TRUE
) AS comments ON TRUE
WHERE p.is_active = TRUE;

INSERT INTO community_posts (user_id, brand_id, model_id, content, created_at, updated_at) VALUES
    (1, NULL, NULL, 'Pierwszy post testowy bez kategorii. Szukam opinii o najlepszych trasach na weekend.', '2026-05-18 08:15:00+02', '2026-05-18 08:15:00+02'),
    (4, 2, 2, 'Ktoś już robił pełny setup hamulców w M3 G80 i może polecić konkretny zestaw pod street plus track day?', '2026-05-18 13:40:00+02', '2026-05-18 13:40:00+02'),
    (6, 3, NULL, 'Myślę nad RS6 jako daily. Jak wygląda realne spalanie i koszty przy spokojnej jeździe?', '2026-05-19 09:25:00+02', '2026-05-19 09:25:00+02'),
    (5, 1, 1, 'Czy ktoś porównywał 911 Carrera S do M3 jako auto na co dzień? Najbardziej interesuje mnie komfort i frajda z jazdy.', '2026-05-19 18:05:00+02', '2026-05-19 18:05:00+02'),
    (3, 2, NULL, 'Wrzućcie swoje ulubione ustawienia detailingu wnętrza. Szukam czegoś, co faktycznie dobrze działa przy jasnej tapicerce.', '2026-05-20 07:50:00+02', '2026-05-20 07:50:00+02');

INSERT INTO community_post_likes (post_id, user_id, created_at) VALUES
    (1, 4, '2026-05-18 09:10:00+02'),
    (1, 6, '2026-05-18 10:20:00+02'),
    (2, 1, '2026-05-18 14:05:00+02'),
    (2, 5, '2026-05-18 16:15:00+02'),
    (3, 1, '2026-05-19 09:40:00+02'),
    (3, 4, '2026-05-19 10:05:00+02'),
    (3, 5, '2026-05-19 10:25:00+02'),
    (4, 3, '2026-05-19 18:20:00+02'),
    (4, 4, '2026-05-19 19:10:00+02'),
    (4, 6, '2026-05-19 20:35:00+02'),
    (5, 1, '2026-05-20 08:05:00+02');

INSERT INTO community_post_saves (post_id, user_id, created_at) VALUES
    (2, 6, '2026-05-18 14:30:00+02'),
    (3, 1, '2026-05-19 10:00:00+02'),
    (4, 4, '2026-05-19 18:50:00+02'),
    (4, 5, '2026-05-19 19:15:00+02'),
    (5, 6, '2026-05-20 08:25:00+02');

INSERT INTO community_comments (post_id, user_id, content, created_at) VALUES
    (1, 3, 'Na Dolnym Śląsku polecam okolice Gór Sowich, jest sporo fajnych odcinków.', '2026-05-18 09:40:00+02'),
    (1, 5, 'Jeśli chcesz bardziej widokowo, to okolice Beskidu Niskiego robią robotę.', '2026-05-18 11:05:00+02'),
    (2, 1, 'Pod street i okazjonalny tor dobrze sprawdził mi się zestaw z lepszym płynem i przewodami.', '2026-05-18 14:15:00+02'),
    (2, 6, 'Jeśli auto ma zostać też na daily, to nie szedłbym od razu w najbardziej agresyjne klocki.', '2026-05-18 17:00:00+02'),
    (3, 4, 'Przy spokojnej jeździe da się zejść sensownie, ale w mieście dalej swoje bierze.', '2026-05-19 10:40:00+02'),
    (4, 6, 'M3 jest praktyczniejsze, ale 911 daje znacznie więcej czystej frajdy z jazdy.', '2026-05-19 18:45:00+02'),
    (4, 1, 'Przy codziennym użytkowaniu 911 i tak potrafi zaskoczyć komfortem, szczególnie na dobrym setupie.', '2026-05-19 19:55:00+02'),
    (5, 2, 'Do jasnej tapicerki dobrze działa delikatne APC i regularne zabezpieczenie po czyszczeniu.', '2026-05-20 08:35:00+02');
