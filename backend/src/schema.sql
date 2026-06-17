-- Boda Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users (customers)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    profile_photo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Riders
CREATE TABLE IF NOT EXISTS riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    plate_number VARCHAR(10) NOT NULL,
    id_photo TEXT,
    selfie_photo TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    is_online BOOLEAN DEFAULT false,
    avg_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    total_cancellations INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id),
    rider_id UUID REFERENCES riders(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('ride', 'delivery')),
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,
    dropoff_address TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    fare_estimate INTEGER,
    fare_final INTEGER,
    distance_km DECIMAL(6, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Deliveries
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) UNIQUE,
    item_description TEXT NOT NULL,
    recipient_name VARCHAR(100),
    recipient_phone VARCHAR(15),
    confirmation_code VARCHAR(6),
    photo_proof TEXT,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ratings
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    rated_by UUID REFERENCES users(id),
    rider_id UUID REFERENCES riders(id),
    score SMALLINT CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(booking_id, rated_by)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    amount INTEGER NOT NULL,
    method VARCHAR(10) CHECK (method IN ('mtn', 'airtel', 'cash')),
    status VARCHAR(20) DEFAULT 'pending',
    transaction_ref VARCHAR(100),
    held_at TIMESTAMP,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rider Rejections (for admin audit trail)
CREATE TABLE IF NOT EXISTS rider_rejections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID REFERENCES riders(id),
    reason TEXT,
    reviewed_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Rider Suspensions (for admin audit trail)
CREATE TABLE IF NOT EXISTS rider_suspensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id UUID REFERENCES riders(id),
    reason TEXT,
    suspended_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment Flags (for admin audit trail)
CREATE TABLE IF NOT EXISTS payment_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    reason TEXT,
    flagged_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_riders_status ON riders(status);
CREATE INDEX IF NOT EXISTS idx_riders_location ON riders(current_lat, current_lng);
CREATE INDEX IF NOT EXISTS idx_riders_phone ON riders(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_rider ON bookings(rider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_booking ON deliveries(booking_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rider ON ratings(rider_id);
CREATE INDEX IF NOT EXISTS idx_ratings_booking ON ratings(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
