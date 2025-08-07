# 🚀 STEP 1: SUPABASE SETUP (REQUIRED)

## WHERE TO GET SUPABASE KEYS:

1. **Go to**: https://supabase.com/dashboard
2. **Sign up/Login** with GitHub
3. **Create New Project**:
   - Project name: `pix-dupe-detect` 
   - Database password: (choose strong password)
   - Region: (closest to you)

4. **Wait 2-3 minutes** for project creation

5. **Get your keys**:
   - Go to **Settings** → **API**
   - Copy the **Project URL** 
   - Copy the **anon/public key**
   - Copy the **service_role key** (be careful - this is secret!)

## PASTE INTO .env FILE:

```bash
# Replace these lines in your .env file:
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.YOUR-ACTUAL-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.YOUR-ACTUAL-SERVICE-KEY
```

## SETUP DATABASE SCHEMA:

6. **Go to SQL Editor** in Supabase dashboard
7. **Copy the schema** from: `/workspaces/duplicate-photo/supabase/schema.sql`
8. **Paste and run** the entire schema
9. **Verify** tables are created in Table Editor

---

# ✅ TEST SUPABASE CONNECTION:

After adding keys, restart your dev server:
```bash
npm run dev
```

Visit http://localhost:8080 - you should see:
- ✅ No "Demo Mode" warning
- ✅ Real authentication working
- ✅ Sign up/login functional

---

# 🔐 STEP 2: GOOGLE OAUTH (FOR GOOGLE LOGIN)

## WHERE TO GET GOOGLE OAUTH KEYS:

1. **Go to**: https://console.cloud.google.com/
2. **Create new project** or select existing
3. **Enable APIs**:
   - Go to **APIs & Services** → **Library**
   - Search and enable: **Google+ API** and **Google Drive API**

4. **Create OAuth Credentials**:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
   - Application type: **Web application**
   - Name: `PIX Dupe Detect`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:8080
     https://your-domain.com
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:8080/auth/callback
     https://your-domain.com/auth/callback
     ```

5. **Copy the credentials**:
   - **Client ID**: starts with `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: random string

## PASTE INTO .env FILE:

```bash
# Replace these lines:
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-actual-client-secret
```

---

# ☁️ STEP 3: DROPBOX API (FOR DROPBOX INTEGRATION)

## WHERE TO GET DROPBOX KEYS:

1. **Go to**: https://www.dropbox.com/developers/apps
2. **Create app**:
   - Choose **Scoped access**
   - Choose **Full Dropbox**
   - Name: `PIX-Dupe-Detect`

3. **Configure permissions**:
   - Go to **Permissions** tab
   - Enable: `files.metadata.read`, `files.content.read`

4. **Get App key**:
   - Go to **Settings** tab
   - Copy the **App key**

5. **Set redirect URI**:
   - Add: `http://localhost:8080/auth/dropbox/callback`
   - Add: `https://your-domain.com/auth/dropbox/callback`

## PASTE INTO .env FILE:

```bash
# Replace this line:
VITE_DROPBOX_APP_KEY=your-actual-dropbox-app-key
```

---

# 🛡️ STEP 4: RECAPTCHA (OPTIONAL - FOR BOT PROTECTION)

## WHERE TO GET RECAPTCHA KEYS:

1. **Go to**: https://www.google.com/recaptcha/admin/create
2. **Register new site**:
   - Label: `PIX Dupe Detect`
   - reCAPTCHA type: **reCAPTCHA v2** → **"I'm not a robot"**
   - Domains:
     ```
     localhost
     your-domain.com
     ```

3. **Copy the keys**:
   - **Site Key**: public key for frontend
   - **Secret Key**: private key for backend

## PASTE INTO .env FILE:

```bash
# Replace these lines:
VITE_RECAPTCHA_SITE_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RECAPTCHA_SECRET_KEY=6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

# 📊 STEP 5: SENTRY MONITORING (OPTIONAL)

## WHERE TO GET SENTRY DSN:

1. **Go to**: https://sentry.io/signup/
2. **Create organization** and **project**
3. **Choose platform**: **React**
4. **Copy the DSN** (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

## PASTE INTO .env FILE:

```bash
# Replace this line:
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
```
