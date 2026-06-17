CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO admins (user_id, is_active)
VALUES ('f28d59b8-39e5-4b3d-a30d-479192ad777f', true)
ON CONFLICT (user_id) DO NOTHING;
