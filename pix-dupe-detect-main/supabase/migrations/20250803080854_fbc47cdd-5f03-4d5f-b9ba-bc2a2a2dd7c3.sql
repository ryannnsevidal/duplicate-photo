-- RLS Policies for New Security Tables - Part 4
-- ==============================================

-- 1. IP REPUTATION POLICIES (Admin and Auditors only)
CREATE POLICY "Admins can manage IP reputation"
  ON public.ip_reputation
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auditors can view IP reputation"
  ON public.ip_reputation
  FOR SELECT
  USING (public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'admin'));

-- 2. USER SESSIONS POLICIES
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

-- 3. BLOCKED EMAIL DOMAINS POLICIES
CREATE POLICY "Admins can manage blocked domains"
  ON public.blocked_email_domains
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can check blocked domains"
  ON public.blocked_email_domains
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. CAPTCHA ATTEMPTS POLICIES (Admins and Auditors only)
CREATE POLICY "Admins can manage captcha attempts"
  ON public.captcha_attempts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auditors can view captcha attempts"
  ON public.captcha_attempts
  FOR SELECT
  USING (public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'admin'));

-- 5. CREATE INDEXES FOR ENHANCED PERFORMANCE
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