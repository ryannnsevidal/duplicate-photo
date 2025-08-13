-- PHASE 1B: Fix Anonymous Access Policies
-- Address all anonymous access vulnerabilities identified by the linter

-- Fix all policies to require authenticated users only
-- Replace 'authenticated' role with proper role checks to prevent anonymous access

-- 1. Fix blocked_email_domains policies
DROP POLICY IF EXISTS "Admins can check blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Admins can manage blocked domains" ON public.blocked_email_domains;

CREATE POLICY "Authenticated admins can check blocked domains" ON public.blocked_email_domains
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated admins can manage blocked domains" ON public.blocked_email_domains
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix captcha_attempts policies
DROP POLICY IF EXISTS "Admins can manage captcha attempts" ON public.captcha_attempts;
DROP POLICY IF EXISTS "Auditors can view captcha attempts" ON public.captcha_attempts;

CREATE POLICY "Authenticated admins can manage captcha attempts" ON public.captcha_attempts
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated auditors can view captcha attempts" ON public.captcha_attempts
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- 3. Fix captcha_verifications policies
DROP POLICY IF EXISTS "Users can manage their own captcha verifications" ON public.captcha_verifications;

CREATE POLICY "Authenticated users can manage their own captcha verifications" ON public.captcha_verifications
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)));

-- 4. Fix cloud_sync_configs policies
DROP POLICY IF EXISTS "Users can manage their own cloud configs" ON public.cloud_sync_configs;

CREATE POLICY "Authenticated users can manage their own cloud configs" ON public.cloud_sync_configs
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 5. Fix dedup_events policies
DROP POLICY IF EXISTS "Admins can view all dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Users can view their own dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Users can insert their own dedup events" ON public.dedup_events;

CREATE POLICY "Authenticated admins can view all dedup events" ON public.dedup_events
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view their own dedup events" ON public.dedup_events
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own dedup events" ON public.dedup_events
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 6. Fix duplicate_checks policies
DROP POLICY IF EXISTS "Users can delete their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can update their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can view their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can insert their own duplicate checks" ON public.duplicate_checks;

CREATE POLICY "Authenticated users can view their own duplicate checks" ON public.duplicate_checks
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own duplicate checks" ON public.duplicate_checks
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own duplicate checks" ON public.duplicate_checks
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can delete their own duplicate checks" ON public.duplicate_checks
FOR DELETE TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 7. Fix file_upload_logs policies
DROP POLICY IF EXISTS "Admins can view all uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users can update their own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users can create their own uploads" ON public.file_upload_logs;

CREATE POLICY "Authenticated users can view their own uploads" ON public.file_upload_logs
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own uploads" ON public.file_upload_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own uploads" ON public.file_upload_logs
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated admins can view all uploads" ON public.file_upload_logs
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 8. Fix ip_reputation policies
DROP POLICY IF EXISTS "Admins can manage IP reputation" ON public.ip_reputation;
DROP POLICY IF EXISTS "Auditors can view IP reputation" ON public.ip_reputation;

CREATE POLICY "Authenticated admins can manage IP reputation" ON public.ip_reputation
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated auditors can view IP reputation" ON public.ip_reputation
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- 9. Fix profiles policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 10. Fix rate_limits policies
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.rate_limits;

CREATE POLICY "Authenticated admins can manage rate limits" ON public.rate_limits
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- 11. Fix security_audit_log policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.security_audit_log;

CREATE POLICY "Authenticated admins can view all audit logs" ON public.security_audit_log
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view their own audit logs" ON public.security_audit_log
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 12. Fix user_roles policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Authenticated admins can manage all roles" ON public.user_roles
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view their own role" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 13. Fix user_sessions policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Auditors can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;

CREATE POLICY "Authenticated admins can view all sessions" ON public.user_sessions
FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated auditors can view all sessions" ON public.user_sessions
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Authenticated users can view their own sessions" ON public.user_sessions
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 14. Add function search path fixes
CREATE OR REPLACE FUNCTION public.check_duplicates_rpc(file_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Simple mock duplicate detection
  -- In production, this would call your FastAPI backend or implement actual duplicate logic
  result := jsonb_build_object(
    'duplicates', jsonb_build_array(
      jsonb_build_object('filename', 'sample_duplicate.jpg', 'score', 0.95),
      jsonb_build_object('filename', 'another_match.png', 'score', 0.82)
    ),
    'success', true,
    'message', 'Duplicate check completed'
  );
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_admin_role(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  -- Insert admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  PERFORM public.log_security_event(
    'admin_role_assigned',
    'user_roles',
    true,
    NULL,
    jsonb_build_object('target_user_id', target_user_id, 'target_email', user_email)
  );
END;
$$;