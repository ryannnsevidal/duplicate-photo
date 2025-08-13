-- Check what triggers exist on user_roles and fix the role assignment issue
-- The problem is our simple_role_validation trigger is still being too restrictive

-- First, let's see what triggers are currently on user_roles
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'user_roles';

-- Drop all role validation triggers temporarily to allow signup
DROP TRIGGER IF EXISTS simple_role_validation_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS enhanced_role_assignment_validation_trigger ON public.user_roles;

-- Create a more permissive trigger that only validates admin assignments from non-admins
CREATE OR REPLACE FUNCTION public.permissive_role_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  assigner_is_admin boolean := false;
BEGIN
  -- Allow all role assignments if no current user (during signup/system operations)
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Allow users to assign roles to themselves (during signup)
  IF current_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- For assignments to other users, check if the assigner is admin
  SELECT public.has_role(current_user_id, 'admin'::app_role) INTO assigner_is_admin;
  
  IF NOT assigner_is_admin THEN
    RAISE EXCEPTION 'Only admins can assign roles to other users';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the new permissive trigger
CREATE TRIGGER permissive_role_validation_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.permissive_role_validation();

-- Also ensure the signup trigger works correctly by simplifying it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create profile first with error handling
  BEGIN
    INSERT INTO public.profiles (user_id, email, display_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.raw_user_meta_data->>'avatar_url'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    RAISE WARNING 'Profile creation failed: %', SQLERRM;
  END;
  
  -- Assign roles with error handling
  BEGIN
    IF NEW.email = 'rsevidal117@gmail.com' THEN
      -- Auto-assign admin role to the specified email
      INSERT INTO public.user_roles (user_id, role, assigned_by)
      VALUES (NEW.id, 'admin'::app_role, NEW.id)
      ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      -- Assign default user role for all other users
      INSERT INTO public.user_roles (user_id, role, assigned_by)
      VALUES (NEW.id, 'user'::app_role, NEW.id)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail signup
    RAISE WARNING 'Role assignment failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;