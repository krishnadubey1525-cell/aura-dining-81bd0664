-- Add admin role for existing user
INSERT INTO user_roles (user_id, role)
VALUES ('6c5180b1-f8e1-4794-97e1-05aa9d1d7ac0', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;