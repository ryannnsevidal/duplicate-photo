-- CRITICAL SECURITY FIXES MIGRATION
-- Addresses all security vulnerabilities identified in the security review

-- 1. Fix user_roles table policies (prevent role escalation)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 2. Secure role assignment function
CREATE OR REPLACE FUNCTION public.secure_assign_role(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigner_is_admin boolean;
BEGIN
  -- Check if the person assigning the role is an admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO assigner_is_admin;
  
  IF NOT assigner_is_admin THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- Prevent self-role assignment to admin (security measure)
  IF target_user_id = auth.uid() AND new_role = 'admin'::app_role THEN
    RAISE EXCEPTION 'Cannot assign admin role to yourself';
  END IF;
  
  -- Upsert the role
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, new_role, auth.uid())
  ON CONFLICT (user_id, role) 
  DO UPDATE SET assigned_by = auth.uid(), assigned_at = now();
  
  -- Log the assignment
  PERFORM log_security_event(
    'role_assigned',
    'user_roles',
    true,
    NULL,
    jsonb_build_object('target_user', target_user_id, 'role', new_role)
  );
  
  RETURN true;
END;
$$;

-- 3. Fix profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Fix duplicate_checks table policies
DROP POLICY IF EXISTS "Users can view their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can insert their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can update their own duplicate checks" ON public.duplicate_checks;
DROP POLICY IF EXISTS "Users can delete their own duplicate checks" ON public.duplicate_checks;

CREATE POLICY "Users can view their own duplicate checks" ON public.duplicate_checks
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own duplicate checks" ON public.duplicate_checks
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own duplicate checks" ON public.duplicate_checks
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own duplicate checks" ON public.duplicate_checks
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 5. Fix file_upload_logs table policies
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users can create their own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users can update their own uploads" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Admins can view all uploads" ON public.file_upload_logs;

CREATE POLICY "Users can view their own uploads" ON public.file_upload_logs
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own uploads" ON public.file_upload_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads" ON public.file_upload_logs
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all uploads" ON public.file_upload_logs
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Fix dedup_events table policies
DROP POLICY IF EXISTS "Users can view their own dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Users can insert their own dedup events" ON public.dedup_events;
DROP POLICY IF EXISTS "Admins can view all dedup events" ON public.dedup_events;

CREATE POLICY "Users can view their own dedup events" ON public.dedup_events
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own dedup events" ON public.dedup_events
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all dedup events" ON public.dedup_events
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. Fix cloud_sync_configs table policies
DROP POLICY IF EXISTS "Users can manage their own cloud configs" ON public.cloud_sync_configs;

CREATE POLICY "Users can manage their own cloud configs" ON public.cloud_sync_configs
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Fix captcha_verifications table policies
DROP POLICY IF EXISTS "Users can manage their own captcha verifications" ON public.captcha_verifications;

CREATE POLICY "Users can manage their own captcha verifications" ON public.captcha_verifications
FOR ALL TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 9. Fix blocked_email_domains table policies
DROP POLICY IF EXISTS "Admins can check blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Admins can manage blocked domains" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Service role can check blocked domains" ON public.blocked_email_domains;

CREATE POLICY "Admins can check blocked domains" ON public.blocked_email_domains
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage blocked domains" ON public.blocked_email_domains
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can check blocked domains" ON public.blocked_email_domains
FOR SELECT TO service_role
USING (true);

-- 10. Fix rate_limits table policies
DROP POLICY IF EXISTS "Admins can manage rate limits" ON public.rate_limits;

CREATE POLICY "Admins can manage rate limits" ON public.rate_limits
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 11. Fix ip_reputation table policies
DROP POLICY IF EXISTS "Admins can manage IP reputation" ON public.ip_reputation;
DROP POLICY IF EXISTS "Auditors can view IP reputation" ON public.ip_reputation;

CREATE POLICY "Admins can manage IP reputation" ON public.ip_reputation
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors can view IP reputation" ON public.ip_reputation
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 12. Fix captcha_attempts table policies
DROP POLICY IF EXISTS "Admins can manage captcha attempts" ON public.captcha_attempts;
DROP POLICY IF EXISTS "Auditors can view captcha attempts" ON public.captcha_attempts;

CREATE POLICY "Admins can manage captcha attempts" ON public.captcha_attempts
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors can view captcha attempts" ON public.captcha_attempts
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 13. Fix security_audit_log table policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.security_audit_log;

CREATE POLICY "Admins can view all audit logs" ON public.security_audit_log
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own audit logs" ON public.security_audit_log
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 14. Fix user_sessions table policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Auditors can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;

CREATE POLICY "Admins can view all sessions" ON public.user_sessions
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors can view all sessions" ON public.user_sessions
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'auditor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own sessions" ON public.user_sessions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 15. Add validation trigger to prevent unauthorized role assignments
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from directly inserting admin roles without proper authorization
  IF NEW.role = 'admin'::app_role AND NEW.assigned_by IS NULL THEN
    RAISE EXCEPTION 'Admin role assignments must include assigned_by field';
  END IF;
  
  -- Log all role assignments
  PERFORM log_security_event(
    'role_assignment_attempted',
    'user_roles',
    true,
    NULL,
    jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role, 'assigned_by', NEW.assigned_by)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;
CREATE TRIGGER validate_role_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_assignment();