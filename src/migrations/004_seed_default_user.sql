-- Seed: Default admin user
-- Email: parth@avinashi.com
-- Password: Parth@2026 (hashed with bcrypt, cost 12)

INSERT INTO users (
    email,
    first_name,
    last_name,
    password,
    permissions
) VALUES (
    'parth@avinashi.com',
    'Parth',
    'Barochiya',
    '$2b$12$CopurAnYdJbUCBmV5uuUXO2RRSZxxzj/b5HgDib.ccJg5ZZqvJNzu',
    ARRAY[101, 102, 103, 104, 105]
) ON CONFLICT (email) DO NOTHING;
