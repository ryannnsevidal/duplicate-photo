-- Add trigger to prevent admin role assignments without proper tracking
CREATE OR REPLACE FUNCTION public.enhanced_role_assignment_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  client_ip inet;
BEGIN
  -- Get client IP
  client_ip := inet_client_addr();
  IF client_ip IS NULL THEN
    client_ip := '127.0.0.1'::inet;
  END IF;

  -- Ensure authenticated access only
  IF current_user_id IS NULL THEN
    PERFORM log_security_event(
      'unauthenticated_role_assignment_blocked',
      'user_roles',
      false,
      'Unauthenticated role assignment attempt blocked',
      jsonb_build_object(
        'target_user', NEW.user_id,
        'role', NEW.role,
        'ip_address', client_ip,
        'security_level', 'critical'
      )
    );
    RAISE EXCEPTION 'Authentication required for role assignments';
  END IF;

  -- CRITICAL: All admin role assignments must have assigned_by field populated
  IF NEW.role = 'admin'::app_role AND NEW.assigned_by IS NULL THEN
    PERFORM log_security_event(
      'admin_role_direct_insert_blocked',
      'user_roles',
      false,
      'Admin role assignment without assigned_by blocked - security violation',
      jsonb_build_object(
        'target_user', NEW.user_id,
        'ip_address', client_ip,
        'security_level', 'critical',
        'violation_type', 'missing_assignment_tracking'
      )
    );
    RAISE EXCEPTION 'Admin role assignments must include assigned_by field for security audit trail';
  END IF;
  
  -- Prevent self-admin assignment
  IF NEW.role = 'admin'::app_role AND NEW.user_id = current_user_id THEN
    PERFORM log_security_event(
      'self_admin_assignment_blocked',
      'user_roles',
      false,
      'Self-assignment of admin role blocked in enhanced trigger',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'ip_address', client_ip,
        'security_level', 'critical'
      )
    );
    RAISE EXCEPTION 'Self-assignment of admin role is prohibited for security';
  END IF;

  -- Enhanced logging for all role assignments
  PERFORM log_security_event(
    'role_assignment_validated',
    'user_roles',
    true,
    NULL,
    jsonb_build_object(
      'user_id', NEW.user_id, 
      'role', NEW.role, 
      'assigned_by', NEW.assigned_by,
      'ip_address', client_ip,
      'security_check', 'enhanced_trigger_validation',
      'timestamp', now()
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Drop the old trigger if it exists and create the new enhanced one
DROP TRIGGER IF EXISTS validate_role_assignment ON public.user_roles;

CREATE TRIGGER enhanced_role_assignment_validation
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.enhanced_role_assignment_validation();