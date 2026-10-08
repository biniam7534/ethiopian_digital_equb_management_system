-- =============================================================================
-- Seed data for local development / demos
-- Password for all users: Password123!
-- bcrypt hash generated with cost 10
-- =============================================================================

-- Password123!
-- $2b$10$rQZ8K5Y5Y5Y5Y5Y5Y5Y5YuO placeholder — replaced by backend seed script.
-- Use the backend npm run seed command for hashed passwords in practice.
-- Below uses a known bcrypt hash of "Password123!"

INSERT INTO users (id, full_name, phone, email, password_hash, role, language)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'System Admin',
        '+251911000001',
        'admin@equb.et',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'admin',
        'en'
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'Abebe Kebede',
        '+251911000002',
        'abebe@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'organizer',
        'am'
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'Tigist Hailu',
        '+251911000003',
        'tigist@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'member',
        'am'
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'Chaltu Bekele',
        '+251911000004',
        'chaltu@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'member',
        'om'
    )
ON CONFLICT (phone) DO NOTHING;

INSERT INTO equbs (
    id, name, description, organizer_id, contribution_amount,
    max_members, frequency, start_date, status, current_cycle, invite_code
)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Bole Weekly Equb',
    'Neighborhood weekly equb for Bole area members.',
    '22222222-2222-2222-2222-222222222222',
    1000.00,
    4,
    'weekly',
    CURRENT_DATE,
    'open',
    0,
    'BOLE2026'
)
ON CONFLICT (invite_code) DO NOTHING;

INSERT INTO members (id, equb_id, user_id, payout_position, status)
VALUES
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222',
        1,
        'active'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '33333333-3333-3333-3333-333333333333',
        2,
        'active'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '44444444-4444-4444-4444-444444444444',
        3,
        'active'
    )
ON CONFLICT DO NOTHING;
