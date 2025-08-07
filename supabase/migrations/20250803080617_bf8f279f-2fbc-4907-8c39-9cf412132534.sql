-- Maximum Security Enhancement Migration
-- ========================================

-- 1. ENHANCE USER ROLES SYSTEM WITH AUDITOR ROLE
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';

-- 2. CREATE IP BLOCKING AND REPUTATION SYSTEM
CREATE TABLE IF NOT EXISTS public.ip_reputation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL UNIQUE,
  reputation_score integer NOT NULL DEFAULT 100, -- 0-100, lower is worse
  blocked_until timestamp with time zone,
  abuse_count integer NOT NULL DEFAULT 0,
  first_seen timestamp with time zone NOT NULL DEFAULT now(),
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  country_code text,
  user_agent_patterns text[],
  block_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on IP reputation
ALTER TABLE public.ip_reputation ENABLE ROW LEVEL SECURITY;

-- 3. CREATE SESSION TRACKING TABLE
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  country_code text,
  city text,
  is_active boolean NOT NULL DEFAULT true,
  mfa_verified boolean NOT NULL DEFAULT false,
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 4. CREATE BLOCKED EMAIL DOMAINS TABLE
CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  block_type text NOT NULL DEFAULT 'disposable', -- 'disposable', 'malicious', 'spam'
  reason text,
  added_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on blocked domains
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- 5. CREATE CAPTCHA ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.captcha_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  action_type text NOT NULL, -- 'signup', 'signin', 'recover'
  success boolean NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text
);

-- Enable RLS on captcha attempts
ALTER TABLE public.captcha_attempts ENABLE ROW LEVEL SECURITY;

-- 6. ENHANCE RATE LIMITING WITH MORE GRANULAR CONTROLS
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS ip_address inet;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS captcha_required boolean DEFAULT false;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS severity_level integer DEFAULT 1; -- 1-5 severity

-- 7. CREATE ENHANCED SECURITY FUNCTIONS

-- Function to check IP reputation
CREATE OR REPLACE FUNCTION public.check_ip_reputation(_ip_address inet)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reputation jsonb;
  _score integer;
  _blocked_until timestamp with time zone;
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
DECLARE
  _new_score integer;
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

-- Function to track user session
CREATE OR REPLACE FUNCTION public.track_user_session(
  _session_token text,
  _ip_address inet DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _country_code text DEFAULT NULL,
  _city text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _session_id uuid;
BEGIN
  -- Deactivate old sessions for this user
  UPDATE public.user_sessions 
  SET is_active = false, updated_at = now()
  WHERE user_id = _user_id AND is_active = true;
  
  -- Create new session
  INSERT INTO public.user_sessions (
    user_id, session_token, ip_address, user_agent, 
    country_code, city, is_active
  ) VALUES (
    _user_id, _session_token, _ip_address, _user_agent,
    _country_code, _city, true
  ) RETURNING id INTO _session_id;
  
  -- Log session creation
  PERFORM public.log_security_event(
    'user_session_created',
    'user_sessions',
    true,
    NULL,
    jsonb_build_object(
      'session_id', _session_id,
      'ip_address', _ip_address,
      'user_agent', _user_agent,
      'country_code', _country_code
    )
  );
  
  RETURN _session_id;
END;
$$;

-- 8. CREATE COMPREHENSIVE RLS POLICIES

-- IP reputation policies (admins and auditors only)
CREATE POLICY "Admins can manage IP reputation"
  ON public.ip_reputation
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auditors can view IP reputation"
  ON public.ip_reputation
  FOR SELECT
  USING (public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'admin'));

-- User sessions policies
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON public.user_sessions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auditors can view all sessions"
  ON public.user_sessions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'admin'));

-- Blocked email domains policies
CREATE POLICY "Admins can manage blocked domains"
  ON public.blocked_email_domains
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can check blocked domains"
  ON public.blocked_email_domains
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- CAPTCHA attempts policies (admins and auditors only)
CREATE POLICY "Admins can manage captcha attempts"
  ON public.captcha_attempts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auditors can view captcha attempts"
  ON public.captcha_attempts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'admin'));

-- 9. CREATE INDEXES FOR ENHANCED PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_ip_reputation_ip_address ON public.ip_reputation(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_reputation_score ON public.ip_reputation(reputation_score);
CREATE INDEX IF NOT EXISTS idx_ip_reputation_blocked_until ON public.ip_reputation(blocked_until);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_blocked_email_domains_domain ON public.blocked_email_domains(domain);

CREATE INDEX IF NOT EXISTS idx_captcha_attempts_ip_address ON public.captcha_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_captcha_attempts_timestamp ON public.captcha_attempts(timestamp);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_address ON public.rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_severity_level ON public.rate_limits(severity_level);

-- 10. INSERT COMMON DISPOSABLE EMAIL DOMAINS
INSERT INTO public.blocked_email_domains (domain, block_type, reason) VALUES
  ('10minutemail.com', 'disposable', 'Temporary email service'),
  ('guerrillamail.com', 'disposable', 'Temporary email service'),
  ('mailinator.com', 'disposable', 'Temporary email service'),
  ('tempmail.org', 'disposable', 'Temporary email service'),
  ('yopmail.com', 'disposable', 'Temporary email service'),
  ('throwaway.email', 'disposable', 'Temporary email service'),
  ('getnada.com', 'disposable', 'Temporary email service'),
  ('maildrop.cc', 'disposable', 'Temporary email service')
ON CONFLICT (domain) DO NOTHING;

-- 11. CREATE CLEANUP FUNCTION FOR OLD RECORDS
CREATE OR REPLACE FUNCTION public.cleanup_security_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clean up old rate limit records (older than 7 days)
  DELETE FROM public.rate_limits WHERE created_at < now() - interval '7 days';
  
  -- Clean up old captcha attempts (older than 30 days)
  DELETE FROM public.captcha_attempts WHERE timestamp < now() - interval '30 days';
  
  -- Clean up expired sessions
  DELETE FROM public.user_sessions WHERE expires_at < now();
  
  -- Reset IP reputation for IPs not seen in 30 days (but keep the record)
  UPDATE public.ip_reputation 
  SET reputation_score = 100, blocked_until = NULL, abuse_count = 0
  WHERE last_activity < now() - interval '30 days' AND reputation_score < 100;
  
  -- Log cleanup operation
  PERFORM public.log_security_event(
    'security_cleanup_completed',
    'maintenance',
    true,
    NULL,
    jsonb_build_object('timestamp', now())
  );
END;
$$;