CREATE TABLE IF NOT EXISTS auth_login_attempts (
    id SERIAL PRIMARY KEY,
    login_identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    user_agent TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    was_successful BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_attempted_at
    ON auth_login_attempts (attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_identifier_attempted_at
    ON auth_login_attempts (login_identifier, attempted_at DESC);
