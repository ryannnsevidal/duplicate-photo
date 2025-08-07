-- Use the secure function to assign admin role
SELECT public.secure_assign_role(
  'c521b38d-c8d0-4051-a23c-60682f48cf20'::uuid,
  'admin'::app_role
);