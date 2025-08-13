-- Create unique partial index for single active OAuth token per user/provider
CREATE UNIQUE INDEX CONCURRENTLY idx_user_oauth_tokens_unique_active 
ON public.user_oauth_tokens (user_id, provider) 
WHERE is_active = true;

-- Create trigger to enforce single active token per user/provider
CREATE OR REPLACE FUNCTION public.enforce_single_active_oauth_token()
RETURNS TRIGGER AS $$
BEGIN
  -- When inserting/updating to active, deactivate other tokens for same user/provider
  IF NEW.is_active = true THEN
    UPDATE public.user_oauth_tokens 
    SET is_active = false, updated_at = now()
    WHERE user_id = NEW.user_id 
      AND provider = NEW.provider 
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_enforce_single_active_oauth_token
  BEFORE INSERT OR UPDATE ON public.user_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_oauth_token();