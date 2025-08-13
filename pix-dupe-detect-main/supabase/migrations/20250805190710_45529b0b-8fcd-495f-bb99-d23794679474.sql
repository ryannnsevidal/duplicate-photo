-- Use the secure_assign_role function to assign admin role
SELECT public.secure_assign_role(
    (SELECT id FROM auth.users WHERE email = 'rsevidal117@gmail.com'),
    'admin'::app_role
) WHERE EXISTS(SELECT 1 FROM auth.users WHERE email = 'rsevidal117@gmail.com');