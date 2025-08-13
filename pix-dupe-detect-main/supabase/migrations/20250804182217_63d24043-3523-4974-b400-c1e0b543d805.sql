-- Comprehensive RLS Security Hardening - Eliminate All Anonymous Access
-- This migration updates all RLS policies to explicitly require authenticated users
-- and eliminates all anonymous access vulnerabilities

-- =============================================================================
-- 1. BLOCKED_EMAIL_DOMAINS - Admin-only access with explicit auth checks
-- =============================================================================

DROP POLICY IF EXISTS "Admin only - manage blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Admin only - view blocked domains" ON public.blocked_email_domains;

-- Admin-only policies with explicit authentication
CREATE POLICY "Admin only - manage blocked domains" 
ON public.blocked_email_domains 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin only - view blocked domains" 
ON public.blocked_email_domains 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Service role access for Edge Functions
CREATE POLICY "Service role - full access blocked domains" 
ON public.blocked_email_domains 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 2. CAPTCHA_ATTEMPTS - Admin/Auditor view, Admin manage
-- =============================================================================

DROP POLICY IF EXISTS "Admin and auditor - view captcha attempts" ON public.captcha_attempts;
DROP POLICY IF EXISTS "Admin only - manage captcha attempts" ON public.captcha_attempts;

CREATE POLICY "Admin and auditor - view captcha attempts" 
ON public.captcha_attempts 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

CREATE POLICY "Admin only - manage captcha attempts" 
ON public.captcha_attempts 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access captcha attempts" 
ON public.captcha_attempts 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 3. CAPTCHA_VERIFICATIONS - User-owned data with admin override
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users - manage own captcha verifications" ON public.captcha_verifications;

CREATE POLICY "Users - manage own captcha verifications" 
ON public.captcha_verifications 
FOR ALL 
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Service role - full access captcha verifications" 
ON public.captcha_verifications 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 4. CLOUD_SYNC_CONFIGS - User-owned configurations
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users - manage own cloud configs" ON public.cloud_sync_configs;

CREATE POLICY "Users - manage own cloud configs" 
ON public.cloud_sync_configs 
FOR ALL 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admin - view all cloud configs" 
ON public.cloud_sync_configs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access cloud configs" 
ON public.cloud_sync_configs 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 5. DEDUP_EVENTS - User-owned with admin management
-- =============================================================================

DROP POLICY IF EXISTS "Admin only - manage all dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Authenticated users - insert own dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Authenticated users - view own dedup events" ON public.dedup_events;

CREATE POLICY "Users - view own dedup events" 
ON public.dedup_events 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users - insert own dedup events" 
ON public.dedup_events 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admin - manage all dedup events" 
ON public.dedup_events 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access dedup events" 
ON public.dedup_events 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 6. DUPLICATE_CHECKS - User-owned data
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users - manage own duplicate checks" ON public.duplicate_checks;

CREATE POLICY "Users - manage own duplicate checks" 
ON public.duplicate_checks 
FOR ALL 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admin - view all duplicate checks" 
ON public.duplicate_checks 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access duplicate checks" 
ON public.duplicate_checks 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 7. FILE_UPLOAD_LOGS - User-owned with admin view
-- =============================================================================

DROP POLICY IF EXISTS "Admin only - view all uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Authenticated users - insert own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Authenticated users - update own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Authenticated users - view own uploads" ON public.file_upload_logs;

CREATE POLICY "Users - view own uploads" 
ON public.file_upload_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users - insert own uploads" 
ON public.file_upload_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users - update own uploads" 
ON public.file_upload_logs 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admin - view all uploads" 
ON public.file_upload_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access uploads" 
ON public.file_upload_logs 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 8. IP_REPUTATION - Admin/Auditor access only
-- =============================================================================

DROP POLICY IF EXISTS "Admin and auditor - view IP reputation" ON public.ip_reputation;
DROP POLICY IF EXISTS "Admin only - manage IP reputation" ON public.ip_reputation;

CREATE POLICY "Admin and auditor - view IP reputation" 
ON public.ip_reputation 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

CREATE POLICY "Admin - manage IP reputation" 
ON public.ip_reputation 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access IP reputation" 
ON public.ip_reputation 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 9. PROFILES - User-owned with admin view
-- =============================================================================

DROP POLICY IF EXISTS "Authenticated users - insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users - update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users - view profiles" ON public.profiles;

CREATE POLICY "Users - view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users - insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users - update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Service role - full access profiles" 
ON public.profiles 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 10. RATE_LIMITS - Admin-only management
-- =============================================================================

DROP POLICY IF EXISTS "Admin only - manage rate limits" ON public.rate_limits;

CREATE POLICY "Admin - manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access rate limits" 
ON public.rate_limits 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 11. SECURITY_AUDIT_LOG - User view own, Admin view all
-- =============================================================================

DROP POLICY IF EXISTS "Admin only - view all audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Authenticated users - view own audit logs" ON public.security_audit_log;

CREATE POLICY "Users - view own audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admin - view all audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access audit logs" 
ON public.security_audit_log 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 12. USER_ROLES - Admin management, users view own
-- =============================================================================

DROP POLICY IF EXISTS "Admin only - manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users - view own role" ON public.user_roles;

CREATE POLICY "Users - view own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admin - manage all roles" 
ON public.user_roles 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access user roles" 
ON public.user_roles 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- 13. USER_SESSIONS - Admin/Auditor view all, users view own
-- =============================================================================

DROP POLICY IF EXISTS "Admin and auditor - view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admin only - manage all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Authenticated users - view own sessions" ON public.user_sessions;

CREATE POLICY "Users - view own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admin and auditor - view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

CREATE POLICY "Admin - manage all sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role - full access user sessions" 
ON public.user_sessions 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- =============================================================================
-- SECURITY AUDIT LOG ENTRY
-- =============================================================================

-- Log the completion of this comprehensive security hardening
INSERT INTO public.security_audit_log (
  action, 
  resource, 
  success, 
  metadata
) VALUES (
  'comprehensive_rls_security_hardening',
  'all_tables',
  true,
  jsonb_build_object(
    'updated_tables', ARRAY[
      'blocked_email_domains',
      'captcha_attempts', 
      'captcha_verifications',
      'cloud_sync_configs',
      'dedup_events',
      'duplicate_checks',
      'file_upload_logs',
      'ip_reputation',
      'profiles',
      'rate_limits',
      'security_audit_log',
      'user_roles',
      'user_sessions'
    ],
    'security_level', 'maximum',
    'anonymous_access_eliminated', true,
    'migration_timestamp', now()
  )
);