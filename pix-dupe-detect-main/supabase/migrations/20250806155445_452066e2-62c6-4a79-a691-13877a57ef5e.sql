-- Add session management improvements
CREATE OR REPLACE FUNCTION public.create_or_update_session(
  _user_id UUID,
  _session_token TEXT,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _session_id UUID;
  _existing_count INTEGER;
BEGIN
  -- Check if user already has an active session
  SELECT COUNT(*) INTO _existing_count
  FROM public.user_sessions
  WHERE user_id = _user_id AND is_active = true;
  
  -- If user has existing sessions, deactivate them (single session per user)
  IF _existing_count > 0 THEN
    UPDATE public.user_sessions
    SET is_active = false
    WHERE user_id = _user_id AND is_active = true;
    
    PERFORM log_security_event(
      'previous_sessions_deactivated',
      'user_sessions',
      true,
      NULL,
      jsonb_build_object(
        'user_id', _user_id,
        'deactivated_sessions', _existing_count,
        'reason', 'new_session_created'
      )
    );
  END IF;
  
  -- Create new session
  INSERT INTO public.user_sessions (
    user_id,
    session_token,
    ip_address,
    user_agent,
    is_active,
    expires_at
  ) VALUES (
    _user_id,
    _session_token,
    _ip_address,
    _user_agent,
    true,
    now() + interval '24 hours'
  ) RETURNING id INTO _session_id;
  
  -- Log session creation
  PERFORM log_security_event(
    'session_created',
    'user_sessions',
    true,
    NULL,
    jsonb_build_object(
      'user_id', _user_id,
      'session_id', _session_id,
      'ip_address', _ip_address
    )
  );
  
  RETURN _session_id;
END;
$$;

-- Add function to automatically assign admin role to specific email
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-assign admin role to rsevidal117@gmail.com
  IF NEW.email = 'rsevidal117@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'admin'::app_role, NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    PERFORM log_security_event(
      'auto_admin_role_assigned',
      'user_roles',
      true,
      NULL,
      jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'trigger', 'auto_assignment'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto admin assignment
DROP TRIGGER IF EXISTS auto_assign_admin_role_trigger ON auth.users;
CREATE TRIGGER auto_assign_admin_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();