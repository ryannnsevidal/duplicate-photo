-- Security hardening for database functions
-- Add proper search path to prevent schema injection

-- Update existing functions with proper search path
CREATE OR REPLACE FUNCTION public.secure_assign_role(target_user_id uuid, new_role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assigner_is_admin boolean;
  current_user_id uuid := auth.uid();
  client_ip inet;
BEGIN
  -- Ensure user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get client IP for logging
  client_ip := inet_client_addr();
  IF client_ip IS NULL THEN
    client_ip := '127.0.0.1'::inet;
  END IF;

  -- Check if the person assigning the role is an admin
  SELECT has_role(current_user_id, 'admin'::app_role) INTO assigner_is_admin;
  
  IF NOT assigner_is_admin THEN
    -- Log unauthorized attempt
    PERFORM log_security_event(
      'unauthorized_role_assignment_attempt',
      'user_roles',
      false,
      'Non-admin user attempted role assignment',
      jsonb_build_object(
        'target_user', target_user_id,
        'attempted_role', new_role,
        'unauthorized_user', current_user_id,
        'ip_address', client_ip
      )
    );
    RAISE EXCEPTION 'Only admins can assign roles';
  END IF;
  
  -- CRITICAL: Prevent self-role assignment to admin (prevents privilege escalation)
  IF target_user_id = current_user_id AND new_role = 'admin'::app_role THEN
    PERFORM log_security_event(
      'self_admin_assignment_blocked',
      'user_roles',
      false,
      'Self-assignment of admin role blocked',
      jsonb_build_object(
        'user_id', current_user_id,
        'ip_address', client_ip,
        'security_level', 'critical'
      )
    );
    RAISE EXCEPTION 'Cannot assign admin role to yourself - security violation';
  END IF;
  
  -- Enhanced validation for admin role assignment
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
        'ip_address', client_ip,
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
      'assigned_by', current_user_id,
      'ip_address', client_ip
    )
  );
  
  RETURN true;
END;
$function$;

-- Update log_security_event function with proper search path
CREATE OR REPLACE FUNCTION public.log_security_event(_action text, _resource text DEFAULT NULL::text, _success boolean DEFAULT true, _error_message text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_ip inet;
  user_agent_header text;
BEGIN
  -- Get client IP
  client_ip := inet_client_addr();
  IF client_ip IS NULL THEN
    client_ip := '127.0.0.1'::inet;
  END IF;

  -- Get user agent (this would be set by the application)
  user_agent_header := current_setting('request.headers', true)::json->>'user-agent';

  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource,
    success,
    error_message,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    _action,
    _resource,
    _success,
    _error_message,
    COALESCE(_metadata, '{}'::jsonb) || jsonb_build_object('client_ip', client_ip),
    client_ip,
    user_agent_header
  );
END;
$function$;

-- Add enhanced file upload validation function
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  _filename text,
  _file_size bigint,
  _content_type text,
  _user_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
  _max_file_size bigint := 100 * 1024 * 1024; -- 100MB
  _allowed_types text[] := ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ];
  _dangerous_extensions text[] := ARRAY[
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
    '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.pl', '.sh'
  ];
  _file_extension text;
BEGIN
  -- Extract file extension
  _file_extension := lower(substring(_filename from '\.([^.]*)$'));
  
  -- Validate file size
  IF _file_size > _max_file_size THEN
    _result := jsonb_build_object(
      'valid', false,
      'error', 'File size exceeds maximum limit of 100MB',
      'error_code', 'FILE_TOO_LARGE'
    );
    RETURN _result;
  END IF;
  
  -- Validate content type
  IF NOT (_content_type = ANY(_allowed_types)) THEN
    _result := jsonb_build_object(
      'valid', false,
      'error', 'File type not allowed',
      'error_code', 'INVALID_FILE_TYPE',
      'allowed_types', to_jsonb(_allowed_types)
    );
    RETURN _result;
  END IF;
  
  -- Check for dangerous file extensions
  IF ('.' || _file_extension) = ANY(_dangerous_extensions) THEN
    _result := jsonb_build_object(
      'valid', false,
      'error', 'File extension not allowed for security reasons',
      'error_code', 'DANGEROUS_FILE_EXTENSION'
    );
    
    -- Log security event for dangerous file upload attempt
    PERFORM log_security_event(
      'dangerous_file_upload_blocked',
      'file_uploads',
      false,
      'Dangerous file extension blocked',
      jsonb_build_object(
        'filename', _filename,
        'extension', _file_extension,
        'content_type', _content_type,
        'user_id', _user_id
      )
    );
    
    RETURN _result;
  END IF;
  
  -- File is valid
  _result := jsonb_build_object(
    'valid', true,
    'message', 'File validation passed'
  );
  
  RETURN _result;
END;
$function$;

-- Add input sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_input(_input text, _max_length integer DEFAULT 1000)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sanitized text;
BEGIN
  -- Return null for null input
  IF _input IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Trim whitespace
  _sanitized := trim(_input);
  
  -- Limit length
  IF length(_sanitized) > _max_length THEN
    _sanitized := left(_sanitized, _max_length);
  END IF;
  
  -- Remove common SQL injection patterns (basic protection)
  _sanitized := regexp_replace(_sanitized, '(;|\$\$|--|/\*|\*/)', '', 'gi');
  
  -- Remove script tags and other dangerous HTML
  _sanitized := regexp_replace(_sanitized, '<script[^>]*>.*?</script>', '', 'gi');
  _sanitized := regexp_replace(_sanitized, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  _sanitized := regexp_replace(_sanitized, 'javascript:', '', 'gi');
  _sanitized := regexp_replace(_sanitized, 'vbscript:', '', 'gi');
  _sanitized := regexp_replace(_sanitized, 'data:text/html', '', 'gi');
  
  RETURN _sanitized;
END;
$function$;