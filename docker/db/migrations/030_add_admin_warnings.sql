ALTER TABLE users
    ADD COLUMN IF NOT EXISTS admin_warning_message TEXT,
    ADD COLUMN IF NOT EXISTS admin_warning_sent_at TIMESTAMP;
