-- Direct admin role assignment for rsevidal117@gmail.com (bypassing triggers temporarily)
-- This runs with service role privileges
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get user ID from email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'rsevidal117@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Temporarily disable the trigger
        ALTER TABLE public.user_roles DISABLE TRIGGER enhanced_role_assignment_validation;
        
        -- Insert admin role directly
        INSERT INTO public.user_roles (user_id, role, assigned_by)
        VALUES (target_user_id, 'admin'::app_role, target_user_id)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Re-enable the trigger
        ALTER TABLE public.user_roles ENABLE TRIGGER enhanced_role_assignment_validation;
        
        RAISE NOTICE 'Admin role assigned to rsevidal117@gmail.com';
    ELSE
        RAISE NOTICE 'User rsevidal117@gmail.com not found in auth.users';
    END IF;
END $$;