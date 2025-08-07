-- Fix Anonymous Access Security Warnings
-- This migration updates all RLS policies to require authentication first

-- 1. BLOCKED_EMAIL_DOMAINS TABLE
DROP POLICY IF EXISTS "Admins can manage blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "All authenticated users can check blocked domains" ON public.blocked_email_domains;

CREATE POLICY "Admins can manage blocked domains" 
ON public.blocked_email_domains FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can check blocked domains" 
ON public.blocked_email_domains FOR SELECT 
TO authenticated 
USING (true);

-- 2. CAPTCHA_ATTEMPTS TABLE
DROP POLICY IF EXISTS "Admins can manage captcha attempts" ON public.captcha_attempts;
DROP POLICY IF EXISTS "Auditors can view captcha attempts" ON public.captcha_attempts;

CREATE POLICY "Admins can manage captcha attempts" 
ON public.captcha_attempts FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors can view captcha attempts" 
ON public.captcha_attempts FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. CAPTCHA_VERIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can manage their own captcha verifications" ON public.captcha_verifications;

CREATE POLICY "Users can manage their own captcha verifications" 
ON public.captcha_verifications FOR ALL 
TO authenticated 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- 4. CLOUD_SYNC_CONFIGS TABLE
DROP POLICY IF EXISTS "Users can manage their own cloud configs" ON public.cloud_sync_configs;

CREATE POLICY "Users can manage their own cloud configs" 
ON public.cloud_sync_configs FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. DEDUP_EVENTS TABLE
DROP POLICY IF EXISTS "Admins can view all dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Users can insert their own dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Users can view their own dedup events" ON public.dedup_events;

CREATE POLICY "Admins can view all dedup events" 
ON public.dedup_events FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own dedup events" 
ON public.dedup_events FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own dedup events" 
ON public.dedup_events FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- 6. DUPLICATE_CHECKS TABLE
DROP POLICY IF EXISTS "Users can delete their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can insert their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can update their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can view their own duplicate checks" ON public.duplicate_checks;

CREATE POLICY "Users can delete their own duplicate checks" 
ON public.duplicate_checks FOR DELETE 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own duplicate checks" 
ON public.duplicate_checks FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own duplicate checks" 
ON public.duplicate_checks FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own duplicate checks" 
ON public.duplicate_checks FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 7. FILE_UPLOAD_LOGS TABLE
DROP POLICY IF EXISTS "Admins can view all uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users can create their own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users can update their own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.file_upload_logs;

CREATE POLICY "Admins can view all uploads" 
ON public.file_upload_logs FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own uploads" 
ON public.file_upload_logs FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" 
ON public.file_upload_logs FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own uploads" 
ON public.file_upload_logs FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 8. IP_REPUTATION TABLE
DROP POLICY IF EXISTS "Admins can manage IP reputation" ON public.ip_reputation;
DROP POLICY IF EXISTS "Auditors can view IP reputation" ON public.ip_reputation;

CREATE POLICY "Admins can manage IP reputation" 
ON public.ip_reputation FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors can view IP reputation" 
ON public.ip_reputation FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 9. PROFILES TABLE
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 10. RATE_LIMITS TABLE
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.rate_limits;

CREATE POLICY "Admins can manage rate limits" 
ON public.rate_limits FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 11. SECURITY_AUDIT_LOG TABLE
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.security_audit_log;

CREATE POLICY "Admins can view all audit logs" 
ON public.security_audit_log FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own audit logs" 
ON public.security_audit_log FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- 12. USER_ROLES TABLE
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- 13. USER_SESSIONS TABLE
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Auditors can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;

CREATE POLICY "Admins can view all sessions" 
ON public.user_sessions FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors can view all sessions" 
ON public.user_sessions FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());