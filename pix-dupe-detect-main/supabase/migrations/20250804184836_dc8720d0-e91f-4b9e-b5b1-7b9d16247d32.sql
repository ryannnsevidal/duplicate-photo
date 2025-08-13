-- Fix search_path vulnerabilities in database functions
-- Add SET search_path = 'public' to functions missing it

-- Fix secure_assign_role function
CREATE OR REPLACE FUNCTION public.secure_assign_role(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  assigner_is_admin boolean;
  current_user_id uuid := auth.uid();
  client_ip inet;
BEGIN
  -- Ensure user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get client IP for logging
  client_ip := inet_client_addr();
  IF client_ip IS NULL THEN
    client_ip := '127.0.0.1'::inet;
  END IF;

  -- Check if the person assigning the role is an admin
  SELECT has_role(current_user_id, 'admin'::app_role) INTO assigner_is_admin;
  
  IF NOT assigner_is_admin THEN
    -- Log unauthorized attempt
    PERFORM log_security_event(
      'unauthorized_role_assignment_attempt',
      'user_roles',
      false,
      'Non-admin user attempted role assignment',
      jsonb_build_object(
        'target_user', target_user_id,
        'attempted_role', new_role,
        'unauthorized_user', current_user_id,
        'ip_address', client_ip
      )
    );
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- CRITICAL: Prevent self-role assignment to admin (prevents privilege escalation)
  IF target_user_id = current_user_id AND new_role = 'admin'::app_role THEN
    PERFORM log_security_event(
      'self_admin_assignment_blocked',
      'user_roles',
      false,
      'Self-assignment of admin role blocked',
      jsonb_build_object(
        'user_id', current_user_id,
        'ip_address', client_ip,
        'security_level', 'critical'
      )
    );
    RAISE EXCEPTION 'Cannot assign admin role to yourself - security violation';
  END IF;
  
  -- Enhanced validation for admin role assignment
  IF new_role = 'admin'::app_role THEN
    -- Log the admin assignment attempt for security audit
    PERFORM log_security_event(
      'admin_role_assignment_attempted',
      'user_roles',
      true,
      NULL,
      jsonb_build_object(
        'target_user', target_user_id, 
        'assigned_by', current_user_id,
        'ip_address', client_ip,
        'security_level', 'critical'
      )
    );
  END IF;
  
  -- Upsert the role with enhanced logging
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, new_role, current_user_id)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    assigned_by = current_user_id, 
    assigned_at = now();
  
  -- Log the successful assignment
  PERFORM log_security_event(
    'role_assigned',
    'user_roles',
    true,
    NULL,
    jsonb_build_object(
      'target_user', target_user_id, 
      'role', new_role,
      'assigned_by', current_user_id,
      'ip_address', client_ip
    )
  );
  
  RETURN true;
END;
$function$;

-- Fix get_current_user_role function  
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$function$;

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = $1
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'auditor' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;
$function$;

-- Fix has_role function to require authentication
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  ) AND _user_id IS NOT NULL;
$function$;

-- Update RLS policies to require authentication explicitly

-- Fix user_roles policies
DROP POLICY IF EXISTS "Admins - all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users - own role view" ON public.user_roles;

CREATE POLICY "Admins - all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users - own role view"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Fix profiles policies
DROP POLICY IF EXISTS "Users - profile view" ON public.profiles;
DROP POLICY IF EXISTS "Users - own profile update" ON public.profiles;
DROP POLICY IF EXISTS "Users - own profile insert" ON public.profiles;

CREATE POLICY "Users - profile view"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Users - own profile update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users - own profile insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix file_upload_logs policies
DROP POLICY IF EXISTS "Users - own file uploads view" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users - own file uploads update" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Users - own file uploads insert" ON public.file_upload_logs;
DROP POLICY IF EXISTS "Admins - all file uploads view" ON public.file_upload_logs;

CREATE POLICY "Users - own file uploads view"
ON public.file_upload_logs
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users - own file uploads update"
ON public.file_upload_logs
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users - own file uploads insert"
ON public.file_upload_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins - all file uploads view"
ON public.file_upload_logs
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Fix duplicate_checks policies
DROP POLICY IF EXISTS "Users - own duplicate checks" ON public.duplicate_checks;

CREATE POLICY "Users - own duplicate checks"
ON public.duplicate_checks
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Fix dedup_events policies
DROP POLICY IF EXISTS "Users - own dedup events view" ON public.dedup_events;
DROP POLICY IF EXISTS "Users - own dedup events insert" ON public.dedup_events;
DROP POLICY IF EXISTS "Admins - all dedup events" ON public.dedup_events;

CREATE POLICY "Users - own dedup events view"
ON public.dedup_events
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users - own dedup events insert"
ON public.dedup_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins - all dedup events"
ON public.dedup_events
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Fix security_audit_log policies
DROP POLICY IF EXISTS "Users - own audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Admins - all audit logs" ON public.security_audit_log;

CREATE POLICY "Users - own audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins - all audit logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Fix cloud_sync_configs policies
DROP POLICY IF EXISTS "Users - own cloud configs" ON public.cloud_sync_configs;

CREATE POLICY "Users - own cloud configs"
ON public.cloud_sync_configs
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix captcha_verifications policies
DROP POLICY IF EXISTS "Users - own captcha verifications" ON public.captcha_verifications;

CREATE POLICY "Users - own captcha verifications"
ON public.captcha_verifications
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)))
WITH CHECK (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)));

-- Fix admin role policies (these should remain authenticated only)
DROP POLICY IF EXISTS "Admins only - blocked domains manage" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Admins only - blocked domains view" ON public.blocked_email_domains;
DROP POLICY IF EXISTS "Admins only - captcha attempts manage" ON public.captcha_attempts;
DROP POLICY IF EXISTS "Auditors - captcha attempts view" ON public.captcha_attempts;
DROP POLICY IF EXISTS "Admins - IP reputation manage" ON public.ip_reputation;
DROP POLICY IF EXISTS "Auditors - IP reputation view" ON public.ip_reputation;
DROP POLICY IF EXISTS "Admins - rate limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Admins - all sessions manage" ON public.user_sessions;
DROP POLICY IF EXISTS "Auditors - all sessions view" ON public.user_sessions;
DROP POLICY IF EXISTS "Users - own sessions view" ON public.user_sessions;

CREATE POLICY "Admins only - blocked domains manage"
ON public.blocked_email_domains
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins only - blocked domains view"
ON public.blocked_email_domains
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins only - captcha attempts manage"
ON public.captcha_attempts
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors - captcha attempts view"
ON public.captcha_attempts
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

CREATE POLICY "Admins - IP reputation manage"
ON public.ip_reputation
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors - IP reputation view"
ON public.ip_reputation
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

CREATE POLICY "Admins - rate limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins - all sessions manage"
ON public.user_sessions
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Auditors - all sessions view"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'auditor'::app_role)));

CREATE POLICY "Users - own sessions view"
ON public.user_sessions
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());