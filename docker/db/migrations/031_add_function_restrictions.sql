ALTER TABLE users
    ADD COLUMN IF NOT EXISTS community_blocked_until TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS community_block_reason TEXT NULL,
    ADD COLUMN IF NOT EXISTS community_block_is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS community_blocked_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS marketplace_blocked_until TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS marketplace_block_reason TEXT NULL,
    ADD COLUMN IF NOT EXISTS marketplace_block_is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS marketplace_blocked_at TIMESTAMP NULL;

ALTER TABLE community_posts
    ADD COLUMN IF NOT EXISTS hidden_by_community_block BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE community_comments
    ADD COLUMN IF NOT EXISTS hidden_by_community_block BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE marketplace_listings
    ADD COLUMN IF NOT EXISTS hidden_by_marketplace_block BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_community_block_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    duration_code VARCHAR(32) NOT NULL,
    duration_label VARCHAR(64) NOT NULL,
    blocked_until TIMESTAMP NULL,
    is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_marketplace_block_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    duration_code VARCHAR(32) NOT NULL,
    duration_label VARCHAR(64) NOT NULL,
    blocked_until TIMESTAMP NULL,
    is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_community_block_history_user_created
    ON user_community_block_history (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_marketplace_block_history_user_created
    ON user_marketplace_block_history (user_id, created_at DESC, id DESC);
