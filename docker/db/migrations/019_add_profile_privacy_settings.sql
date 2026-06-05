ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS privacy_full_name_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy_full_name_visibility IN ('public', 'private')),
    ADD COLUMN IF NOT EXISTS privacy_membership_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy_membership_visibility IN ('public', 'private')),
    ADD COLUMN IF NOT EXISTS privacy_profile_posts_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy_profile_posts_visibility IN ('public', 'private')),
    ADD COLUMN IF NOT EXISTS privacy_profile_listings_visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy_profile_listings_visibility IN ('public', 'private'));
