ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS app_distance_unit VARCHAR(10) NOT NULL DEFAULT 'km'
        CHECK (app_distance_unit IN ('km', 'mi'));

ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS app_consumption_format VARCHAR(20) NOT NULL DEFAULT 'l_100km'
        CHECK (app_consumption_format IN ('l_100km', 'km_l'));
