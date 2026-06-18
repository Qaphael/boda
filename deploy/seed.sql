-- Boda Sample Data Seed for Gulu, Uganda
-- Run: docker exec -i boda-postgres psql -U boda -d boda < /tmp/seed.sql

-- Clear existing data
TRUNCATE TABLE payment_flags, rider_suspensions, rider_rejections, payments, ratings, deliveries, bookings, riders, users CASCADE;

-- =====================
-- USERS (Customers)
-- =====================
INSERT INTO users (id, phone, name, email) VALUES
  ('a1000000-0000-0000-0000-000000000001', '256772100001', 'David Okello', 'david.okello@gmail.com'),
  ('a1000000-0000-0000-0000-000000000002', '256772100002', 'Sarah Namuli', 'sarah.namuli@gmail.com'),
  ('a1000000-0000-0000-0000-000000000003', '256772100003', 'Joseph Musisi', 'joseph.m@yahoo.com'),
  ('a1000000-0000-0000-0000-000000000004', '256772100004', 'Alice Aber', 'alice.aber@gmail.com'),
  ('a1000000-0000-0000-0000-000000000005', '256772100005', 'Robert Lutaaya', 'robert.l@gmail.com'),
  ('a1000000-0000-0000-0000-000000000006', '256772100006', 'Grace Atim', 'grace.atim@yahoo.com'),
  ('a1000000-0000-0000-0000-000000000007', '256772100007', 'Peter Odong', 'peter.odong@gmail.com'),
  ('a1000000-0000-0000-0000-000000000008', '256772100008', 'Florence Auma', 'florence.a@gmail.com'),
  ('a1000000-0000-0000-0000-000000000009', '256772100009', 'Brian Opio', 'brian.opio@gmail.com'),
  ('a1000000-0000-0000-0000-000000000010', '256772100010', 'Nancy Akello', 'nancy.ak@gmail.com'),
  ('a1000000-0000-0000-0000-000000000011', '256772100011', 'Moses Otim', 'moses.otim@yahoo.com'),
  ('a1000000-0000-0000-0000-000000000012', '256772100012', 'Juliet Lamwaka', 'juliet.l@gmail.com'),
  ('a1000000-0000-0000-0000-000000000013', '256772100013', 'Samuel Kidega', 'samuel.k@gmail.com'),
  ('a1000000-0000-0000-0000-000000000014', '256772100014', 'Catherine Nyeko', 'cathy.n@yahoo.com'),
  ('a1000000-0000-0000-0000-000000000015', '256772100015', 'James Obbo', 'james.obbo@gmail.com');

-- =====================
-- RIDERS
-- =====================
INSERT INTO riders (id, user_id, phone, name, national_id, plate_number, status, current_lat, current_lng, is_online, avg_rating, total_ratings, total_trips, created_at) VALUES
  -- Verified & Online
  ('b1000000-0000-0000-0000-000000000001', NULL, '256782200001', 'Kevin Otieno', 'CM123456789', 'UFB 442D', 'verified', 2.7700, 32.2970, true, 4.80, 156, 342, NOW() - INTERVAL '6 months'),
  ('b1000000-0000-0000-0000-000000000002', NULL, '256782200002', 'Sarah Mwangi', 'CM987654321', 'UDD 881K', 'verified', 2.7715, 32.2985, true, 4.90, 203, 478, NOW() - INTERVAL '8 months'),
  ('b1000000-0000-0000-0000-000000000003', NULL, '256782200003', 'Musa Kato', 'CM456789012', 'UAGE 305R', 'verified', 2.7680, 32.2950, true, 4.70, 89, 210, NOW() - INTERVAL '4 months'),
  ('b1000000-0000-0000-0000-000000000004', NULL, '256782200004', 'Ivan Sseba', 'CM321654987', 'UFC 119M', 'verified', 2.7730, 32.2990, false, 4.60, 67, 145, NOW() - INTERVAL '3 months'),
  ('b1000000-0000-0000-0000-000000000005', NULL, '256782200005', 'Ben Mwebaze', 'CM789012345', 'UHE 672P', 'verified', 2.7695, 32.2965, true, 4.85, 134, 290, NOW() - INTERVAL '5 months'),
  -- Pending verification
  ('b1000000-0000-0000-0000-000000000006', NULL, '256782200006', 'Samuel Kamau', 'CM111222333', 'UKK 554A', 'pending', NULL, NULL, false, 0, 0, 0, NOW() - INTERVAL '2 days'),
  ('b1000000-0000-0000-0000-000000000007', NULL, '256782200007', 'Esther Musyoka', 'CM444555666', 'UJJ 778B', 'pending', NULL, NULL, false, 0, 0, 0, NOW() - INTERVAL '1 day'),
  ('b1000000-0000-0000-0000-000000000008', NULL, '256782200008', 'Grace Wanjiku', 'CM777888999', 'UGG 223C', 'pending', NULL, NULL, false, 0, 0, 0, NOW() - INTERVAL '3 days'),
  -- Suspended
  ('b1000000-0000-0000-0000-000000000009', NULL, '256782200009', 'Michael Otieno', 'CM101010101', 'UBB 991D', 'suspended', 2.7710, 32.2980, false, 3.20, 45, 88, NOW() - INTERVAL '7 months'),
  -- More verified
  ('b1000000-0000-0000-0000-000000000010', NULL, '256782200010', 'Fred Ogwang', 'CM202020202', 'UEE 445E', 'verified', 2.7725, 32.2975, true, 4.50, 78, 167, NOW() - INTERVAL '2 months'),
  ('b1000000-0000-0000-0000-000000000011', NULL, '256782200011', 'Patricia Nantongo', 'CM303030303', 'UFF 667F', 'verified', 2.7688, 32.2958, false, 4.95, 256, 512, NOW() - INTERVAL '10 months'),
  ('b1000000-0000-0000-0000-000000000012', NULL, '256782200012', 'Andrew Omara', 'CM404040404', 'UGI 889G', 'verified', 2.7705, 32.2945, true, 4.40, 52, 110, NOW() - INTERVAL '1 month');

-- =====================
-- BOOKINGS (various statuses)
-- =====================
INSERT INTO bookings (id, customer_id, rider_id, type, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, status, fare_estimate, fare_final, distance_km, created_at, completed_at) VALUES
  -- Completed bookings
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'ride', 2.7700, 32.2900, 'Gulu Main Park', 2.7750, 32.3050, 'Gulu University', 'completed', 3500, 3500, 2.1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '15 minutes'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'ride', 2.7680, 32.2920, 'St. Joseph College', 2.7710, 32.2980, 'Bombo Barracks Gate', 'completed', 2000, 2000, 1.2, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 'delivery', 2.7695, 32.2940, 'Gulu Market', 2.7730, 32.3010, 'Palwo Trading Center', 'completed', 5000, 5500, 4.5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '25 minutes'),
  ('c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'ride', 2.7720, 32.2960, 'Acholi Inn', 2.7680, 32.2890, 'Koro Sub-county HQ', 'completed', 4000, 4000, 3.0, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '20 minutes'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'ride', 2.7710, 32.2975, 'Gulu Cathedral', 2.7740, 32.3030, 'Bar De Loro', 'completed', 2500, 2500, 1.5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '12 minutes'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002', 'ride', 2.7690, 32.2930, 'Oprah Hotel', 2.7755, 32.3045, 'Lacor Hospital', 'completed', 4500, 4500, 3.5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '18 minutes'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000005', 'delivery', 2.7705, 32.2955, 'Gulu Town Club', 2.7675, 32.2880, 'Pajule Trading Center', 'completed', 6000, 6500, 5.2, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),
  ('c1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000001', 'ride', 2.7735, 32.3000, 'Gulu Army Baracks', 2.7695, 32.2915, 'Pece War Memorial', 'completed', 3000, 3000, 1.8, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '14 minutes'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000003', 'ride', 2.7700, 32.2945, 'Gulu Central Mosque', 2.7745, 32.3020, 'Cocacola Factory', 'completed', 3500, 3500, 2.3, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '16 minutes'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000002', 'ride', 2.7685, 32.2910, 'Gulu Main Street', 2.7720, 32.2990, 'Kaunda Ground', 'completed', 2000, 2000, 1.1, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week' + INTERVAL '8 minutes'),
  -- Active / In Progress bookings
  ('c1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000001', 'ride', 2.7700, 32.2960, 'Gulu Taxi Park', 2.7750, 32.3060, 'Bwama Village', 'in_progress', 5000, NULL, 4.0, NOW() - INTERVAL '30 minutes', NULL),
  ('c1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000005', 'delivery', 2.7715, 32.2975, 'Gulu Modern Market', 2.7680, 32.2895, 'Paicho Sub-county', 'in_progress', 7000, NULL, 6.0, NOW() - INTERVAL '45 minutes', NULL),
  -- Pending bookings (waiting for rider)
  ('c1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000013', NULL, 'ride', 2.7695, 32.2935, 'Gulu Education Center', 2.7735, 32.3015, 'St. Marys Hospital Lacor', 'pending', 3000, NULL, 2.0, NOW() - INTERVAL '5 minutes', NULL),
  ('c1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000014', NULL, 'delivery', 2.7705, 32.2950, 'Gulu Post Office', 2.7755, 32.3040, 'Awach Town Council', 'pending', 8000, NULL, 7.5, NOW() - INTERVAL '2 minutes', NULL),
  -- Cancelled bookings
  ('c1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'ride', 2.7710, 32.2965, 'Gulu High School', 2.7690, 32.2910, 'Pece Kil', 'cancelled', 2500, NULL, 1.4, NOW() - INTERVAL '1 day', NULL),
  ('c1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000003', NULL, 'ride', 2.7680, 32.2900, 'Gulu Bus Park', 2.7730, 32.3005, 'Kanyagoga Cell', 'cancelled', 4000, NULL, 2.8, NOW() - INTERVAL '3 days', NULL),
  -- More completed (older)
  ('c1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000010', 'ride', 2.7725, 32.2985, 'Gulu Town Hall', 2.7685, 32.2905, 'Lacor Trading Center', 'completed', 3500, 3500, 2.2, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '13 minutes'),
  ('c1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000011', 'ride', 2.7700, 32.2940, 'Gulu Sports Club', 2.7750, 32.3055, 'Pagak Cell', 'completed', 5000, 5000, 4.2, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days' + INTERVAL '22 minutes'),
  ('c1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000012', 'delivery', 2.7690, 32.2925, 'Gulu Farmers Market', 2.7740, 32.3025, 'Pader Town', 'completed', 12000, 12000, 10.5, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '45 minutes'),
  ('c1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000003', 'ride', 2.7715, 32.2970, 'Gulu Freedom Square', 2.7685, 32.2890, 'Karuma Bridge', 'completed', 8000, 8000, 7.0, NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days' + INTERVAL '35 minutes');

-- =====================
-- PAYMENTS
-- =====================
INSERT INTO payments (id, booking_id, amount, method, status, transaction_ref, held_at, released_at, created_at) VALUES
  -- Released payments (completed bookings)
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 3500, 'mtn', 'released', 'MTN-TRX-001', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '16 minutes', NOW() - INTERVAL '1 day'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 2000, 'airtel', 'released', 'AIR-TRX-002', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '11 minutes', NOW() - INTERVAL '2 days'),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 5500, 'mtn', 'released', 'MTN-TRX-003', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '26 minutes', NOW() - INTERVAL '2 days'),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 4000, 'mtn', 'released', 'MTN-TRX-004', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '21 minutes', NOW() - INTERVAL '3 days'),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000005', 2500, 'cash', 'released', NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '13 minutes', NOW() - INTERVAL '3 days'),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006', 4500, 'mtn', 'released', 'MTN-TRX-006', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '19 minutes', NOW() - INTERVAL '4 days'),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000007', 6500, 'airtel', 'released', 'AIR-TRX-007', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '31 minutes', NOW() - INTERVAL '5 days'),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000008', 3000, 'mtn', 'released', 'MTN-TRX-008', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '15 minutes', NOW() - INTERVAL '5 days'),
  ('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009', 3500, 'mtn', 'released', 'MTN-TRX-009', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '17 minutes', NOW() - INTERVAL '6 days'),
  ('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000010', 2000, 'cash', 'released', NULL, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week' + INTERVAL '9 minutes', NOW() - INTERVAL '1 week'),
  -- Held payments (active bookings)
  ('d1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000011', 5000, 'mtn', 'held', 'MTN-TRX-011', NOW() - INTERVAL '30 minutes', NULL, NOW() - INTERVAL '30 minutes'),
  ('d1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000012', 7000, 'airtel', 'held', 'AIR-TRX-012', NOW() - INTERVAL '45 minutes', NULL, NOW() - INTERVAL '45 minutes'),
  -- Flagged payment (suspicious)
  ('d1000000-0000-0000-0000-000000000013', 'c1000000-0000-0000-0000-000000000015', 2500, 'mtn', 'flagged', 'MTN-TRX-013', NOW() - INTERVAL '1 day', NULL, NOW() - INTERVAL '1 day'),
  -- More released (older)
  ('d1000000-0000-0000-0000-000000000014', 'c1000000-0000-0000-0000-000000000017', 3500, 'mtn', 'released', 'MTN-TRX-014', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '14 minutes', NOW() - INTERVAL '10 days'),
  ('d1000000-0000-0000-0000-000000000015', 'c1000000-0000-0000-0000-000000000018', 5000, 'mtn', 'released', 'MTN-TRX-015', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days' + INTERVAL '23 minutes', NOW() - INTERVAL '12 days'),
  ('d1000000-0000-0000-0000-000000000016', 'c1000000-0000-0000-0000-000000000019', 12000, 'mtn', 'held', 'MTN-TRX-016', NOW() - INTERVAL '14 days', NULL, NOW() - INTERVAL '14 days'),
  ('d1000000-0000-0000-0000-000000000017', 'c1000000-0000-0000-0000-000000000020', 8000, 'airtel', 'released', 'AIR-TRX-017', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days' + INTERVAL '36 minutes', NOW() - INTERVAL '16 days');

-- =====================
-- RATINGS (for completed bookings)
-- =====================
INSERT INTO ratings (booking_id, rated_by, rider_id, score, comment, created_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 5, 'Great ride, very smooth!', NOW() - INTERVAL '1 day'),
  ('c1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 5, 'Very professional rider', NOW() - INTERVAL '2 days'),
  ('c1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000005', 4, 'Package delivered safely, took a bit long', NOW() - INTERVAL '2 days'),
  ('c1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 5, 'Excellent service as always', NOW() - INTERVAL '3 days'),
  ('c1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 5, 'Fast and safe', NOW() - INTERVAL '3 days'),
  ('c1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002', 4, 'Good ride, knew the way well', NOW() - INTERVAL '4 days'),
  ('c1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000005', 5, 'Delivered on time, very careful with the package', NOW() - INTERVAL '5 days'),
  ('c1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000001', 5, 'Perfect ride, thanks!', NOW() - INTERVAL '5 days'),
  ('c1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000003', 4, 'Good ride', NOW() - INTERVAL '6 days'),
  ('c1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000002', 5, 'Very fast, arrived in minutes', NOW() - INTERVAL '1 week'),
  ('c1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000010', 4, 'Good experience', NOW() - INTERVAL '10 days'),
  ('c1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000011', 5, 'Best rider in Gulu!', NOW() - INTERVAL '12 days'),
  ('c1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000012', 5, 'Long distance but handled it perfectly', NOW() - INTERVAL '14 days'),
  ('c1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000003', 4, 'Safe trip to Karuma', NOW() - INTERVAL '16 days');

-- =====================
-- DELIVERIES (for delivery bookings)
-- =====================
INSERT INTO deliveries (id, booking_id, item_description, recipient_name, recipient_phone, confirmation_code, created_at) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Documents - Office papers', 'John Bosco', '256773300001', 'DLV001', NOW() - INTERVAL '2 days'),
  ('e1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000007', 'Food items - Rice and beans', 'Mary Achieng', '256773300002', 'DLV002', NOW() - INTERVAL '5 days'),
  ('e1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000019', 'Electronics - Phone accessories', 'Peter Ojara', '256773300003', 'DLV003', NOW() - INTERVAL '14 days'),
  ('e1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000012', 'Medicine - Prescribed drugs', 'Agnes Lakot', '256773300004', 'DLV004', NOW() - INTERVAL '45 minutes');
