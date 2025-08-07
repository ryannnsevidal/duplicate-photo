# 🚀 Production QA Testing Guide

## ✅ Backend Status: READY FOR TESTING

### Database Configuration:
- ✅ All critical tables have RLS enabled
- ✅ Admin user `rsevidal117@gmail.com` has admin role
- ✅ 5 blocked domains configured for testing
- ✅ Security policies are active

## 🧪 STEP-BY-STEP TESTING SEQUENCE

### 🔐 1. AUTHENTICATION FLOW (START HERE)

**Successful Signup Test:**
1. Go to your deployed app `/signin` 
2. Switch to "Sign Up" tab
3. Use: `testuser@gmail.com` (or any non-blocked domain)
4. Password: `TestPassword123!` (meets all requirements)
5. ✅ **Expected**: Email confirmation sent
6. ✅ **Expected**: After confirmation, successful login

**Blocked Domain Test:**
1. Try signup with: `test@mailinator.com` (blocked domain)
2. ✅ **Expected**: Error message about blocked domain

### 🔁 2. SESSION MANAGEMENT
1. After successful login, wait 5 minutes and refresh
2. ✅ **Expected**: Still logged in
3. Open dev tools → Application → Clear all cookies
4. ✅ **Expected**: Redirected to login page

### 📁 3. FILE UPLOAD FLOW
1. Navigate to upload page
2. Upload a small JPEG (< 5MB)
3. ✅ **Expected**: File processed, hash generated
4. Upload the same file again
5. ✅ **Expected**: Duplicate detection triggered
6. Try uploading a 15MB file
7. ✅ **Expected**: File size error
8. Try uploading a .txt file
9. ✅ **Expected**: MIME type rejection

### 🛡️ 4. SECURITY SYSTEMS TESTING

**CAPTCHA Test:**
1. Go to login page
2. Enter wrong password 3 times for same email
3. ✅ **Expected**: reCAPTCHA appears on 4th attempt
4. Complete CAPTCHA and login successfully
5. ✅ **Expected**: Login works after CAPTCHA

**Rate Limiting Test:**
1. Try uploading 6 files quickly (within 5 minutes)
2. ✅ **Expected**: Rate limit kicked in after 5 uploads

**Brute Force Protection:**
1. Open incognito window
2. Try 5 failed logins from same IP
3. ✅ **Expected**: Account temporarily locked

### 🧑‍💼 5. ADMIN PANEL TESTING

**Admin Access:**
1. Login as `rsevidal117@gmail.com`
2. Navigate to `/admin`
3. ✅ **Expected**: Admin panel loads successfully
4. Go to "Blocked Domains" tab
5. ✅ **Expected**: See existing blocked domains

**Domain Management:**
1. Add new blocked domain: `testblock.com`
2. ✅ **Expected**: Domain added successfully
3. Logout and try signup with `user@testblock.com`
4. ✅ **Expected**: Registration blocked

**Non-Admin Test:**
1. Login with regular user account
2. Try to access `/admin`
3. ✅ **Expected**: Access denied or 403 error

### 🔄 6. EDGE FUNCTION HEALTH CHECK

Test these URLs (replace with your actual Supabase function URL):

```bash
# Health check (should return 200)
curl https://gzveopdxovjlqpawgbzq.supabase.co/functions/v1/upload-handler

# With auth header
curl -H "Authorization: Bearer YOUR_USER_TOKEN" \
     https://gzveopdxovjlqpawgbzq.supabase.co/functions/v1/admin-domain-management
```

### 📊 7. DATABASE VALIDATION

Check in Supabase Dashboard:
1. **file_upload_logs** → Should show your test uploads
2. **captcha_verifications** → Should show CAPTCHA attempts  
3. **ip_reputation** → Should show any blocked IPs
4. **blocked_email_domains** → Should show test domain you added

### 🌐 8. SEO & METADATA CHECK

1. View page source of your deployed app
2. ✅ **Check**: `<title>Pix Dupe Detect - Intelligent File Deduplication</title>`
3. ✅ **Check**: Meta description is present
4. ✅ **Check**: No test API keys visible in source

### 🛠️ 9. ERROR HANDLING TEST

1. Submit empty form
2. ✅ **Expected**: Proper validation messages
3. Try accessing `/admin` without login
4. ✅ **Expected**: Redirect to login
5. Upload invalid file type
6. ✅ **Expected**: Clear error message

## 🎯 TESTING CHECKLIST

Use this checklist while testing:

- [ ] **Auth**: Successful signup with valid email
- [ ] **Auth**: Blocked domain rejection works  
- [ ] **Security**: CAPTCHA appears after failed attempts
- [ ] **Security**: Rate limiting blocks excess uploads
- [ ] **Upload**: File upload and duplicate detection
- [ ] **Upload**: File size and type validation
- [ ] **Admin**: Admin panel accessible to admin user
- [ ] **Admin**: Non-admin users blocked from admin panel
- [ ] **Admin**: Domain blocking management works
- [ ] **Session**: Session persistence works
- [ ] **Session**: Logout clears session
- [ ] **Database**: All test data appears in Supabase
- [ ] **SEO**: Meta tags and title correct
- [ ] **Errors**: Proper error handling and messages

## 🚨 CRITICAL TESTING NOTES

### Domains Ready for Testing:
- ✅ **Allowed**: gmail.com, outlook.com, yahoo.com
- ❌ **Blocked**: mailinator.com, guerrillamail.com, 10minutemail.com, tempmail.org, yopmail.com

### Admin Account:
- **Email**: rsevidal117@gmail.com  
- **Role**: Admin (verified in database)
- **Access**: Full admin panel access

### Edge Functions:
- All functions deployed and ready
- JWT authentication active
- CORS headers configured

## 🎉 SUCCESS CRITERIA

Your app passes QA if:
1. ✅ All authentication flows work
2. ✅ Domain blocking prevents signup
3. ✅ File uploads process correctly  
4. ✅ Security systems (CAPTCHA, rate limiting) activate
5. ✅ Admin panel works for admin user only
6. ✅ No console errors during normal operation
7. ✅ All data appears correctly in Supabase

## 🐛 TROUBLESHOOTING

If something fails:
1. Check browser console for errors
2. Check Supabase function logs
3. Verify user is properly authenticated
4. Check database policies are working

---

**Status**: Backend verified ✅ - Ready for frontend testing!