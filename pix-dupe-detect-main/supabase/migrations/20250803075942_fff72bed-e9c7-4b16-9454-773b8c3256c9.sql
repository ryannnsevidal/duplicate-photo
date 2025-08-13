-- Enterprise Security Hardening Migration
-- =============================================

-- 1. CREATE AUDIT LOG TABLE FOR SECURITY MONITORING
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  resource text,
  ip_address inet,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit log (admins only can view)
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- 2. CREATE USER ROLES SYSTEM FOR GRANULAR PERMISSIONS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE SECURITY DEFINER FUNCTIONS TO PREVENT RLS RECURSION
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 4. CREATE FUNCTION TO LOG SECURITY EVENTS
CREATE OR REPLACE FUNCTION public.log_security_event(
  _action text,
  _resource text DEFAULT NULL,
  _success boolean DEFAULT true,
  _error_message text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    success,
    error_message,
    metadata
  ) VALUES (
    auth.uid(),
    _action,
    _resource,
    _success,
    _error_message,
    _metadata
  );
END;
$$;

-- 5. CREATE RATE LIMITING TABLE
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address inet,
  action text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RATE LIMITING FUNCTION
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _action text,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_attempts integer;
  _window_start timestamp with time zone := now() - interval '1 minute' * _window_minutes;
BEGIN
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < _window_start;
  
  -- Get current attempts for this user/action
  SELECT COALESCE(SUM(attempts), 0)
  INTO _current_attempts
  FROM public.rate_limits
  WHERE user_id = _user_id
    AND action = _action
    AND window_start >= _window_start;
  
  -- If under limit, increment counter and allow
  IF _current_attempts < _max_attempts THEN
    INSERT INTO public.rate_limits (user_id, action, attempts, window_start)
    VALUES (_user_id, _action, 1, now())
    ON CONFLICT (user_id, action) 
    DO UPDATE SET 
      attempts = rate_limits.attempts + 1,
      updated_at = now();
    
    RETURN true;
  END IF;
  
  -- Over limit, block user
  UPDATE public.rate_limits 
  SET blocked_until = now() + interval '1 hour'
  WHERE user_id = _user_id AND action = _action;
  
  RETURN false;
END;
$$;

-- 7. ENHANCE DUPLICATE_CHECKS TABLE SECURITY
-- Add audit triggers to existing table
CREATE OR REPLACE FUNCTION public.audit_duplicate_checks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'duplicate_check_created',
      'duplicate_checks',
      true,
      NULL,
      jsonb_build_object('record_id', NEW.id, 'filename', NEW.original_filename)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'duplicate_check_updated',
      'duplicate_checks',
      true,
      NULL,
      jsonb_build_object('record_id', NEW.id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      'duplicate_check_deleted',
      'duplicate_checks',
      true,
      NULL,
      jsonb_build_object('record_id', OLD.id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create audit trigger
DROP TRIGGER IF EXISTS audit_duplicate_checks_trigger ON public.duplicate_checks;
CREATE TRIGGER audit_duplicate_checks_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.duplicate_checks
  FOR EACH ROW EXECUTE FUNCTION public.audit_duplicate_checks();

-- 8. CREATE COMPREHENSIVE RLS POLICIES

-- User roles policies
CREATE POLICY "Users can view their own role"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Security audit log policies
CREATE POLICY "Admins can view all audit logs"
  ON public.security_audit_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own audit logs"
  ON public.security_audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Rate limits policies (admins only)
CREATE POLICY "Admins can manage rate limits"
  ON public.rate_limits
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 9. ADD MISSING POLICIES TO DUPLICATE_CHECKS FOR COMPLETE CRUD
CREATE POLICY "Users can update their own duplicate checks"
  ON public.duplicate_checks
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own duplicate checks"
  ON public.duplicate_checks
  FOR DELETE
  USING (user_id = auth.uid());

-- 10. CREATE INDEXES FOR PERFORMANCE AND SECURITY
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action ON public.security_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id_action ON public.rate_limits(user_id, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON public.rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_duplicate_checks_user_id ON public.duplicate_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_checks_created_at ON public.duplicate_checks(created_at);

-- 11. ASSIGN FIRST USER AS ADMIN (Run this after first user signs up)
-- INSERT INTO public.user_roles (user_id, role, assigned_by)
-- SELECT id, 'admin', id
-- FROM auth.users
-- ORDER BY created_at
-- LIMIT 1
-- ON CONFLICT (user_id, role) DO NOTHING;