-- Create a system function to assign initial admin role (bypasses auth requirement for setup)
CREATE OR REPLACE FUNCTION public.system_assign_admin_role(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Insert admin role directly (system function)
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, 'admin'::app_role, target_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Log the role assignment
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    success,
    metadata,
    ip_address
  ) VALUES (
    target_user_id,
    'system_admin_role_assigned',
    'user_roles',
    true,
    jsonb_build_object('target_email', user_email, 'role', 'admin'),
    '127.0.0.1'::inet
  );
  
  RETURN true;
END;
$function$;

-- Assign admin role to the specified email
SELECT public.system_assign_admin_role('rsevidal117@gmail.com');

-- Verify the assignment
SELECT 
  u.email,
  ur.role,
  ur.assigned_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'rsevidal117@gmail.com';