-- Security Functions and RLS Policies - Part 3
-- ===============================================

-- 1. CREATE ENHANCED SECURITY FUNCTIONS

-- Function to check IP reputation
CREATE OR REPLACE FUNCTION public.check_ip_reputation(_ip_address inet)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reputation jsonb;
BEGIN
  SELECT 
    jsonb_build_object(
      'score', reputation_score,
      'blocked', (blocked_until IS NOT NULL AND blocked_until > now()),
      'blocked_until', blocked_until,
      'abuse_count', abuse_count,
      'reason', block_reason
    )
  INTO _reputation
  FROM public.ip_reputation
  WHERE ip_address = _ip_address;
  
  -- If IP not found, create initial record
  IF _reputation IS NULL THEN
    INSERT INTO public.ip_reputation (ip_address, reputation_score)
    VALUES (_ip_address, 100)
    ON CONFLICT (ip_address) DO NOTHING;
    
    _reputation := jsonb_build_object(
      'score', 100,
      'blocked', false,
      'blocked_until', null,
      'abuse_count', 0,
      'reason', null
    );
  END IF;
  
  RETURN _reputation;
END;
$$;

-- Function to update IP reputation
CREATE OR REPLACE FUNCTION public.update_ip_reputation(
  _ip_address inet,
  _score_delta integer,
  _block_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;

-- Function to validate email domain
CREATE OR REPLACE FUNCTION public.is_email_domain_allowed(_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _domain text;
  _is_blocked boolean;
BEGIN
  -- Extract domain from email
  _domain := lower(split_part(_email, '@', 2));
  
  -- Check if domain is blocked
  SELECT EXISTS(
    SELECT 1 FROM public.blocked_email_domains 
    WHERE domain = _domain
  ) INTO _is_blocked;
  
  RETURN NOT _is_blocked;
END;
$$;

-- Enhanced rate limiting with IP and severity
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
  _action text,
  _ip_address inet DEFAULT NULL,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 60,
  _severity_level integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _current_attempts integer;
  _ip_attempts integer;
  _window_start timestamp with time zone := now() - interval '1 minute' * _window_minutes;
  _result jsonb;
BEGIN
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < _window_start;
  
  -- Check user-based rate limit
  SELECT COALESCE(SUM(attempts), 0)
  INTO _current_attempts
  FROM public.rate_limits
  WHERE user_id = _user_id
    AND action = _action
    AND window_start >= _window_start;
  
  -- Check IP-based rate limit if IP provided
  _ip_attempts := 0;
  IF _ip_address IS NOT NULL THEN
    SELECT COALESCE(SUM(attempts), 0)
    INTO _ip_attempts
    FROM public.rate_limits
    WHERE ip_address = _ip_address
      AND action = _action
      AND window_start >= _window_start;
  END IF;
  
  -- Check if either limit is exceeded
  IF _current_attempts >= _max_attempts OR _ip_attempts >= (_max_attempts * 2) THEN
    -- Update rate limit record with severity
    INSERT INTO public.rate_limits (user_id, ip_address, action, attempts, window_start, severity_level, captcha_required)
    VALUES (_user_id, _ip_address, _action, 1, now(), _severity_level, _severity_level >= 3)
    ON CONFLICT (user_id, action) 
    DO UPDATE SET 
      attempts = rate_limits.attempts + 1,
      severity_level = GREATEST(rate_limits.severity_level, _severity_level),
      captcha_required = (GREATEST(rate_limits.severity_level, _severity_level) >= 3),
      updated_at = now();
    
    -- Decrease IP reputation for high severity
    IF _severity_level >= 3 AND _ip_address IS NOT NULL THEN
      PERFORM public.update_ip_reputation(_ip_address, -10, 'Rate limit violation');
    END IF;
    
    _result := jsonb_build_object(
      'allowed', false,
      'captcha_required', _severity_level >= 3,
      'retry_after_seconds', (_window_minutes * 60),
      'severity_level', _severity_level
    );
  ELSE
    -- Allow and record attempt
    INSERT INTO public.rate_limits (user_id, ip_address, action, attempts, window_start, severity_level)
    VALUES (_user_id, _ip_address, _action, 1, now(), _severity_level)
    ON CONFLICT (user_id, action) 
    DO UPDATE SET 
      attempts = rate_limits.attempts + 1,
      updated_at = now();
    
    _result := jsonb_build_object(
      'allowed', true,
      'captcha_required', false,
      'attempts_remaining', _max_attempts - _current_attempts - 1,
      'severity_level', _severity_level
    );
  END IF;
  
  RETURN _result;
END;
$$;