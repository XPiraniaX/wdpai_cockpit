ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS blocked_reason TEXT NULL,
    ADD COLUMN IF NOT EXISTS blocked_is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP NULL;

ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS hidden_by_user_ban BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE marketplace_listings
    ADD COLUMN IF NOT EXISTS hidden_by_user_ban BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_ban_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    duration_code VARCHAR(30) NOT NULL,
    duration_label VARCHAR(80) NOT NULL,
    banned_until TIMESTAMP NULL,
    is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_user_ban_history_user_id
    ON user_ban_history(user_id);

CREATE INDEX IF NOT EXISTS idx_user_ban_history_created_at
    ON user_ban_history(created_at DESC);
