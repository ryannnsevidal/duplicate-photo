-- Fix security issues and implement proper role-based access control (corrected version)

-- 1. Create admin user assignment function
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

-- 2. Create function to get user role efficiently
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 3. Create CAPTCHA verification table
CREATE TABLE IF NOT EXISTS public.captcha_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet NOT NULL,
  action_type text NOT NULL,
  captcha_token text NOT NULL,
  verified_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on captcha verifications
ALTER TABLE public.captcha_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy for captcha verifications
CREATE POLICY "Users can manage their own captcha verifications" 
ON public.captcha_verifications 
FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Create function to verify CAPTCHA
CREATE OR REPLACE FUNCTION public.verify_captcha(
  _captcha_token text,
  _action_type text,
  _ip_address inet DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  -- Insert captcha verification record
  INSERT INTO public.captcha_verifications (
    user_id, 
    ip_address, 
    action_type, 
    captcha_token
  ) VALUES (
    _user_id,
    COALESCE(_ip_address, '0.0.0.0'::inet),
    _action_type,
    _captcha_token
  );
  
  -- In production, this would validate with reCAPTCHA/hCaptcha API
  -- For now, return true if token is provided
  RETURN (_captcha_token IS NOT NULL AND length(_captcha_token) > 10);
END;
$$;

-- 5. Assign admin role to the current user (uncomment and update email as needed)
-- SELECT public.assign_admin_role('rsevidal117@gmail.com');