-- Update OTP expiry to recommended 1 hour (3600 seconds)
UPDATE auth.config SET 
  otp_exp = 3600;