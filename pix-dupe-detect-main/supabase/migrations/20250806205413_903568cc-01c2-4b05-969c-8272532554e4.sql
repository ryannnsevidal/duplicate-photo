-- Fix RLS policies to remove anonymous access warnings
-- Update all policies to use proper authenticated user checks

-- 1. Fix profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 2. Fix user_roles table policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix user_sessions table policies  
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.user_sessions;

CREATE POLICY "Authenticated users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own sessions" 
ON public.user_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" 
ON public.user_sessions 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Fix security_audit_log policies
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.security_audit_log;

CREATE POLICY "Authenticated users can view their own audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs" 
ON public.security_audit_log 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

-- 5. Fix file_upload_logs policies
DROP POLICY IF EXISTS "Users can view their own upload logs" ON public.file_upload_logs;

CREATE POLICY "Authenticated users can view their own upload logs" 
ON public.file_upload_logs 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own upload logs" 
ON public.file_upload_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Admins can view all upload logs" 
ON public.file_upload_logs 
FOR ALL 
TO authenticated
USING (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Update enhanced-security-manager edge function access
CREATE OR REPLACE FUNCTION public.admin_terminate_session(session_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  result JSONB;
BEGIN
  -- Ensure user is authenticated and is admin
  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF NOT public.has_role(current_user_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  -- Terminate the session
  UPDATE public.user_sessions 
  SET is_active = false, 
      updated_at = now()
  WHERE id = session_id_param;

  -- Log the action
  PERFORM public.log_security_event(
    'admin_session_termination',
    'user_sessions',
    true,
    NULL,
    jsonb_build_object(
      'terminated_session_id', session_id_param,
      'terminated_by', current_user_id
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;