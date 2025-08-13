# 🔧 Production Configuration Guide

## 📧 SMTP Configuration (Required for Email Delivery)

### Step 1: Get Your SMTP Credentials

**Recommended: SendGrid (Enterprise-Grade)**
1. Go to [SendGrid](https://sendgrid.com) and create an account
2. Navigate to Settings → API Keys
3. Click "Create API Key" → Full Access
4. Copy your API key (starts with `SG.`)

**Alternative: AWS SES (Enterprise)**
1. Go to [AWS SES Console](https://console.aws.amazon.com/ses/)
2. Create SMTP credentials
3. Note your SMTP username and password

### Step 2: Configure in Supabase Dashboard

**Required Manual Configuration:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/gzveopdxovjlqpawgbzq/auth/settings)
2. Navigate to **Auth → Settings → SMTP**
3. Enable **"Custom SMTP"**

**Enter these settings:**
```
SMTP Sender Name: Pix Dupe Detect
SMTP Sender Email: no-reply@yourdomain.com
SMTP Server: smtp.sendgrid.net
SMTP Port: 587
SMTP Username: apikey
SMTP Password: [YOUR_SENDGRID_API_KEY]
Secure Connection: TLS
```

### Step 3: Set RESEND_API_KEY Secret

This is needed for the enhanced email templates we've created.

---

## 🔐 reCAPTCHA v2 Configuration (Required for Bot Protection)

### Step 1: Get reCAPTCHA Keys

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin/create)
2. **Choose "reCAPTCHA v2" → "Invisible reCAPTCHA badge"**
3. Add your domains (both development and production)
4. Copy both the **Site Key** and **Secret Key**

### Step 2: Update Frontend

Replace the production key in `src/components/CaptchaWrapper.tsx`:
```typescript
const RECAPTCHA_SITE_KEY = 'YOUR_ACTUAL_PRODUCTION_SITE_KEY';
```

### Step 3: Set RECAPTCHA_SECRET_KEY Secret

This is needed for server-side verification in edge functions.

---

## ⚙️ Additional Production Settings

### Supabase Auth Configuration
Go to [Supabase Auth Settings](https://supabase.com/dashboard/project/gzveopdxovjlqpawgbzq/auth/settings):

1. **Email Confirmations**: ✅ Enable
2. **OTP Expiry**: Set to 3600 seconds  
3. **Password Policy**: Enable strong passwords
4. **Rate Limiting**: Keep current settings (already configured)

### DNS Configuration (If Using Custom Domain)
```
# Add these DNS records for better email delivery
TXT  @  "v=spf1 include:sendgrid.net ~all"
TXT  @  "v=dmarc1; p=quarantine; rua=mailto:dmarc@yourdomain.com"

# DKIM records (provided by SendGrid after domain verification)
CNAME  s1._domainkey  s1.domainkey.u1234567.wl.sendgrid.net
CNAME  s2._domainkey  s2.domainkey.u1234567.wl.sendgrid.net
```

---

## 🚀 Testing Your Configuration

### Test Email Delivery
```bash
# Test welcome email
curl -X POST https://gzveopdxovjlqpawgbzq.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "emailType": "welcome",
    "recipient": "test@yourdomain.com",
    "data": {
      "userName": "Test User",
      "loginUrl": "https://yourdomain.com/signin"
    }
  }'
```

### Test reCAPTCHA
1. Go to your sign-in page
2. Attempt multiple failed logins
3. Verify CAPTCHA appears after 3 attempts
4. Complete CAPTCHA and verify it works

---

## ✅ Production Checklist

- [ ] 📧 Configure SendGrid/AWS SES SMTP
- [ ] 🔐 Set up reCAPTCHA v2 keys  
- [ ] ⚙️ Enable email confirmations in Supabase
- [ ] 📝 Set OTP expiry to 3600 seconds
- [ ] 🔒 Test authentication flow end-to-end
- [ ] 📨 Test email delivery (welcome, password reset)
- [ ] 🤖 Test CAPTCHA on multiple failed logins
- [ ] 🌐 Configure custom domain (optional)
- [ ] 📊 Set up monitoring alerts (optional)

Once configured, your application will have enterprise-grade email delivery and bot protection! 🎉