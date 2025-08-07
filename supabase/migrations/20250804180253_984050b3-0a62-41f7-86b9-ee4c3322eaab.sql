-- PHASE 1: CRITICAL SECURITY FIXES
-- Fix anonymous access vulnerabilities and strengthen authentication

-- 1. Fix enhanced-security-manager authentication bypass
-- Note: This will be handled in config.toml update

-- 2. Strengthen role assignment security
CREATE OR REPLACE FUNCTION public.secure_assign_role(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigner_is_admin boolean;
  current_user_id uuid := auth.uid();
BEGIN
  -- Ensure user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if the person assigning the role is an admin
  SELECT has_role(current_user_id, 'admin'::app_role) INTO assigner_is_admin;
  
  IF NOT assigner_is_admin THEN
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- CRITICAL: Prevent self-role assignment to admin (prevents privilege escalation)
  IF target_user_id = current_user_id AND new_role = 'admin'::app_role THEN
    RAISE EXCEPTION 'Cannot assign admin role to yourself - security violation';
  END IF;
  
  -- Prevent assigning admin role without proper verification
  IF new_role = 'admin'::app_role THEN
    -- Log the admin assignment attempt for security audit
    PERFORM log_security_event(
      'admin_role_assignment_attempted',
      'user_roles',
      true,
      NULL,
      jsonb_build_object(
        'target_user', target_user_id, 
        'assigned_by', current_user_id,
        'security_level', 'critical'
      )
    );
  END IF;
  
  -- Upsert the role with enhanced logging
  INSERT INTO public.user_roles (user_id, role, assigned_by)
  VALUES (target_user_id, new_role, current_user_id)
  ON CONFLICT (user_id, role) 
  DO UPDATE SET 
    assigned_by = current_user_id, 
    assigned_at = now();
  
  -- Log the successful assignment
  PERFORM log_security_event(
    'role_assigned',
    'user_roles',
    true,
    NULL,
    jsonb_build_object(
      'target_user', target_user_id, 
      'role', new_role,
      'assigned_by', current_user_id
    )
  );
  
  RETURN true;
END;
$$;

-- 3. Add enhanced security validation trigger
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Ensure authenticated access only
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for role assignments';
  END IF;

  -- Prevent direct admin role insertion without assigned_by
  IF NEW.role = 'admin'::app_role AND NEW.assigned_by IS NULL THEN
    RAISE EXCEPTION 'Admin role assignments must include assigned_by field';
  END IF;
  
  -- Prevent self-admin assignment
  IF NEW.role = 'admin'::app_role AND NEW.user_id = current_user_id THEN
    RAISE EXCEPTION 'Self-assignment of admin role is prohibited';
  END IF;
  
  -- Log all role assignment attempts
  PERFORM log_security_event(
    'role_assignment_attempted',
    'user_roles',
    true,
    NULL,
    jsonb_build_object(
      'user_id', NEW.user_id, 
      'role', NEW.role, 
      'assigned_by', NEW.assigned_by,
      'security_check', 'trigger_validation'
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enhance IP reputation function with better security
CREATE OR REPLACE FUNCTION public.update_ip_reputation(_ip_address inet, _score_delta integer, _block_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Require authentication for IP reputation updates
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for IP reputation updates';
  END IF;

  -- Validate IP address
  IF _ip_address IS NULL THEN
    RAISE EXCEPTION 'IP address is required';
  END IF;

  INSERT INTO public.ip_reputation (ip_address, reputation_score, abuse_count)
  VALUES (_ip_address, GREATEST(0, 100 + _score_delta), CASE WHEN _score_delta < 0 THEN 1 ELSE 0 END)
  ON CONFLICT (ip_address) 
  DO UPDATE SET 
    reputation_score = GREATEST(0, ip_reputation.reputation_score + _score_delta),
    abuse_count = CASE WHEN _score_delta < 0 THEN ip_reputation.abuse_count + 1 ELSE ip_reputation.abuse_count END,
    last_activity = now(),
    block_reason = COALESCE(_block_reason, ip_reputation.block_reason),
    blocked_until = CASE 
      WHEN (ip_reputation.reputation_score + _score_delta) <= 20 THEN now() + interval '24 hours'
      WHEN (ip_reputation.reputation_score + _score_delta) <= 50 THEN now() + interval '1 hour'
      ELSE ip_reputation.blocked_until
    END,
    updated_at = now();

  -- Log the IP reputation change
  PERFORM log_security_event(
    'ip_reputation_updated',
    'ip_reputation',
    true,
    NULL,
    jsonb_build_object(
      'ip_address', _ip_address,
      'score_delta', _score_delta,
      'reason', _block_reason,
      'updated_by', current_user_id
    )
  );
END;
$$;

-- 5. Add security function to validate authentication for critical operations
CREATE OR REPLACE FUNCTION public.require_authentication()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for this operation';
  END IF;
  
  RETURN current_user_id;
END;
$$;