-- Maximum Security Enhancement Migration - Part 2
-- ==================================================

-- 1. CREATE IP BLOCKING AND REPUTATION SYSTEM
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

-- 2. CREATE SESSION TRACKING TABLE
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

-- 3. CREATE BLOCKED EMAIL DOMAINS TABLE
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

-- 4. CREATE CAPTCHA ATTEMPTS TABLE
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

-- 5. ENHANCE RATE LIMITING WITH MORE GRANULAR CONTROLS
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS ip_address inet;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS captcha_required boolean DEFAULT false;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS severity_level integer DEFAULT 1; -- 1-5 severity

-- 6. INSERT COMMON DISPOSABLE EMAIL DOMAINS
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