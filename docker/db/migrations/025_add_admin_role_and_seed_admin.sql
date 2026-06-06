ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

INSERT INTO users (
    username,
    email,
    password,
    first_name,
    last_name,
    role,
    membership_tier,
    avatar_path,
    timezone,
    locale,
    last_login_at,
    is_active
) VALUES (
    'admin',
    'admin@cockpit.local',
    '$2y$10$Oel5tNrw/aPpf7U9w4rTbeOJHF7R4IiMuHXOkz0QKn2Phe3ElA93O',
    'Panel',
    'Administratora',
    'admin',
    'free',
    NULL,
    'Europe/Warsaw',
    'pl_PL',
    NULL,
    TRUE
)
ON CONFLICT (username) DO UPDATE
SET
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = 'admin',
    is_active = TRUE;

INSERT INTO user_settings (user_id)
SELECT id
FROM users
WHERE username = 'admin'
ON CONFLICT (user_id) DO NOTHING;
