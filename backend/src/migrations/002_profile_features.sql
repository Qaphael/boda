-- Profile feature tables migration

-- Saved places (Home, Work, custom)
CREATE TABLE IF NOT EXISTS saved_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    icon VARCHAR(10) DEFAULT '📍',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_places_user ON saved_places(user_id);

-- Payment methods (MoMo numbers)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('mtn', 'airtel', 'cash')),
    phone_number VARCHAR(15) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- Referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    code VARCHAR(10) UNIQUE NOT NULL,
    uses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- Referrals (who referred whom)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id),
    referred_id UUID REFERENCES users(id),
    reward_given BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    relationship VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);

-- User settings (notification prefs, language, theme)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(50) NOT NULL,
    setting_value TEXT NOT NULL,
    PRIMARY KEY (user_id, setting_key)
);

-- Customer notifications
CREATE TABLE IF NOT EXISTS customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_user ON customer_notifications(user_id);

-- Seed default settings for existing users
INSERT INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'push_enabled', 'true' FROM users
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'sms_enabled', 'true' FROM users
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'email_enabled', 'false' FROM users
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'ride_updates', 'true' FROM users
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'promotions', 'true' FROM users
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'language', 'en' FROM users
ON CONFLICT DO NOTHING;

INSERT INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'share_trip_status', 'false' FROM users
ON CONFLICT DO NOTHING;
