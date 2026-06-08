CREATE TABLE IF NOT EXISTS admin_removed_posts (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_excerpt TEXT NOT NULL,
    removed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_removed_posts_user_id
    ON admin_removed_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_removed_posts_removed_at
    ON admin_removed_posts(removed_at DESC);

CREATE TABLE IF NOT EXISTS admin_removed_listings (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_title TEXT NOT NULL,
    removed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_removed_listings_user_id
    ON admin_removed_listings(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_removed_listings_removed_at
    ON admin_removed_listings(removed_at DESC);
