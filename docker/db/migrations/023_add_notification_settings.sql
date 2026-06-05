ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS notification_profile_membership BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notification_post_likes BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notification_post_comments BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notification_marketplace_activity BOOLEAN NOT NULL DEFAULT TRUE;
