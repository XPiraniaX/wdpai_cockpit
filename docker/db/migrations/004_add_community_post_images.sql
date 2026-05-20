CREATE TABLE community_post_images (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    image_path VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL CHECK (display_order >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_post_images_post_id ON community_post_images(post_id, display_order ASC, id ASC);
