CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(255) NOT NULL,
    target_path VARCHAR(255) NOT NULL,
    payload_json JSONB,
    event_key VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created_at
    ON user_notifications(user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_is_read
    ON user_notifications(user_id, is_read);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_notifications_event_key
    ON user_notifications(event_key)
    WHERE event_key IS NOT NULL;
