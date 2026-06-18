-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category VARCHAR(30) DEFAULT 'general' CHECK (category IN ('general', 'payment', 'ride', 'delivery', 'account', 'technical')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    user_id UUID REFERENCES users(id),
    rider_id UUID REFERENCES riders(id),
    booking_id UUID REFERENCES bookings(id),
    assigned_to UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id),
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'admin_reply' CHECK (type IN ('user_message', 'admin_reply', 'internal_note', 'system')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin Settings
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    updated_by UUID,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_admin_settings_category ON admin_settings(category);

-- Default settings
INSERT INTO admin_settings (key, value, category) VALUES
  ('new_rider_registration', 'true', 'system'),
  ('in_app_chat', 'true', 'system'),
  ('commission_rate', '12.5', 'system'),
  ('surge_multiplier', '2.5', 'system'),
  ('currency', 'UGX', 'regional'),
  ('timezone', 'EAT', 'regional'),
  ('sms_rider_application', 'false', 'notifications'),
  ('email_rider_application', 'true', 'notifications'),
  ('webhook_rider_application', 'true', 'notifications'),
  ('sms_flagged_payment', 'true', 'notifications'),
  ('email_flagged_payment', 'true', 'notifications'),
  ('webhook_flagged_payment', 'false', 'notifications'),
  ('sms_maintenance', 'false', 'notifications'),
  ('email_maintenance', 'true', 'notifications'),
  ('webhook_maintenance', 'false', 'notifications')
ON CONFLICT (key) DO NOTHING;
