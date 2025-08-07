-- Insert admin role for rsevidal117@gmail.com
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get user ID from email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'rsevidal117@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Insert admin role (will be ignored if already exists due to unique constraint)
        INSERT INTO public.user_roles (user_id, role, assigned_by)
        VALUES (target_user_id, 'admin'::app_role, target_user_id)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Log the role assignment
        PERFORM public.log_security_event(
            'admin_role_ensured',
            'user_roles',
            true,
            NULL,
            jsonb_build_object('target_user_id', target_user_id, 'target_email', 'rsevidal117@gmail.com')
        );
        
        RAISE NOTICE 'Admin role ensured for rsevidal117@gmail.com';
    ELSE
        RAISE NOTICE 'User rsevidal117@gmail.com not found in auth.users';
    END IF;
END $$;