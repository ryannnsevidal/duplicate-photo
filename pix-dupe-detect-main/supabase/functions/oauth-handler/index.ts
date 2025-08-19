import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthRequest {
  action: 'store_token' | 'get_auth_url' | 'exchange_code';
  provider: 'google' | 'google-photos' | 'dropbox';
  code?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  redirect_uri?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const jwt = authHeader.split(' ')[1];
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(jwt);
    
    if (userError || !userData.user) {
      throw new Error('Invalid authentication token');
    }

    const userId = userData.user.id;
    const { action, provider, code, access_token, refresh_token, expires_in, redirect_uri }: OAuthRequest = await req.json();

    switch (action) {
      case 'get_auth_url':
        const authUrl = await generateAuthUrl(provider, redirect_uri);
        return new Response(
          JSON.stringify({ auth_url: authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'exchange_code':
        if (!code) throw new Error('Authorization code required');
        const tokenData = await exchangeCodeForToken(provider, code, redirect_uri);
        
        // Store token
        await storeOAuthToken(supabaseClient, userId, provider, tokenData);
        
        return new Response(
          JSON.stringify({ success: true, expires_in: tokenData.expires_in }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'store_token':
        if (!access_token) throw new Error('Access token required');
        
        await storeOAuthToken(supabaseClient, userId, provider, {
          access_token,
          refresh_token,
          expires_in: expires_in || 3600
        });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('❌ OAuth handler error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateAuthUrl(provider: string, redirectUri?: string): Promise<string> {
  const baseRedirectUri = redirectUri || 'https://pix-dupe-detect-ui.onrender.com/oauth-callback';
  
  switch (provider) {
    case 'google':
      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      if (!googleClientId) throw new Error('Google Client ID not configured');
      
      const googleScopes = 'https://www.googleapis.com/auth/drive.readonly';
      return `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(baseRedirectUri)}&` +
        `scope=${encodeURIComponent(googleScopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;

    case 'google-photos':
      const photosClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      if (!photosClientId) throw new Error('Google Client ID not configured');
      
      const photosScopes = 'https://www.googleapis.com/auth/photoslibrary.readonly';
      return `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${photosClientId}&` +
        `redirect_uri=${encodeURIComponent(baseRedirectUri)}&` +
        `scope=${encodeURIComponent(photosScopes)}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;

    case 'dropbox':
      const dropboxClientId = Deno.env.get('DROPBOX_APP_KEY');
      if (!dropboxClientId) throw new Error('Dropbox App Key not configured');
      
      return `https://www.dropbox.com/oauth2/authorize?` +
        `client_id=${dropboxClientId}&` +
        `redirect_uri=${encodeURIComponent(baseRedirectUri)}&` +
        `response_type=code&` +
        `token_access_type=offline`;

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function exchangeCodeForToken(provider: string, code: string, redirectUri?: string) {
  const baseRedirectUri = redirectUri || 'https://your-app.onrender.com/oauth-callback';

  switch (provider) {
    case 'google':
    case 'google-photos':
      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? Deno.env.get('GOOGLE_PHOTOS_CLIENT_SECRET');
      
      if (!googleClientId || !googleClientSecret) {
        throw new Error('Google OAuth credentials not configured');
      }

      const googleResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: baseRedirectUri,
        }),
      });

      if (!googleResponse.ok) {
        throw new Error(`Google OAuth error: ${googleResponse.status}`);
      }

      return await googleResponse.json();

    case 'dropbox':
      const dropboxAppKey = Deno.env.get('DROPBOX_APP_KEY');
      const dropboxAppSecret = Deno.env.get('DROPBOX_APP_SECRET');
      
      if (!dropboxAppKey || !dropboxAppSecret) {
        throw new Error('Dropbox OAuth credentials not configured');
      }

      const dropboxResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: dropboxAppKey,
          client_secret: dropboxAppSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: baseRedirectUri,
        }),
      });

      if (!dropboxResponse.ok) {
        throw new Error(`Dropbox OAuth error: ${dropboxResponse.status}`);
      }

      return await dropboxResponse.json();

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

async function storeOAuthToken(supabaseClient: any, userId: string, provider: string, tokenData: any) {
  const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
  
  // Deactivate existing tokens
  await supabaseClient
    .from('user_oauth_tokens')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('provider', provider);

  // Store new token
  const { error } = await supabaseClient
    .from('user_oauth_tokens')
    .insert({
      user_id: userId,
      provider,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
      is_active: true
    });

  if (error) {
    throw new Error(`Failed to store OAuth token: ${error.message}`);
  }
}