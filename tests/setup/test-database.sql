-- Test Database Setup for PixDupe Application
-- Creates test data for comprehensive end-to-end testing

-- Clean up existing test data
DELETE FROM duplicate_checks WHERE user_id LIKE 'test-%';
DELETE FROM image_hashes WHERE user_id LIKE 'test-%';
DELETE FROM file_upload_logs WHERE user_id LIKE 'test-%';
DELETE FROM security_audit_log WHERE user_id LIKE 'test-%';
DELETE FROM profiles WHERE id LIKE 'test-%';

-- Create test users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
VALUES 
  ('test-user-001', 'test.user@example.com', crypt('testpass123', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Test User"}', 'authenticated', 'authenticated'),
  ('test-admin-001', 'test.admin@example.com', crypt('adminpass123', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Test Admin"}', 'authenticated', 'authenticated'),
  ('test-demo-001', 'demo@example.com', crypt('demo123', gen_salt('bf')), now(), now(), now(), '{"provider": "email", "providers": ["email"]}', '{"full_name": "Demo User"}', 'authenticated', 'authenticated');

-- Create test profiles
INSERT INTO profiles (id, email, full_name, role, session_timeout_minutes, created_at, updated_at)
VALUES 
  ('test-user-001', 'test.user@example.com', 'Test User', 'user', 30, now(), now()),
  ('test-admin-001', 'test.admin@example.com', 'Test Admin', 'admin', 60, now(), now()),
  ('test-demo-001', 'demo@example.com', 'Demo User', 'user', 30, now(), now());

-- Assign admin role
INSERT INTO user_roles (user_id, role, assigned_by, created_at)
VALUES ('test-admin-001', 'admin', 'system', now());

-- Create test file upload logs
INSERT INTO file_upload_logs (id, user_id, filename, original_name, file_size, mime_type, storage_path, status, created_at, metadata)
VALUES 
  ('test-upload-001', 'test-user-001', 'test-user-001/sample-image-1.jpg', 'sample-image-1.jpg', 1024000, 'image/jpeg', 'uploads/test-user-001/sample-image-1.jpg', 'completed', now() - interval '2 days', '{"source": "test", "test_data": true}'),
  ('test-upload-002', 'test-user-001', 'test-user-001/sample-image-2.jpg', 'sample-image-2.jpg', 2048000, 'image/jpeg', 'uploads/test-user-001/sample-image-2.jpg', 'completed', now() - interval '1 day', '{"source": "test", "test_data": true}'),
  ('test-upload-003', 'test-admin-001', 'test-admin-001/admin-test.png', 'admin-test.png', 512000, 'image/png', 'uploads/test-admin-001/admin-test.png', 'completed', now() - interval '1 hour', '{"source": "test", "test_data": true, "admin_upload": true}');

-- Create test image hashes
INSERT INTO image_hashes (file_upload_id, user_id, phash, dhash, avg_hash, color_hash, created_at, metadata)
VALUES 
  ('test-upload-001', 'test-user-001', '1111000011110000111100001111000011110000111100001111000011110000', '1010101010101010101010101010101010101010101010101010101010101010', '1100110011001100110011001100110011001100110011001100110011001100', '1111111100000000111111110000000011111111000000001111111100000000', now() - interval '2 days', '{"algorithm_version": "v1.0", "test_data": true}'),
  ('test-upload-002', 'test-user-001', '1111000011110000111100001111000011110000111100001111000011110001', '1010101010101010101010101010101010101010101010101010101010101011', '1100110011001100110011001100110011001100110011001100110011001101', '1111111100000000111111110000000011111111000000001111111100000001', now() - interval '1 day', '{"algorithm_version": "v1.0", "test_data": true}'),
  ('test-upload-003', 'test-admin-001', '0000111100001111000011110000111100001111000011110000111100001111', '0101010101010101010101010101010101010101010101010101010101010101', '0011001100110011001100110011001100110011001100110011001100110011', '0000000011111111000000001111111100000000111111110000000011111111', now() - interval '1 hour', '{"algorithm_version": "v1.0", "test_data": true, "admin_upload": true}');

-- Create test duplicate check results
INSERT INTO duplicate_checks (file_upload_id, user_id, status, duplicates_found, results, created_at, metadata)
VALUES 
  ('test-upload-001', 'test-user-001', 'no_duplicates', 0, '[]', now() - interval '2 days', '{"test_data": true}'),
  ('test-upload-002', 'test-user-001', 'found_duplicates', 1, '[{"similarity": 0.94, "file_id": "test-upload-001", "algorithm": "phash"}]', now() - interval '1 day', '{"test_data": true}'),
  ('test-upload-003', 'test-admin-001', 'no_duplicates', 0, '[]', now() - interval '1 hour', '{"test_data": true, "admin_upload": true}');

-- Create test security audit logs
INSERT INTO security_audit_log (user_id, action, resource, success, ip_address, user_agent, created_at, metadata)
VALUES 
  ('test-user-001', 'login', 'auth', true, '127.0.0.1', 'Test User Agent', now() - interval '2 days', '{"test_data": true}'),
  ('test-user-001', 'file_upload', 'uploads', true, '127.0.0.1', 'Test User Agent', now() - interval '2 days', '{"test_data": true, "file_name": "sample-image-1.jpg"}'),
  ('test-user-001', 'file_upload', 'uploads', true, '127.0.0.1', 'Test User Agent', now() - interval '1 day', '{"test_data": true, "file_name": "sample-image-2.jpg"}'),
  ('test-admin-001', 'login', 'auth', true, '127.0.0.1', 'Test Admin Agent', now() - interval '1 hour', '{"test_data": true, "admin_access": true}'),
  ('test-admin-001', 'admin_access', 'admin_dashboard', true, '127.0.0.1', 'Test Admin Agent', now() - interval '30 minutes', '{"test_data": true, "admin_action": true}');

-- Create test session data (if sessions table exists)
-- INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_activity)
-- VALUES 
--   ('test-user-001', 'test-session-token-001', now() + interval '1 hour', now() - interval '30 minutes', now()),
--   ('test-admin-001', 'test-admin-session-001', now() + interval '2 hours', now() - interval '10 minutes', now());

-- Refresh materialized views if they exist
-- REFRESH MATERIALIZED VIEW IF EXISTS duplicate_statistics;
-- REFRESH MATERIALIZED VIEW IF EXISTS user_activity_summary;

COMMIT;

-- Verify test data creation
SELECT 'Test Users' as table_name, count(*) as test_records FROM profiles WHERE id LIKE 'test-%'
UNION ALL
SELECT 'Test Uploads', count(*) FROM file_upload_logs WHERE user_id LIKE 'test-%'
UNION ALL  
SELECT 'Test Hashes', count(*) FROM image_hashes WHERE user_id LIKE 'test-%'
UNION ALL
SELECT 'Test Duplicates', count(*) FROM duplicate_checks WHERE user_id LIKE 'test-%'
UNION ALL
SELECT 'Test Security Logs', count(*) FROM security_audit_log WHERE user_id LIKE 'test-%';
