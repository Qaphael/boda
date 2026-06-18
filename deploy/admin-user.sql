INSERT INTO admins (user_id, is_active) VALUES ((SELECT id FROM users WHERE phone = '256772100001'), true);
