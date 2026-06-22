SELECT id, status, booking_id FROM support_tickets WHERE id = 'd9be81bf-2f5b-4c86-a8f1-d5340331e194';
UPDATE support_tickets SET status = 'in_progress', updated_at = NOW() WHERE id = 'd9be81bf-2f5b-4c86-a8f1-d5340331e194';
SELECT id, status FROM support_tickets WHERE id = 'd9be81bf-2f5b-4c86-a8f1-d5340331e194';
