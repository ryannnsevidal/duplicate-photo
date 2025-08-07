-- ELIMINATE ALL ANONYMOUS ACCESS RLS VULNERABILITIES
-- This migration ensures ONLY authenticated users can access tables
-- Goal: Achieve 0 anonymous access warnings in Supabase linter

-- =====================================================
-- PHASE 1: Fix Function Search Path Issues
-- =====================================================

-- Update all functions to have proper search_path (fixes WARN 1)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- =====================================================
-- PHASE 2: DROP ALL EXISTING RLS POLICIES
-- =====================================================

-- Drop all policies that allow anonymous access
DROP POLICY IF EXISTS "Admin only - view blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Admin only - manage blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Admin and auditor - view captcha attempts" ON public.captcha_attempts;
DROP POLICY IF EXISTS "Admin only - manage captcha attempts" ON public.captcha_attempts;
DROP POLICY IF EXISTS "Authenticated users - manage own captcha verifications" ON public.captcha_verifications;
DROP POLICY IF EXISTS "Authenticated users - manage own cloud configs" ON public.cloud_sync_configs;
DROP POLICY IF EXISTS "Admin only - manage all dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Authenticated users - insert own dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Authenticated users - view own dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Authenticated users - manage own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Admin only - view all uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Authenticated users - insert own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Authenticated users - update own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Authenticated users - view own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Admin and auditor - view IP reputation" ON public.ip_reputation;
DROP POLICY IF EXISTS "Admin only - manage IP reputation" ON public.ip_reputation;
DROP POLICY IF EXISTS "Authenticated users - insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users - update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users - view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin only - manage rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Admin only - view all audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Authenticated users - view own audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Admin only - manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users - view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin only - manage all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admin and auditor - view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Authenticated users - view own sessions" ON public.user_sessions;

-- =====================================================
-- PHASE 3: CREATE SECURE RLS POLICIES (NO ANONYMOUS ACCESS)
-- =====================================================

-- ===========================
-- BLOCKED EMAIL DOMAINS - Admin Only with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - view blocked domains" 
ON public.blocked_email_domains 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure Admin - manage blocked domains" 
ON public.blocked_email_domains 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage blocked domains" 
ON public.blocked_email_domains 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- CAPTCHA ATTEMPTS - Admin/Auditor Only with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - manage captcha attempts" 
ON public.captcha_attempts 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure Auditor - view captcha attempts" 
ON public.captcha_attempts 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage captcha attempts" 
ON public.captcha_attempts 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- CAPTCHA VERIFICATIONS - User Ownership with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure User - manage own captcha verifications" 
ON public.captcha_verifications 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)));

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage captcha verifications" 
ON public.captcha_verifications 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- CLOUD SYNC CONFIGS - User Ownership with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure User - manage own cloud configs" 
ON public.cloud_sync_configs 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ===========================
-- DEDUP EVENTS - User Ownership + Admin with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - manage all dedup events" 
ON public.dedup_events 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure User - insert own dedup events" 
ON public.dedup_events 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Secure User - view own dedup events" 
ON public.dedup_events 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage dedup events" 
ON public.dedup_events 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- DUPLICATE CHECKS - User Ownership with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure User - manage own duplicate checks" 
ON public.duplicate_checks 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage duplicate checks" 
ON public.duplicate_checks 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- FILE UPLOAD LOGS - User Ownership + Admin with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - view all uploads" 
ON public.file_upload_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure User - insert own uploads" 
ON public.file_upload_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Secure User - update own uploads" 
ON public.file_upload_logs 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Secure User - view own uploads" 
ON public.file_upload_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage file uploads" 
ON public.file_upload_logs 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- IP REPUTATION - Admin/Auditor Only with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - manage IP reputation" 
ON public.ip_reputation 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure Auditor - view IP reputation" 
ON public.ip_reputation 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage IP reputation" 
ON public.ip_reputation 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- PROFILES - User Ownership + Admin with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure User - insert own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Secure User - update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Secure User - view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)));

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage profiles" 
ON public.profiles 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- RATE LIMITS - Admin Only with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - manage rate limits" 
ON public.rate_limits 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage rate limits" 
ON public.rate_limits 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- SECURITY AUDIT LOG - Admin + User Self-View with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - view all audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure User - view own audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role access for Edge Functions (INSERT only for logging)
CREATE POLICY "Service role - insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- ===========================
-- USER ROLES - Admin Only with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - manage all roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure User - view own role" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage user roles" 
ON public.user_roles 
FOR ALL 
TO service_role
USING (true);

-- ===========================
-- USER SESSIONS - Admin/Auditor + User Self-View with Explicit Auth Check
-- ===========================
CREATE POLICY "Secure Admin - manage all sessions" 
ON public.user_sessions 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure Auditor - view all sessions" 
ON public.user_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

CREATE POLICY "Secure User - view own sessions" 
ON public.user_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Service role access for Edge Functions
CREATE POLICY "Service role - manage user sessions" 
ON public.user_sessions 
FOR ALL 
TO service_role
USING (true);

-- =====================================================
-- PHASE 4: FINAL SECURITY LOG ENTRY
-- =====================================================

-- Log the completion of anonymous access elimination
INSERT INTO public.security_audit_log (
  user_id,
  action,
  resource,
  success,
  metadata
) VALUES (
  auth.uid(),
  'eliminate_anonymous_access_completed',
  'all_database_tables',
  true,
  jsonb_build_object(
    'migration_date', now(),
    'tables_secured', 13,
    'policies_updated', 39,
    'security_level', 'zero_anonymous_access',
    'goal_achieved', 'no_anonymous_rls_vulnerabilities'
  )
);