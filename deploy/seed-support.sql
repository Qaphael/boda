-- Seed support tickets
INSERT INTO support_tickets (subject, description, priority, category, status, user_id, rider_id, booking_id, created_at) VALUES
  ('Payment failure at Gulu Main Gate', 'Unable to complete transaction. App shows Transaction Pending but gate system has not cleared exit.', 'urgent', 'payment', 'open', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000011', NOW() - INTERVAL '2 hours'),
  ('Lost item in transit - Bag #42', 'Customer reports leaving a black bag on the boda after ride from Gulu Market to Lacor.', 'high', 'ride', 'in_progress', 'a1000000-0000-0000-0000-000000000003', NULL, 'c1000000-0000-0000-0000-000000000003', NOW() - INTERVAL '5 hours'),
  ('App login issues after update', 'Biometric login failing consistently after latest app update on Android.', 'low', 'technical', 'in_progress', NULL, 'b1000000-0000-0000-0000-000000000004', NULL, NOW() - INTERVAL '1 day'),
  ('Wrong fare charged', 'Charged UGX 8000 for a trip that should have been UGX 5000 based on distance.', 'medium', 'payment', 'open', 'a1000000-0000-0000-0000-000000000005', NULL, 'c1000000-0000-0000-0000-000000000018', NOW() - INTERVAL '3 hours'),
  ('Rider cancelled without reason', 'Rider accepted booking then cancelled immediately without providing a reason.', 'medium', 'ride', 'open', 'a1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000009', NULL, NOW() - INTERVAL '6 hours'),
  ('Delivery package damaged', 'Package arrived with visible damage. Item was fragile electronics.', 'high', 'delivery', 'open', 'a1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000019', NOW() - INTERVAL '8 hours'),
  ('Account verification pending', 'Applied as a rider 5 days ago, still waiting for verification.', 'low', 'account', 'resolved', NULL, 'b1000000-0000-0000-0000-000000000006', NULL, NOW() - INTERVAL '5 days'),
  ('Cannot update phone number', 'Getting error when trying to change phone number in profile settings.', 'medium', 'account', 'open', 'a1000000-0000-0000-0000-000000000012', NULL, NULL, NOW() - INTERVAL '12 hours');

-- Add some messages for the first ticket
INSERT INTO ticket_messages (ticket_id, admin_id, message, type, created_at)
SELECT
  (SELECT id FROM support_tickets WHERE subject LIKE 'Payment failure%' LIMIT 1),
  (SELECT user_id FROM admins LIMIT 1),
  'Checking payment gateway logs for this transaction. Gateway seems to be experiencing latency in the Gulu area.',
  'internal_note',
  NOW() - INTERVAL '1 hour';

INSERT INTO ticket_messages (ticket_id, admin_id, message, type, created_at)
SELECT
  (SELECT id FROM support_tickets WHERE subject LIKE 'Payment failure%' LIMIT 1),
  (SELECT user_id FROM admins LIMIT 1),
  'We have identified the issue. The MTN MoMo gateway had a 15-minute outage. Your payment has been processed. Please check your phone for confirmation.',
  'admin_reply',
  NOW() - INTERVAL '30 minutes';
