CREATE TABLE IF NOT EXISTS content_reports (
    id SERIAL PRIMARY KEY,
    reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL
        CHECK (content_type IN ('listing', 'post', 'comment', 'profile')),
    content_id INTEGER NOT NULL,
    reported_subject TEXT NOT NULL,
    reason_code VARCHAR(80) NOT NULL,
    reason_label VARCHAR(180) NOT NULL,
    reason_text TEXT,
    target_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    closed_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_content_reports_status_created_at
    ON content_reports(status, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_content_reports_content
    ON content_reports(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user_id
    ON content_reports(reported_user_id);
