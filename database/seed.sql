-- =============================================================================
-- Ethiopian Digital Equb Management System — Seed Data
-- Covers: users, equbs, members, cycles, contributions, payouts, notifications
--
-- Password for ALL users: Password123!
-- bcrypt hash ($2b$10, cost 10) of "Password123!":
--   $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
--
-- NOTE: For production seeding with freshly-generated hashes,
--       use:  npm run seed  (backend/src/db/seed.js uses bcryptjs at runtime).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- USERS  (1 admin, 2 organizers, 5 members — 8 total)
-- ---------------------------------------------------------------------------
INSERT INTO users (
    id, full_name, phone, email, password_hash, role, language,
    is_active, is_verified
)
VALUES
    -- System admin
    (
        '11111111-1111-1111-1111-111111111111',
        'System Admin',
        '+251911000001',
        'admin@equb.et',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'admin', 'en', TRUE, TRUE
    ),
    -- Organizer 1 — runs the Bole Weekly Equb
    (
        '22222222-2222-2222-2222-222222222222',
        'Abebe Kebede',
        '+251911000002',
        'abebe@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'organizer', 'am', TRUE, TRUE
    ),
    -- Organizer 2 — runs the Kirkos Monthly Equb
    (
        '22222222-2222-2222-2222-222222222223',
        'Selamawit Girma',
        '+251911000008',
        'selamawit@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'organizer', 'am', TRUE, TRUE
    ),
    -- Members
    (
        '33333333-3333-3333-3333-333333333333',
        'Tigist Hailu',
        '+251911000003',
        'tigist@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'member', 'am', TRUE, TRUE
    ),
    (
        '44444444-4444-4444-4444-444444444444',
        'Chaltu Bekele',
        '+251911000004',
        'chaltu@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'member', 'om', TRUE, TRUE
    ),
    (
        '55555555-5555-5555-5555-555555555555',
        'Dawit Tadesse',
        '+251911000005',
        'dawit@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'member', 'am', TRUE, FALSE
    ),
    (
        '66666666-6666-6666-6666-666666666666',
        'Hana Tesfaye',
        '+251911000006',
        'hana@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'member', 'en', TRUE, TRUE
    ),
    (
        '77777777-7777-7777-7777-777777777777',
        'Yonas Alemu',
        '+251911000007',
        'yonas@example.com',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        'member', 'om', TRUE, TRUE
    )
ON CONFLICT (phone) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        is_verified   = EXCLUDED.is_verified;

-- ---------------------------------------------------------------------------
-- EQUBS  (2 groups: one active, one open)
-- ---------------------------------------------------------------------------
INSERT INTO equbs (
    id, name, description, organizer_id,
    contribution_amount, max_members, frequency,
    start_date, status, current_cycle, invite_code, late_penalty_percent
)
VALUES
    -- Group 1: Bole Weekly Equb — active, 2 cycles in, 4 members
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Bole Weekly Equb',
        'Neighborhood weekly equb for Bole area members. Every Monday.',
        '22222222-2222-2222-2222-222222222222',
        1000.00, 4, 'weekly',
        CURRENT_DATE - INTERVAL '2 weeks',
        'active', 2, 'BOLE2026', 5.00
    ),
    -- Group 2: Kirkos Monthly Equb — still open, collecting members
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Kirkos Monthly Equb',
        'Monthly equb for Kirkos sub-city residents. 5000 ETB per month.',
        '22222222-2222-2222-2222-222222222223',
        5000.00, 6, 'monthly',
        CURRENT_DATE + INTERVAL '1 week',
        'open', 0, 'KIRK2026', 0.00
    )
ON CONFLICT (invite_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- MEMBERS  (Bole: 4 members | Kirkos: 3 members so far)
-- ---------------------------------------------------------------------------
INSERT INTO members (id, equb_id, user_id, payout_position, has_received, status)
VALUES
    -- Bole Weekly Equb members (position 1 already received)
    (
        'cc000001-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222',  -- Abebe (organizer)
        1, TRUE, 'active'
    ),
    (
        'cc000002-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '33333333-3333-3333-3333-333333333333',  -- Tigist
        2, FALSE, 'active'
    ),
    (
        'cc000003-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '44444444-4444-4444-4444-444444444444',  -- Chaltu
        3, FALSE, 'active'
    ),
    (
        'cc000004-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '55555555-5555-5555-5555-555555555555',  -- Dawit
        4, FALSE, 'active'
    ),
    -- Kirkos Monthly Equb members
    (
        'cc000005-cccc-cccc-cccc-cccccccccccc',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '22222222-2222-2222-2222-222222222223',  -- Selamawit (organizer)
        1, FALSE, 'active'
    ),
    (
        'cc000006-cccc-cccc-cccc-cccccccccccc',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '66666666-6666-6666-6666-666666666666',  -- Hana
        2, FALSE, 'active'
    ),
    (
        'cc000007-cccc-cccc-cccc-cccccccccccc',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '77777777-7777-7777-7777-777777777777',  -- Yonas
        3, FALSE, 'active'
    )
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- CYCLES  (Bole Equb: 2 completed cycles, 1 current collecting)
-- ---------------------------------------------------------------------------
INSERT INTO cycles (
    id, equb_id, recipient_id, cycle_number,
    due_date, status, total_collected, expected_total,
    started_at, completed_at
)
VALUES
    -- Cycle 1 — completed, Abebe received the pot
    (
        'dd000001-dddd-dddd-dddd-dddddddddddd',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cc000001-cccc-cccc-cccc-cccccccccccc',
        1,
        CURRENT_DATE - INTERVAL '14 days',
        'completed',
        4000.00, 4000.00,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '13 days'
    ),
    -- Cycle 2 — completed, Tigist received the pot
    (
        'dd000002-dddd-dddd-dddd-dddddddddddd',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cc000002-cccc-cccc-cccc-cccccccccccc',
        2,
        CURRENT_DATE - INTERVAL '7 days',
        'completed',
        4000.00, 4000.00,
        NOW() - INTERVAL '8 days',
        NOW() - INTERVAL '6 days'
    ),
    -- Cycle 3 — currently collecting, Chaltu is next recipient
    (
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'cc000003-cccc-cccc-cccc-cccccccccccc',
        3,
        CURRENT_DATE + INTERVAL '3 days',
        'collecting',
        2000.00, 4000.00,
        NOW() - INTERVAL '1 day',
        NULL
    )
ON CONFLICT (equb_id, cycle_number) DO NOTHING;

-- ---------------------------------------------------------------------------
-- CONTRIBUTIONS  (all members × all 3 cycles)
-- ---------------------------------------------------------------------------
INSERT INTO contributions (
    id, cycle_id, member_id,
    amount_due, amount_paid,
    payment_method, reference_code,
    status, paid_at, confirmed_at, confirmed_by, late_fee
)
VALUES
    -- === Cycle 1 — all 4 members paid (confirmed) ===
    (
        'ee010001-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000001-dddd-dddd-dddd-dddddddddddd',
        'cc000001-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'bank_transfer', 'CBE-TXN-001',
        'confirmed',
        NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days',
        '11111111-1111-1111-1111-111111111111', 0.00
    ),
    (
        'ee010002-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000001-dddd-dddd-dddd-dddddddddddd',
        'cc000002-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'mobile_money', 'TELE-TXN-002',
        'confirmed',
        NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days',
        '22222222-2222-2222-2222-222222222222', 0.00
    ),
    (
        'ee010003-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000001-dddd-dddd-dddd-dddddddddddd',
        'cc000003-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'cash', NULL,
        'confirmed',
        NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days',
        '22222222-2222-2222-2222-222222222222', 0.00
    ),
    (
        'ee010004-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000001-dddd-dddd-dddd-dddddddddddd',
        'cc000004-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1050.00, 'telebirr', 'TELE-TXN-004',
        'confirmed',
        NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days',
        '22222222-2222-2222-2222-222222222222', 50.00  -- late fee applied
    ),
    -- === Cycle 2 — all 4 members paid (confirmed) ===
    (
        'ee020001-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000002-dddd-dddd-dddd-dddddddddddd',
        'cc000001-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'bank_transfer', 'CBE-TXN-005',
        'confirmed',
        NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days',
        '22222222-2222-2222-2222-222222222222', 0.00
    ),
    (
        'ee020002-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000002-dddd-dddd-dddd-dddddddddddd',
        'cc000002-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'mobile_money', 'TELE-TXN-006',
        'confirmed',
        NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days',
        '22222222-2222-2222-2222-222222222222', 0.00
    ),
    (
        'ee020003-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000002-dddd-dddd-dddd-dddddddddddd',
        'cc000003-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'cbe_birr', 'CBE-TXN-007',
        'confirmed',
        NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days',
        '22222222-2222-2222-2222-222222222222', 0.00
    ),
    (
        'ee020004-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000002-dddd-dddd-dddd-dddddddddddd',
        'cc000004-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'cash', NULL,
        'confirmed',
        NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days',
        '22222222-2222-2222-2222-222222222222', 0.00
    ),
    -- === Cycle 3 — in progress: 2 confirmed, 1 submitted, 1 pending ===
    (
        'ee030001-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        'cc000001-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'bank_transfer', 'CBE-TXN-008',
        'confirmed',
        NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
        '22222222-2222-2222-2222-222222222222', 0.00
    ),
    (
        'ee030002-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        'cc000002-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'telebirr', 'TELE-TXN-009',
        'confirmed',
        NOW() - INTERVAL '12 hours', NOW() - INTERVAL '10 hours',
        '22222222-2222-2222-2222-222222222222', 0.00
    ),
    (
        'ee030003-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        'cc000003-cccc-cccc-cccc-cccccccccccc',
        1000.00, 1000.00, 'mobile_money', 'TELE-TXN-010',
        'submitted',    -- awaiting organizer confirmation
        NOW() - INTERVAL '3 hours', NULL, NULL, 0.00
    ),
    (
        'ee030004-eeee-eeee-eeee-eeeeeeeeeeee',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        'cc000004-cccc-cccc-cccc-cccccccccccc',
        1000.00, NULL, 'cash', NULL,
        'pending',      -- not yet paid
        NULL, NULL, NULL, 0.00
    )
ON CONFLICT (cycle_id, member_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- PAYOUTS  (cycles 1 & 2 completed; cycle 3 still pending)
-- ---------------------------------------------------------------------------
INSERT INTO payouts (
    id, cycle_id, member_id,
    amount, payment_method, reference_code,
    recipient_account_name, recipient_account_number, recipient_bank_name,
    status, paid_at, confirmed_at, processed_by
)
VALUES
    -- Cycle 1 payout → Abebe Kebede
    (
        'ff000001-ffff-ffff-ffff-ffffffffffff',
        'dd000001-dddd-dddd-dddd-dddddddddddd',
        'cc000001-cccc-cccc-cccc-cccccccccccc',
        4000.00, 'bank_transfer', 'OUT-CBE-001',
        'Abebe Kebede', '1000012345678', 'Commercial Bank of Ethiopia',
        'completed',
        NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days',
        '11111111-1111-1111-1111-111111111111'
    ),
    -- Cycle 2 payout → Tigist Hailu
    (
        'ff000002-ffff-ffff-ffff-ffffffffffff',
        'dd000002-dddd-dddd-dddd-dddddddddddd',
        'cc000002-cccc-cccc-cccc-cccccccccccc',
        4000.00, 'telebirr', 'OUT-TELE-002',
        'Tigist Hailu', '+251911000003', 'Telebirr',
        'completed',
        NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days',
        '22222222-2222-2222-2222-222222222222'
    ),
    -- Cycle 3 payout → Chaltu Bekele (pending — collection ongoing)
    (
        'ff000003-ffff-ffff-ffff-ffffffffffff',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        'cc000003-cccc-cccc-cccc-cccccccccccc',
        4000.00, 'bank_transfer', NULL,
        'Chaltu Bekele', '1000098765432', 'Awash Bank',
        'pending',
        NULL, NULL, NULL
    )
ON CONFLICT (cycle_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS  (variety of types, channels, read states)
-- ---------------------------------------------------------------------------
INSERT INTO notifications (
    id, user_id, equb_id, cycle_id,
    title, body, type, channel,
    is_read, push_status, sms_status, metadata, created_at
)
VALUES
    -- Abebe: equb_started
    (
        'aa000001-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL,
        'Bole Weekly Equb Started!',
        'Your equb "Bole Weekly Equb" is now active. Cycle 1 has begun.',
        'equb_started', 'both',
        TRUE, 'sent', 'sent',
        '{"deep_link": "equb/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',
        NOW() - INTERVAL '15 days'
    ),
    -- Tigist: contribution_due (cycle 3)
    (
        'aa000002-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '33333333-3333-3333-3333-333333333333',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        'Contribution Due — Cycle 3',
        'Your 1,000 ETB contribution for cycle 3 of "Bole Weekly Equb" is due in 3 days.',
        'contribution_due', 'push',
        FALSE, 'sent', 'skipped',
        '{"deep_link": "cycle/dd000003-dddd-dddd-dddd-dddddddddddd", "amount": 1000}',
        NOW() - INTERVAL '2 days'
    ),
    -- Chaltu: contribution_confirmed (cycle 2)
    (
        'aa000003-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '44444444-4444-4444-4444-444444444444',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'dd000002-dddd-dddd-dddd-dddddddddddd',
        'Payment Confirmed ✅',
        'Your 1,000 ETB contribution for cycle 2 has been confirmed by the organizer.',
        'contribution_confirmed', 'push',
        TRUE, 'sent', 'skipped',
        '{"deep_link": "contribution/ee020003-eeee-eeee-eeee-eeeeeeeeeeee"}',
        NOW() - INTERVAL '7 days'
    ),
    -- Dawit: contribution_due + SMS (late payer)
    (
        'aa000004-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '55555555-5555-5555-5555-555555555555',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        'ⓘ Contribution Reminder',
        'Dawit, your 1,000 ETB payment for Bole Weekly Equb cycle 3 is still pending.',
        'contribution_due', 'sms',
        FALSE, 'skipped', 'sent',
        '{}',
        NOW() - INTERVAL '4 hours'
    ),
    -- Abebe: payout_completed (cycle 1)
    (
        'aa000005-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'dd000001-dddd-dddd-dddd-dddddddddddd',
        '🎉 Payout Sent — 4,000 ETB',
        'Congratulations! Your payout of 4,000 ETB for cycle 1 has been transferred to your CBE account.',
        'payout_completed', 'both',
        TRUE, 'sent', 'sent',
        '{"deep_link": "payout/ff000001-ffff-ffff-ffff-ffffffffffff", "amount": 4000}',
        NOW() - INTERVAL '13 days'
    ),
    -- Tigist: payout_completed (cycle 2)
    (
        'aa000006-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '33333333-3333-3333-3333-333333333333',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'dd000002-dddd-dddd-dddd-dddddddddddd',
        '🎉 Payout Sent — 4,000 ETB',
        'Your payout of 4,000 ETB for cycle 2 has been sent to your Telebirr wallet.',
        'payout_completed', 'both',
        TRUE, 'sent', 'sent',
        '{"deep_link": "payout/ff000002-ffff-ffff-ffff-ffffffffffff", "amount": 4000}',
        NOW() - INTERVAL '6 days'
    ),
    -- Chaltu: payout_ready (cycle 3 — still collecting)
    (
        'aa000007-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '44444444-4444-4444-4444-444444444444',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        '🏦 Your Payout is Coming!',
        'You are the next recipient in "Bole Weekly Equb"! Once all contributions are collected you will receive 4,000 ETB.',
        'payout_ready', 'push',
        FALSE, 'sent', 'skipped',
        '{"deep_link": "payout/ff000003-ffff-ffff-ffff-ffffffffffff"}',
        NOW() - INTERVAL '1 day'
    ),
    -- Hana: equb_invite (Kirkos)
    (
        'aa000008-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '66666666-6666-6666-6666-666666666666',
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL,
        'You have been invited to Kirkos Monthly Equb',
        'Selamawit Girma has invited you to join "Kirkos Monthly Equb". Use code KIRK2026 to join.',
        'equb_invite', 'both',
        TRUE, 'sent', 'sent',
        '{"invite_code": "KIRK2026", "deep_link": "equb/join/KIRK2026"}',
        NOW() - INTERVAL '3 days'
    ),
    -- Chaltu: contribution_submitted notification to organizer
    (
        'aa000009-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'dd000003-dddd-dddd-dddd-dddddddddddd',
        '📋 Payment Submitted by Chaltu',
        'Chaltu Bekele submitted a payment of 1,000 ETB for cycle 3. Please review and confirm.',
        'contribution_submitted', 'in_app',
        FALSE, 'skipped', 'skipped',
        '{"contribution_id": "ee030003-eeee-eeee-eeee-eeeeeeeeeeee"}',
        NOW() - INTERVAL '3 hours'
    ),
    -- Admin: general broadcast
    (
        'aa000010-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        NULL, NULL,
        'System Maintenance — Oct 10 02:00 AM',
        'The Equb platform will undergo maintenance on Oct 10 from 02:00–04:00 AM EAT. Payments may be briefly delayed.',
        'admin', 'in_app',
        FALSE, 'skipped', 'skipped',
        '{}',
        NOW()
    )
ON CONFLICT DO NOTHING;
