CREATE UNIQUE INDEX IF NOT EXISTS uq_users_pseudonym_ci
    ON users (LOWER(pseudonym))
    WHERE pseudonym IS NOT NULL;
