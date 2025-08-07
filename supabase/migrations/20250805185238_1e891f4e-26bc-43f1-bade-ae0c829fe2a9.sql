-- Ensure admin role exists for the specified email
-- First, let's make sure the user exists and assign admin role

-- Insert admin role for the specified email if user exists
INSERT INTO public.user_roles (user_id, role, assigned_by, assigned_at)
SELECT 
  id as user_id,
  'admin'::app_role as role,
  id as assigned_by,  -- Self-assigned for initial setup
  now() as assigned_at
FROM auth.users 
WHERE email = 'rsevidal117@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Log this admin assignment for security audit
INSERT INTO public.security_audit_log (
  user_id,
  action,
  resource,
  success,
  metadata,
  ip_address
) 
SELECT 
  id as user_id,
  'admin_role_initial_assignment' as action,
  'user_roles' as resource,
  true as success,
  jsonb_build_object(
    'email', email,
    'role', 'admin',
    'reason', 'initial_system_setup'
  ) as metadata,
  '127.0.0.1'::inet as ip_address
FROM auth.users 
WHERE email = 'rsevidal117@gmail.com';

-- Verify the assignment
SELECT 
  u.email,
  ur.role,
  ur.assigned_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'rsevidal117@gmail.com';