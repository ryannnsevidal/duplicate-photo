-- Fix remaining functions without search_path
CREATE OR REPLACE FUNCTION public.require_authentication()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for this operation';
  END IF;
  
  RETURN current_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  client_ip inet;
BEGIN
  -- Get client IP
  client_ip := inet_client_addr();
  IF client_ip IS NULL THEN
    client_ip := '127.0.0.1'::inet;
  END IF;

  -- Ensure authenticated access only
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for role assignments';
  END IF;

  -- Prevent direct admin role insertion without assigned_by
  IF NEW.role = 'admin'::app_role AND NEW.assigned_by IS NULL THEN
    PERFORM log_security_event(
      'admin_role_direct_insert_blocked',
      'user_roles',
      false,
      'Admin role assignment without assigned_by blocked',
      jsonb_build_object(
        'target_user', NEW.user_id,
        'ip_address', client_ip
      )
    );
    RAISE EXCEPTION 'Admin role assignments must include assigned_by field';
  END IF;
  
  -- Prevent self-admin assignment
  IF NEW.role = 'admin'::app_role AND NEW.user_id = current_user_id THEN
    PERFORM log_security_event(
      'self_admin_assignment_blocked',
      'user_roles',
      false,
      'Self-assignment of admin role blocked in trigger',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'ip_address', client_ip
      )
    );
    RAISE EXCEPTION 'Self-assignment of admin role is prohibited';
  END IF;
  
  -- Log all role assignment attempts
  PERFORM log_security_event(
    'role_assignment_attempted',
    'user_roles',
    true,
    NULL,
    jsonb_build_object(
      'user_id', NEW.user_id, 
      'role', NEW.role, 
      'assigned_by', NEW.assigned_by,
      'ip_address', client_ip,
      'security_check', 'trigger_validation'
    )
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_admin_role(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.warn_auth_users_access()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Log security warning
  PERFORM log_security_event(
    'auth_users_direct_access_attempt',
    'auth.users',
    false,
    'Direct access to auth.users table attempted',
    jsonb_build_object('warning', 'Use profiles table instead')
  );
  
  RAISE EXCEPTION 'Direct access to auth.users is not allowed. Use the profiles table instead.';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_security_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Clean expired sessions
  DELETE FROM public.user_sessions 
  WHERE expires_at < now() OR last_activity < (now() - interval '30 days');
  
  -- Clean old rate limit records
  DELETE FROM public.rate_limits 
  WHERE created_at < (now() - interval '7 days');
  
  -- Clean expired captcha verifications
  DELETE FROM public.captcha_verifications 
  WHERE expires_at < now();
  
  -- Clean old captcha attempts (keep 30 days)
  DELETE FROM public.captcha_attempts 
  WHERE timestamp < (now() - interval '30 days');
  
  -- Clean old audit logs (keep 90 days for compliance)
  DELETE FROM public.security_audit_log 
  WHERE created_at < (now() - interval '90 days');
  
  -- Log cleanup operation
  PERFORM log_security_event(
    'security_data_cleanup',
    'system',
    true,
    NULL,
    jsonb_build_object('cleanup_time', now())
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_session_security(session_token text, user_agent text DEFAULT NULL::text, ip_address inet DEFAULT NULL::inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  session_record public.user_sessions%ROWTYPE;
  is_suspicious boolean := false;
BEGIN
  -- Get session record
  SELECT * INTO session_record
  FROM public.user_sessions
  WHERE session_token = $1 AND is_active = true AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check for suspicious activity
  IF ip_address IS NOT NULL AND session_record.ip_address != ip_address THEN
    is_suspicious := true;
  END IF;
  
  IF user_agent IS NOT NULL AND session_record.user_agent != user_agent THEN
    is_suspicious := true;
  END IF;
  
  -- Log suspicious activity
  IF is_suspicious THEN
    PERFORM log_security_event(
      'suspicious_session_activity',
      'user_sessions',
      false,
      'Session validation failed - IP or User-Agent mismatch',
      jsonb_build_object(
        'session_user_id', session_record.user_id,
        'expected_ip', session_record.ip_address,
        'actual_ip', ip_address,
        'expected_user_agent', session_record.user_agent,
        'actual_user_agent', user_agent
      )
    );
    
    -- Invalidate suspicious session
    UPDATE public.user_sessions 
    SET is_active = false 
    WHERE session_token = $1;
    
    RETURN false;
  END IF;
  
  -- Update last activity
  UPDATE public.user_sessions 
  SET last_activity = now() 
  WHERE session_token = $1;
  
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;