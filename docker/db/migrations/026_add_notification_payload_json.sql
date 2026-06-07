ALTER TABLE user_notifications
    ADD COLUMN IF NOT EXISTS payload_json JSONB;
