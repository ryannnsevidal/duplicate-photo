-- Fix the role assignment trigger that's causing signup failures
-- The issue is the trigger is trying to assign roles during signup without proper authentication context

-- Drop the existing trigger that's causing issues
DROP TRIGGER IF EXISTS auto_assign_admin_role_trigger ON auth.users;

-- Recreate the auto admin assignment function with better error handling
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-assign admin role to rsevidal117@gmail.com
  -- This runs in a SECURITY DEFINER context so it bypasses the auth requirement
  IF NEW.email = 'rsevidal117@gmail.com' THEN
    -- Use INSERT with ON CONFLICT to avoid errors if role already exists
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'admin'::app_role, NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the assignment (this might fail in signup context, so use DO instead of PERFORM)
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      -- Ignore logging errors during signup
      NULL;
    END;
  ELSE
    -- Assign default user role for all other users
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (NEW.id, 'user'::app_role, NEW.id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER auto_assign_admin_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

-- Fix the handle_new_user function to work properly with the role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile first
  INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- The role assignment is handled by the auto_assign_admin_role trigger
  -- so we don't need to do it here anymore
  
  RETURN NEW;
END;
$$;

-- Ensure the handle_new_user trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();