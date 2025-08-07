-- Set OTP expiry to 1 hour (3600 seconds) as recommended
UPDATE auth.config SET 
  otp_exp = 3600 
WHERE name = 'otp_exp';