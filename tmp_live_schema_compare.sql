SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE FUNCTION public.calculate_vehicle_average_consumption(p_vehicle_id integer) RETURNS numeric
    LANGUAGE sql STABLE
    AS $$
    SELECT ROUND(AVG(consumption_l_100km)::numeric, 1)
    FROM (
        SELECT
            CASE
                WHEN previous_mileage_km IS NULL THEN NULL
                WHEN mileage_km <= previous_mileage_km THEN NULL
                ELSE (liters / NULLIF(mileage_km - previous_mileage_km, 0)) * 100
            END AS consumption_l_100km
        FROM (
            SELECT
                mileage_km,
                liters,
                LAG(mileage_km) OVER (ORDER BY fueled_at, id) AS previous_mileage_km
            FROM fuel_logs
            WHERE vehicle_id = p_vehicle_id
        ) AS ordered_fuel_logs
    ) AS consumption_samples;
$$;
CREATE FUNCTION public.sync_vehicle_mileage_from_fuel_logs() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE vehicles
    SET current_mileage_km = GREATEST(current_mileage_km, NEW.mileage_km)
    WHERE id = NEW.vehicle_id;
    RETURN NEW;
END;
$$;
SET default_tablespace = '';
SET default_table_access_method = heap;
CREATE TABLE public.admin_removed_listings (
    id integer NOT NULL,
    listing_id integer NOT NULL,
    user_id integer NOT NULL,
    listing_title text NOT NULL,
    removed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.admin_removed_listings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.admin_removed_listings_id_seq OWNED BY public.admin_removed_listings.id;
CREATE TABLE public.admin_removed_posts (
    id integer NOT NULL,
    post_id integer NOT NULL,
    user_id integer NOT NULL,
    post_excerpt text NOT NULL,
    removed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.admin_removed_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.admin_removed_posts_id_seq OWNED BY public.admin_removed_posts.id;
CREATE TABLE public.admin_user_notices (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notice_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    acknowledged_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.admin_user_notices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.admin_user_notices_id_seq OWNED BY public.admin_user_notices.id;
CREATE TABLE public.auth_login_attempts (
    id integer NOT NULL,
    login_identifier character varying(255) NOT NULL,
    ip_address character varying(64) NOT NULL,
    user_agent text,
    attempted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    was_successful boolean DEFAULT false NOT NULL
);
CREATE SEQUENCE public.auth_login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.auth_login_attempts_id_seq OWNED BY public.auth_login_attempts.id;
CREATE TABLE public.car_brands (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_approved boolean DEFAULT true NOT NULL
);
CREATE SEQUENCE public.car_brands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.car_brands_id_seq OWNED BY public.car_brands.id;
CREATE TABLE public.car_models (
    id integer NOT NULL,
    brand_id integer NOT NULL,
    name character varying(100) NOT NULL,
    is_approved boolean DEFAULT true NOT NULL
);
CREATE SEQUENCE public.car_models_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.car_models_id_seq OWNED BY public.car_models.id;
CREATE TABLE public.community_comments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    hidden_by_user_ban boolean DEFAULT false NOT NULL,
    hidden_by_community_block boolean DEFAULT false NOT NULL
);
CREATE SEQUENCE public.community_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.community_comments_id_seq OWNED BY public.community_comments.id;
CREATE TABLE public.community_post_images (
    id integer NOT NULL,
    post_id integer NOT NULL,
    image_path character varying(255) NOT NULL,
    display_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT community_post_images_display_order_check CHECK ((display_order >= 1))
);
CREATE SEQUENCE public.community_post_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.community_post_images_id_seq OWNED BY public.community_post_images.id;
CREATE TABLE public.community_post_likes (
    post_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.community_post_saves (
    post_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.community_posts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    brand_id integer,
    model_id integer,
    content text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    hidden_by_user_ban boolean DEFAULT false NOT NULL,
    hidden_by_community_block boolean DEFAULT false NOT NULL,
    CONSTRAINT community_posts_check CHECK (((model_id IS NULL) OR (brand_id IS NOT NULL)))
);
CREATE SEQUENCE public.community_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.community_posts_id_seq OWNED BY public.community_posts.id;
CREATE TABLE public.content_reports (
    id integer NOT NULL,
    reporter_user_id integer NOT NULL,
    reported_user_id integer NOT NULL,
    content_type character varying(20) NOT NULL,
    content_id integer NOT NULL,
    reported_subject text NOT NULL,
    reason_code character varying(80) NOT NULL,
    reason_label character varying(180) NOT NULL,
    reason_text text,
    target_path text NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at timestamp with time zone,
    closed_by_admin_id integer,
    CONSTRAINT content_reports_content_type_check CHECK (((content_type)::text = ANY ((ARRAY['listing'::character varying, 'post'::character varying, 'comment'::character varying, 'profile'::character varying])::text[]))),
    CONSTRAINT content_reports_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::text[])))
);
CREATE SEQUENCE public.content_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.content_reports_id_seq OWNED BY public.content_reports.id;
CREATE TABLE public.fuel_logs (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    fueled_at timestamp with time zone NOT NULL,
    mileage_km integer NOT NULL,
    liters numeric(8,2) NOT NULL,
    total_cost numeric(10,2) NOT NULL,
    fuel_type character varying(30) NOT NULL,
    CONSTRAINT fuel_logs_fuel_type_check CHECK (((fuel_type)::text = ANY ((ARRAY['petrol'::character varying, 'diesel'::character varying, 'premium_petrol'::character varying, 'premium_diesel'::character varying, 'lpg'::character varying, 'cng'::character varying, 'electric'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT fuel_logs_fueled_at_check CHECK ((fueled_at IS NOT NULL)),
    CONSTRAINT fuel_logs_liters_check CHECK ((liters > (0)::numeric)),
    CONSTRAINT fuel_logs_mileage_km_check CHECK ((mileage_km >= 0)),
    CONSTRAINT fuel_logs_total_cost_check CHECK ((total_cost >= (0)::numeric))
);
CREATE SEQUENCE public.fuel_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.fuel_logs_id_seq OWNED BY public.fuel_logs.id;
CREATE TABLE public.insurance_policies (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    insurer_name character varying(255) NOT NULL,
    policy_number character varying(100),
    purchased_on date NOT NULL,
    valid_until date NOT NULL,
    CONSTRAINT insurance_policies_check CHECK ((valid_until >= purchased_on))
);
CREATE SEQUENCE public.insurance_policies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.insurance_policies_id_seq OWNED BY public.insurance_policies.id;
CREATE TABLE public.maintenance_tasks (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    estimated_cost_amount numeric(10,2),
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT maintenance_tasks_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'done'::character varying])::text[])))
);
CREATE SEQUENCE public.maintenance_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.maintenance_tasks_id_seq OWNED BY public.maintenance_tasks.id;
CREATE TABLE public.marketplace_listing_images (
    id integer NOT NULL,
    listing_id integer NOT NULL,
    image_path text NOT NULL,
    display_order integer DEFAULT 1 NOT NULL,
    CONSTRAINT marketplace_listing_images_display_order_check CHECK ((display_order >= 1))
);
CREATE SEQUENCE public.marketplace_listing_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.marketplace_listing_images_id_seq OWNED BY public.marketplace_listing_images.id;
CREATE TABLE public.marketplace_listing_saves (
    listing_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE public.marketplace_listings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    brand_id integer NOT NULL,
    model_id integer NOT NULL,
    title character varying(180) NOT NULL,
    trim_name character varying(150),
    description text NOT NULL,
    price_amount numeric(12,2) NOT NULL,
    production_year smallint NOT NULL,
    mileage_km integer NOT NULL,
    fuel_type character varying(30),
    transmission character varying(30),
    body_type character varying(50),
    drivetrain character varying(50),
    engine_capacity_cc integer,
    power_hp integer,
    exterior_color character varying(50),
    city character varying(100) NOT NULL,
    contact_name character varying(150) NOT NULL,
    contact_phone character varying(50) NOT NULL,
    contact_email character varying(255) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    steering_side character varying(10),
    technical_condition character varying(20),
    hidden_by_user_ban boolean DEFAULT false NOT NULL,
    hidden_by_marketplace_block boolean DEFAULT false NOT NULL,
    CONSTRAINT marketplace_listings_engine_capacity_cc_check CHECK ((engine_capacity_cc > 0)),
    CONSTRAINT marketplace_listings_fuel_type_check CHECK (((fuel_type)::text = ANY ((ARRAY['petrol'::character varying, 'diesel'::character varying, 'hybrid'::character varying, 'plug_in_hybrid'::character varying, 'electric'::character varying, 'lpg'::character varying, 'cng'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT marketplace_listings_mileage_km_check CHECK ((mileage_km >= 0)),
    CONSTRAINT marketplace_listings_power_hp_check CHECK ((power_hp > 0)),
    CONSTRAINT marketplace_listings_price_amount_check CHECK ((price_amount >= (0)::numeric)),
    CONSTRAINT marketplace_listings_production_year_check CHECK (((production_year >= 1886) AND (production_year <= 2100))),
    CONSTRAINT marketplace_listings_steering_side_check CHECK (((steering_side)::text = ANY ((ARRAY['left'::character varying, 'right'::character varying])::text[]))),
    CONSTRAINT marketplace_listings_technical_condition_check CHECK (((technical_condition)::text = ANY ((ARRAY['undamaged'::character varying, 'damaged'::character varying])::text[]))),
    CONSTRAINT marketplace_listings_transmission_check CHECK (((transmission)::text = ANY ((ARRAY['manual'::character varying, 'automatic'::character varying, 'semi_automatic'::character varying])::text[])))
);
CREATE SEQUENCE public.marketplace_listings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.marketplace_listings_id_seq OWNED BY public.marketplace_listings.id;
CREATE TABLE public.service_records (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    title character varying(255) NOT NULL,
    service_date date NOT NULL,
    description text,
    cost_amount numeric(10,2)
);
CREATE SEQUENCE public.service_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.service_records_id_seq OWNED BY public.service_records.id;
CREATE TABLE public.technical_inspections (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    inspection_date date NOT NULL,
    valid_until date NOT NULL,
    result character varying(20) DEFAULT 'passed'::character varying NOT NULL,
    CONSTRAINT technical_inspections_check CHECK ((valid_until >= inspection_date)),
    CONSTRAINT technical_inspections_result_check CHECK (((result)::text = ANY ((ARRAY['passed'::character varying, 'failed'::character varying, 'conditional'::character varying])::text[])))
);
CREATE SEQUENCE public.technical_inspections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.technical_inspections_id_seq OWNED BY public.technical_inspections.id;
CREATE TABLE public.user_ban_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    reason text NOT NULL,
    duration_code character varying(30) NOT NULL,
    duration_label character varying(80) NOT NULL,
    banned_until timestamp without time zone,
    is_permanent boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revoked_at timestamp without time zone
);
CREATE SEQUENCE public.user_ban_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_ban_history_id_seq OWNED BY public.user_ban_history.id;
CREATE TABLE public.user_community_block_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    reason text NOT NULL,
    duration_code character varying(32) NOT NULL,
    duration_label character varying(64) NOT NULL,
    blocked_until timestamp without time zone,
    is_permanent boolean DEFAULT false NOT NULL,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.user_community_block_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_community_block_history_id_seq OWNED BY public.user_community_block_history.id;
CREATE TABLE public.user_marketplace_block_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    reason text NOT NULL,
    duration_code character varying(32) NOT NULL,
    duration_label character varying(64) NOT NULL,
    blocked_until timestamp without time zone,
    is_permanent boolean DEFAULT false NOT NULL,
    revoked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE SEQUENCE public.user_marketplace_block_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_marketplace_block_history_id_seq OWNED BY public.user_marketplace_block_history.id;
CREATE TABLE public.user_notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(64) NOT NULL,
    title character varying(160) NOT NULL,
    message character varying(255) NOT NULL,
    target_path character varying(255) NOT NULL,
    event_key character varying(255),
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    payload_json jsonb
);
CREATE SEQUENCE public.user_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_notifications_id_seq OWNED BY public.user_notifications.id;
CREATE TABLE public.user_settings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    email_notifications boolean DEFAULT true NOT NULL,
    push_notifications boolean DEFAULT false NOT NULL,
    maintenance_reminders boolean DEFAULT true NOT NULL,
    inspection_reminders boolean DEFAULT true NOT NULL,
    insurance_reminders boolean DEFAULT true NOT NULL,
    privacy_profile_visibility character varying(20) DEFAULT 'private'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    privacy_full_name_visibility character varying(20) DEFAULT 'public'::character varying NOT NULL,
    privacy_membership_visibility character varying(20) DEFAULT 'public'::character varying NOT NULL,
    privacy_profile_posts_visibility character varying(20) DEFAULT 'public'::character varying NOT NULL,
    privacy_profile_listings_visibility character varying(20) DEFAULT 'public'::character varying NOT NULL,
    app_distance_unit character varying(10) DEFAULT 'km'::character varying NOT NULL,
    app_consumption_format character varying(20) DEFAULT 'l_100km'::character varying NOT NULL,
    marketplace_default_scope character varying(20) DEFAULT 'all'::character varying NOT NULL,
    marketplace_default_sort character varying(20) DEFAULT 'newest'::character varying NOT NULL,
    marketplace_preferred_contact_channel character varying(20) DEFAULT 'both'::character varying NOT NULL,
    community_default_scope character varying(20) DEFAULT 'all'::character varying NOT NULL,
    notification_profile_membership boolean DEFAULT true NOT NULL,
    notification_post_likes boolean DEFAULT true NOT NULL,
    notification_post_comments boolean DEFAULT true NOT NULL,
    notification_marketplace_activity boolean DEFAULT true NOT NULL,
    CONSTRAINT user_settings_app_consumption_format_check CHECK (((app_consumption_format)::text = ANY ((ARRAY['l_100km'::character varying, 'km_l'::character varying])::text[]))),
    CONSTRAINT user_settings_app_distance_unit_check CHECK (((app_distance_unit)::text = ANY ((ARRAY['km'::character varying, 'mi'::character varying])::text[]))),
    CONSTRAINT user_settings_community_default_scope_check CHECK (((community_default_scope)::text = ANY ((ARRAY['all'::character varying, 'liked'::character varying, 'saved'::character varying, 'commented'::character varying])::text[]))),
    CONSTRAINT user_settings_marketplace_default_scope_check CHECK (((marketplace_default_scope)::text = ANY ((ARRAY['all'::character varying, 'saved'::character varying])::text[]))),
    CONSTRAINT user_settings_marketplace_default_sort_check CHECK (((marketplace_default_sort)::text = ANY ((ARRAY['newest'::character varying, 'price_asc'::character varying, 'price_desc'::character varying, 'year_desc'::character varying, 'mileage_asc'::character varying])::text[]))),
    CONSTRAINT user_settings_marketplace_preferred_contact_channel_check CHECK (((marketplace_preferred_contact_channel)::text = ANY ((ARRAY['both'::character varying, 'phone'::character varying, 'email'::character varying])::text[]))),
    CONSTRAINT user_settings_privacy_full_name_visibility_check CHECK (((privacy_full_name_visibility)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying])::text[]))),
    CONSTRAINT user_settings_privacy_membership_visibility_check CHECK (((privacy_membership_visibility)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying])::text[]))),
    CONSTRAINT user_settings_privacy_profile_listings_visibility_check CHECK (((privacy_profile_listings_visibility)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying])::text[]))),
    CONSTRAINT user_settings_privacy_profile_posts_visibility_check CHECK (((privacy_profile_posts_visibility)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying])::text[]))),
    CONSTRAINT user_settings_privacy_profile_visibility_check CHECK (((privacy_profile_visibility)::text = ANY ((ARRAY['private'::character varying, 'friends'::character varying, 'public'::character varying])::text[])))
);
CREATE SEQUENCE public.user_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_settings_id_seq OWNED BY public.user_settings.id;
CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password text NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    membership_tier character varying(20) DEFAULT 'free'::character varying NOT NULL,
    avatar_path text,
    timezone character varying(64) DEFAULT 'Europe/Warsaw'::character varying NOT NULL,
    locale character varying(10) DEFAULT 'pl_PL'::character varying NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    pseudonym character varying(80),
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    blocked_until timestamp without time zone,
    blocked_reason text,
    blocked_is_permanent boolean DEFAULT false NOT NULL,
    blocked_at timestamp without time zone,
    admin_warning_message text,
    admin_warning_sent_at timestamp without time zone,
    community_blocked_until timestamp without time zone,
    community_block_reason text,
    community_block_is_permanent boolean DEFAULT false NOT NULL,
    community_blocked_at timestamp without time zone,
    marketplace_blocked_until timestamp without time zone,
    marketplace_block_reason text,
    marketplace_block_is_permanent boolean DEFAULT false NOT NULL,
    marketplace_blocked_at timestamp without time zone,
    CONSTRAINT users_membership_tier_check CHECK (((membership_tier)::text = ANY ((ARRAY['free'::character varying, 'pro'::character varying, 'business'::character varying])::text[]))),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
CREATE TABLE public.vehicle_images (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    image_path text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 1 NOT NULL
);
CREATE SEQUENCE public.vehicle_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.vehicle_images_id_seq OWNED BY public.vehicle_images.id;
CREATE TABLE public.vehicles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    brand_id integer NOT NULL,
    model_id integer NOT NULL,
    display_name character varying(150) NOT NULL,
    trim_name character varying(150),
    production_year smallint NOT NULL,
    vin character(17),
    license_plate character varying(20),
    body_type character varying(50),
    drivetrain character varying(50),
    fuel_type character varying(30) NOT NULL,
    transmission character varying(30),
    engine_capacity_cc integer,
    power_hp integer,
    power_nm integer,
    is_factory_power boolean,
    engine_mount character varying(100),
    aspiration character varying(100),
    cylinder_count smallint,
    cylinder_layout character varying(50),
    seat_count smallint,
    length_mm integer,
    width_mm integer,
    height_mm integer,
    wheel_size_label character varying(50),
    tire_size_label character varying(50),
    front_brake_type character varying(100),
    rear_brake_type character varying(100),
    current_mileage_km integer DEFAULT 0 NOT NULL,
    exterior_color character varying(50),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    notes text,
    approval_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approval_submitted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    approval_rejected_at timestamp with time zone,
    approval_rejection_reason text,
    approval_rejection_fields_json jsonb,
    approval_correction_due_at timestamp with time zone,
    approval_reviewed_at timestamp with time zone,
    approval_rejection_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT vehicles_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[]))),
    CONSTRAINT vehicles_current_mileage_km_check CHECK ((current_mileage_km >= 0)),
    CONSTRAINT vehicles_cylinder_count_check CHECK ((cylinder_count > 0)),
    CONSTRAINT vehicles_engine_capacity_cc_check CHECK ((engine_capacity_cc > 0)),
    CONSTRAINT vehicles_fuel_type_check CHECK (((fuel_type)::text = ANY ((ARRAY['petrol'::character varying, 'diesel'::character varying, 'hybrid'::character varying, 'plug_in_hybrid'::character varying, 'electric'::character varying, 'lpg'::character varying, 'cng'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT vehicles_height_mm_check CHECK ((height_mm > 0)),
    CONSTRAINT vehicles_length_mm_check CHECK ((length_mm > 0)),
    CONSTRAINT vehicles_power_hp_check CHECK ((power_hp > 0)),
    CONSTRAINT vehicles_power_nm_check CHECK ((power_nm > 0)),
    CONSTRAINT vehicles_production_year_check CHECK (((production_year >= 1886) AND (production_year <= 2100))),
    CONSTRAINT vehicles_seat_count_check CHECK ((seat_count > 0)),
    CONSTRAINT vehicles_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'sold'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT vehicles_transmission_check CHECK (((transmission)::text = ANY ((ARRAY['manual'::character varying, 'automatic'::character varying, 'semi_automatic'::character varying])::text[]))),
    CONSTRAINT vehicles_width_mm_check CHECK ((width_mm > 0))
);
CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;
CREATE VIEW public.vw_community_feed AS
 SELECT p.id,
    p.user_id,
    p.brand_id,
    p.model_id,
    p.content,
    p.created_at,
    p.updated_at,
    p.is_active,
    u.username,
    u.first_name,
    u.last_name,
    u.pseudonym,
    u.avatar_path,
    concat(u.first_name, ' ', u.last_name) AS full_name,
    u.membership_tier,
    cb.name AS brand_name,
    cm.name AS model_name,
    COALESCE(likes.like_count, 0) AS like_count,
    COALESCE(saves.save_count, 0) AS save_count,
    COALESCE(comments.comment_count, 0) AS comment_count
   FROM ((((((public.community_posts p
     JOIN public.users u ON ((u.id = p.user_id)))
     LEFT JOIN public.car_brands cb ON ((cb.id = p.brand_id)))
     LEFT JOIN public.car_models cm ON ((cm.id = p.model_id)))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS like_count
           FROM public.community_post_likes l
          WHERE (l.post_id = p.id)) likes ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS save_count
           FROM public.community_post_saves s
          WHERE (s.post_id = p.id)) saves ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS comment_count
           FROM public.community_comments c
          WHERE ((c.post_id = p.id) AND (c.is_active = true))) comments ON (true))
  WHERE (p.is_active = true);
CREATE VIEW public.vw_marketplace_feed AS
 SELECT l.id,
    l.user_id,
    l.brand_id,
    l.model_id,
    l.title,
    l.trim_name,
    l.description,
    l.price_amount,
    l.production_year,
    l.mileage_km,
    l.fuel_type,
    l.transmission,
    l.body_type,
    l.drivetrain,
    l.engine_capacity_cc,
    l.power_hp,
    l.exterior_color,
    l.city,
    l.contact_name,
    l.contact_phone,
    l.contact_email,
    l.created_at,
    l.updated_at,
    u.username,
    u.pseudonym,
    u.avatar_path,
    concat(u.first_name, ' ', u.last_name) AS full_name,
    u.membership_tier,
    COALESCE(us.marketplace_preferred_contact_channel, 'both'::character varying) AS preferred_contact_channel,
    cb.name AS brand_name,
    cm.name AS model_name,
    COALESCE(saved.save_count, 0) AS save_count,
    l.steering_side,
    l.technical_condition
   FROM (((((public.marketplace_listings l
     JOIN public.users u ON ((u.id = l.user_id)))
     LEFT JOIN public.user_settings us ON ((us.user_id = u.id)))
     JOIN public.car_brands cb ON ((cb.id = l.brand_id)))
     JOIN public.car_models cm ON ((cm.id = l.model_id)))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS save_count
           FROM public.marketplace_listing_saves s
          WHERE (s.listing_id = l.id)) saved ON (true))
  WHERE (l.is_active = true);
CREATE VIEW public.vw_vehicle_overview AS
 SELECT v.id,
    v.user_id,
    v.brand_id,
    v.model_id,
    cb.name AS brand_name,
    cm.name AS model_name,
    v.display_name,
    v.trim_name,
    v.production_year,
    v.current_mileage_km,
    v.fuel_type,
    v.transmission,
    v.body_type,
    v.drivetrain,
    v.exterior_color,
    v.notes,
    v.power_hp,
    v.engine_capacity_cc,
    v.power_nm,
    v.is_factory_power,
    v.engine_mount,
    v.aspiration,
    v.cylinder_count,
    v.cylinder_layout,
    v.seat_count,
    v.length_mm,
    v.width_mm,
    v.height_mm,
    v.wheel_size_label,
    v.tire_size_label,
    v.front_brake_type,
    v.rear_brake_type,
    v.vin,
    v.license_plate,
    v.status,
    v.display_order,
    v.is_primary,
    v.approval_status,
    v.approval_submitted_at,
    v.approval_rejected_at,
    v.approval_rejection_reason,
    v.approval_rejection_fields_json,
    v.approval_correction_due_at,
    v.approval_reviewed_at,
    primary_image.image_path,
    latest_inspection.inspection_date,
    latest_inspection.valid_until AS next_inspection_date,
    latest_inspection.result AS inspection_result,
    latest_insurance.purchased_on,
    latest_insurance.valid_until AS next_insurance_date,
    latest_insurance.insurer_name,
    latest_insurance.policy_number,
    latest_fuel.fueled_at AS last_fuel_at,
    latest_fuel.total_cost AS last_fuel_cost,
    public.calculate_vehicle_average_consumption(v.id) AS average_consumption_l_100km
   FROM ((((((public.vehicles v
     JOIN public.car_brands cb ON ((cb.id = v.brand_id)))
     LEFT JOIN public.car_models cm ON ((cm.id = v.model_id)))
     LEFT JOIN LATERAL ( SELECT vi.image_path
           FROM public.vehicle_images vi
          WHERE ((vi.vehicle_id = v.id) AND (vi.is_primary = true))
          ORDER BY vi.display_order, vi.id
         LIMIT 1) primary_image ON (true))
     LEFT JOIN LATERAL ( SELECT ti.inspection_date,
            ti.valid_until,
            ti.result
           FROM public.technical_inspections ti
          WHERE (ti.vehicle_id = v.id)
          ORDER BY ti.id DESC
         LIMIT 1) latest_inspection ON (true))
     LEFT JOIN LATERAL ( SELECT ip.purchased_on,
            ip.valid_until,
            ip.insurer_name,
            ip.policy_number
           FROM public.insurance_policies ip
          WHERE (ip.vehicle_id = v.id)
          ORDER BY ip.id DESC
         LIMIT 1) latest_insurance ON (true))
     LEFT JOIN LATERAL ( SELECT fl.fueled_at,
            fl.total_cost
           FROM public.fuel_logs fl
          WHERE (fl.vehicle_id = v.id)
          ORDER BY fl.fueled_at DESC, fl.id DESC
         LIMIT 1) latest_fuel ON (true));
ALTER TABLE ONLY public.admin_removed_listings ALTER COLUMN id SET DEFAULT nextval('public.admin_removed_listings_id_seq'::regclass);
ALTER TABLE ONLY public.admin_removed_posts ALTER COLUMN id SET DEFAULT nextval('public.admin_removed_posts_id_seq'::regclass);
ALTER TABLE ONLY public.admin_user_notices ALTER COLUMN id SET DEFAULT nextval('public.admin_user_notices_id_seq'::regclass);
ALTER TABLE ONLY public.auth_login_attempts ALTER COLUMN id SET DEFAULT nextval('public.auth_login_attempts_id_seq'::regclass);
ALTER TABLE ONLY public.car_brands ALTER COLUMN id SET DEFAULT nextval('public.car_brands_id_seq'::regclass);
ALTER TABLE ONLY public.car_models ALTER COLUMN id SET DEFAULT nextval('public.car_models_id_seq'::regclass);
ALTER TABLE ONLY public.community_comments ALTER COLUMN id SET DEFAULT nextval('public.community_comments_id_seq'::regclass);
ALTER TABLE ONLY public.community_post_images ALTER COLUMN id SET DEFAULT nextval('public.community_post_images_id_seq'::regclass);
ALTER TABLE ONLY public.community_posts ALTER COLUMN id SET DEFAULT nextval('public.community_posts_id_seq'::regclass);
ALTER TABLE ONLY public.content_reports ALTER COLUMN id SET DEFAULT nextval('public.content_reports_id_seq'::regclass);
ALTER TABLE ONLY public.fuel_logs ALTER COLUMN id SET DEFAULT nextval('public.fuel_logs_id_seq'::regclass);
ALTER TABLE ONLY public.insurance_policies ALTER COLUMN id SET DEFAULT nextval('public.insurance_policies_id_seq'::regclass);
ALTER TABLE ONLY public.maintenance_tasks ALTER COLUMN id SET DEFAULT nextval('public.maintenance_tasks_id_seq'::regclass);
ALTER TABLE ONLY public.marketplace_listing_images ALTER COLUMN id SET DEFAULT nextval('public.marketplace_listing_images_id_seq'::regclass);
ALTER TABLE ONLY public.marketplace_listings ALTER COLUMN id SET DEFAULT nextval('public.marketplace_listings_id_seq'::regclass);
ALTER TABLE ONLY public.service_records ALTER COLUMN id SET DEFAULT nextval('public.service_records_id_seq'::regclass);
ALTER TABLE ONLY public.technical_inspections ALTER COLUMN id SET DEFAULT nextval('public.technical_inspections_id_seq'::regclass);
ALTER TABLE ONLY public.user_ban_history ALTER COLUMN id SET DEFAULT nextval('public.user_ban_history_id_seq'::regclass);
ALTER TABLE ONLY public.user_community_block_history ALTER COLUMN id SET DEFAULT nextval('public.user_community_block_history_id_seq'::regclass);
ALTER TABLE ONLY public.user_marketplace_block_history ALTER COLUMN id SET DEFAULT nextval('public.user_marketplace_block_history_id_seq'::regclass);
ALTER TABLE ONLY public.user_notifications ALTER COLUMN id SET DEFAULT nextval('public.user_notifications_id_seq'::regclass);
ALTER TABLE ONLY public.user_settings ALTER COLUMN id SET DEFAULT nextval('public.user_settings_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.vehicle_images ALTER COLUMN id SET DEFAULT nextval('public.vehicle_images_id_seq'::regclass);
ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);
ALTER TABLE ONLY public.admin_removed_listings
    ADD CONSTRAINT admin_removed_listings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admin_removed_posts
    ADD CONSTRAINT admin_removed_posts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admin_user_notices
    ADD CONSTRAINT admin_user_notices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_login_attempts
    ADD CONSTRAINT auth_login_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.car_brands
    ADD CONSTRAINT car_brands_name_key UNIQUE (name);
ALTER TABLE ONLY public.car_brands
    ADD CONSTRAINT car_brands_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.car_models
    ADD CONSTRAINT car_models_brand_id_name_key UNIQUE (brand_id, name);
ALTER TABLE ONLY public.car_models
    ADD CONSTRAINT car_models_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.community_post_images
    ADD CONSTRAINT community_post_images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT community_post_likes_pkey PRIMARY KEY (post_id, user_id);
ALTER TABLE ONLY public.community_post_saves
    ADD CONSTRAINT community_post_saves_pkey PRIMARY KEY (post_id, user_id);
ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.marketplace_listing_images
    ADD CONSTRAINT marketplace_listing_images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.marketplace_listing_saves
    ADD CONSTRAINT marketplace_listing_saves_pkey PRIMARY KEY (listing_id, user_id);
ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.service_records
    ADD CONSTRAINT service_records_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.technical_inspections
    ADD CONSTRAINT technical_inspections_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_ban_history
    ADD CONSTRAINT user_ban_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_community_block_history
    ADD CONSTRAINT user_community_block_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_marketplace_block_history
    ADD CONSTRAINT user_marketplace_block_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);
ALTER TABLE ONLY public.vehicle_images
    ADD CONSTRAINT vehicle_images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_vin_key UNIQUE (vin);
CREATE INDEX idx_admin_removed_listings_removed_at ON public.admin_removed_listings USING btree (removed_at DESC);
CREATE INDEX idx_admin_removed_listings_user_id ON public.admin_removed_listings USING btree (user_id);
CREATE INDEX idx_admin_removed_posts_removed_at ON public.admin_removed_posts USING btree (removed_at DESC);
CREATE INDEX idx_admin_removed_posts_user_id ON public.admin_removed_posts USING btree (user_id);
CREATE INDEX idx_admin_user_notices_user_pending ON public.admin_user_notices USING btree (user_id, acknowledged_at, created_at, id);
CREATE INDEX idx_auth_login_attempts_attempted_at ON public.auth_login_attempts USING btree (attempted_at DESC);
CREATE INDEX idx_auth_login_attempts_identifier_attempted_at ON public.auth_login_attempts USING btree (login_identifier, attempted_at DESC);
CREATE INDEX idx_car_models_brand_id ON public.car_models USING btree (brand_id);
CREATE INDEX idx_community_comments_post_id ON public.community_comments USING btree (post_id, created_at);
CREATE INDEX idx_community_comments_user_id ON public.community_comments USING btree (user_id);
CREATE INDEX idx_community_post_images_post_id ON public.community_post_images USING btree (post_id, display_order, id);
CREATE INDEX idx_community_post_likes_user_id ON public.community_post_likes USING btree (user_id);
CREATE INDEX idx_community_post_saves_user_id ON public.community_post_saves USING btree (user_id);
CREATE INDEX idx_community_posts_brand_id ON public.community_posts USING btree (brand_id);
CREATE INDEX idx_community_posts_created_at ON public.community_posts USING btree (created_at DESC);
CREATE INDEX idx_community_posts_model_id ON public.community_posts USING btree (model_id);
CREATE INDEX idx_community_posts_user_id ON public.community_posts USING btree (user_id);
CREATE INDEX idx_content_reports_content ON public.content_reports USING btree (content_type, content_id);
CREATE INDEX idx_content_reports_reported_user_id ON public.content_reports USING btree (reported_user_id);
CREATE INDEX idx_content_reports_status_created_at ON public.content_reports USING btree (status, created_at, id);
CREATE INDEX idx_fuel_logs_vehicle_fueled_at ON public.fuel_logs USING btree (vehicle_id, fueled_at DESC);
CREATE INDEX idx_insurance_policies_vehicle_valid_until ON public.insurance_policies USING btree (vehicle_id, valid_until);
CREATE INDEX idx_maintenance_tasks_vehicle_status ON public.maintenance_tasks USING btree (vehicle_id, status);
CREATE INDEX idx_marketplace_listing_images_listing_id ON public.marketplace_listing_images USING btree (listing_id, display_order, id);
CREATE INDEX idx_marketplace_listing_saves_user_id ON public.marketplace_listing_saves USING btree (user_id);
CREATE INDEX idx_marketplace_listings_brand_model ON public.marketplace_listings USING btree (brand_id, model_id);
CREATE INDEX idx_marketplace_listings_created_at ON public.marketplace_listings USING btree (created_at DESC, id DESC);
CREATE INDEX idx_marketplace_listings_price ON public.marketplace_listings USING btree (price_amount);
CREATE INDEX idx_marketplace_listings_user_id ON public.marketplace_listings USING btree (user_id);
CREATE INDEX idx_service_records_vehicle_service_date ON public.service_records USING btree (vehicle_id, service_date DESC);
CREATE INDEX idx_technical_inspections_vehicle_valid_until ON public.technical_inspections USING btree (vehicle_id, valid_until);
CREATE INDEX idx_user_ban_history_created_at ON public.user_ban_history USING btree (created_at DESC);
CREATE INDEX idx_user_ban_history_user_id ON public.user_ban_history USING btree (user_id);
CREATE INDEX idx_user_community_block_history_user_created ON public.user_community_block_history USING btree (user_id, created_at DESC, id DESC);
CREATE INDEX idx_user_marketplace_block_history_user_created ON public.user_marketplace_block_history USING btree (user_id, created_at DESC, id DESC);
CREATE INDEX idx_user_notifications_user_created_at ON public.user_notifications USING btree (user_id, created_at DESC, id DESC);
CREATE INDEX idx_user_notifications_user_is_read ON public.user_notifications USING btree (user_id, is_read);
CREATE INDEX idx_vehicles_approval_status_submitted_at ON public.vehicles USING btree (approval_status, approval_submitted_at, id);
CREATE INDEX idx_vehicles_status ON public.vehicles USING btree (status);
CREATE INDEX idx_vehicles_user_display_order ON public.vehicles USING btree (user_id, display_order);
CREATE INDEX idx_vehicles_user_id ON public.vehicles USING btree (user_id);
CREATE UNIQUE INDEX uq_insurance_per_vehicle ON public.insurance_policies USING btree (vehicle_id);
CREATE UNIQUE INDEX uq_user_notifications_event_key ON public.user_notifications USING btree (event_key) WHERE (event_key IS NOT NULL);
CREATE UNIQUE INDEX uq_users_pseudonym_ci ON public.users USING btree (lower((pseudonym)::text)) WHERE (pseudonym IS NOT NULL);
CREATE UNIQUE INDEX uq_vehicle_images_primary_per_vehicle ON public.vehicle_images USING btree (vehicle_id) WHERE (is_primary = true);
CREATE UNIQUE INDEX uq_vehicles_primary_per_user ON public.vehicles USING btree (user_id) WHERE ((is_primary = true) AND ((status)::text = 'active'::text));
CREATE TRIGGER trg_sync_vehicle_mileage_from_fuel_logs AFTER INSERT OR UPDATE OF mileage_km ON public.fuel_logs FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_mileage_from_fuel_logs();
ALTER TABLE ONLY public.admin_removed_listings
    ADD CONSTRAINT admin_removed_listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.admin_removed_posts
    ADD CONSTRAINT admin_removed_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.admin_user_notices
    ADD CONSTRAINT admin_user_notices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.car_models
    ADD CONSTRAINT car_models_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.car_brands(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.community_post_images
    ADD CONSTRAINT community_post_images_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT community_post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.community_post_likes
    ADD CONSTRAINT community_post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.community_post_saves
    ADD CONSTRAINT community_post_saves_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.community_post_saves
    ADD CONSTRAINT community_post_saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.car_brands(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.car_models(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_closed_by_admin_id_fkey FOREIGN KEY (closed_by_admin_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.content_reports
    ADD CONSTRAINT content_reports_reporter_user_id_fkey FOREIGN KEY (reporter_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.insurance_policies
    ADD CONSTRAINT insurance_policies_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.maintenance_tasks
    ADD CONSTRAINT maintenance_tasks_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.marketplace_listing_images
    ADD CONSTRAINT marketplace_listing_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.marketplace_listing_saves
    ADD CONSTRAINT marketplace_listing_saves_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.marketplace_listings(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.marketplace_listing_saves
    ADD CONSTRAINT marketplace_listing_saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.car_brands(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.car_models(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.marketplace_listings
    ADD CONSTRAINT marketplace_listings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.service_records
    ADD CONSTRAINT service_records_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.technical_inspections
    ADD CONSTRAINT technical_inspections_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_ban_history
    ADD CONSTRAINT user_ban_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_community_block_history
    ADD CONSTRAINT user_community_block_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_marketplace_block_history
    ADD CONSTRAINT user_marketplace_block_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.vehicle_images
    ADD CONSTRAINT vehicle_images_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.car_brands(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.car_models(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
