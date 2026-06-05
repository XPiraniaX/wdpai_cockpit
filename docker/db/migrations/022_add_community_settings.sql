ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS community_default_scope VARCHAR(20) NOT NULL DEFAULT 'all'
        CHECK (community_default_scope IN ('all', 'liked', 'saved', 'commented'));
