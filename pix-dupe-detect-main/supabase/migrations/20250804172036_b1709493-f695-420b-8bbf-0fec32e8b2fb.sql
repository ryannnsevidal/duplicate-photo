-- Additional security hardening to satisfy linter warnings
-- Remove policies that use "true" conditions which the linter may flag

-- 1. Replace broad "true" conditions with more restrictive ones
DROP POLICY IF EXISTS "Authenticated users can check blocked domains" ON public.blocked_email_domains;

-- Only allow admins and system functions to check blocked domains
CREATE POLICY "Admins can check blocked domains" 
ON public.blocked_email_domains FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Replace broad profile viewing policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Only allow users to view their own profile and admins to view all
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Add explicit service_role access for system operations
-- Create a service role policy for domain checking (used by signup validation)
CREATE POLICY "Service role can check blocked domains" 
ON public.blocked_email_domains FOR SELECT 
TO service_role 
USING (true);

-- 4. Ensure all tables have strict authenticated-only access
-- Add default deny policy for any missed cases
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captcha_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captcha_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dedup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicate_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;