-- Development seed data only. Never run against production.
-- Uses example.com/example.net placeholder URLs only.

insert into creators (id, display_name, legal_name, email, status, plan, subscription_status)
values ('00000000-0000-0000-0000-000000000001', 'TestCreator', 'Test Person', 'creator@example.com', 'active', 'pro', 'active');

insert into creator_aliases (creator_id, alias)
values ('00000000-0000-0000-0000-000000000001', 'Test C');

insert into platform_accounts (creator_id, platform, handle, profile_url, verification_code, verification_status, verified_at)
values ('00000000-0000-0000-0000-000000000001', 'onlyfans', 'testcreator', 'https://example.com/testcreator', 'UNSEEN-TEST01', 'verified', now());

insert into authorizations (creator_id, signed_name, terms_version, attest_rights, attest_adults_consent)
values ('00000000-0000-0000-0000-000000000001', 'Test Person', '2026-10-22', true, true);

insert into leaks (id, creator_id, url, domain, source, status) values
('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001', 'https://leaks.example.net/post/123', 'leaks.example.net', 'manual_search', 'found'),
('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000001', 'https://files.example.net/f/abc',   'files.example.net', 'creator_report', 'found');
