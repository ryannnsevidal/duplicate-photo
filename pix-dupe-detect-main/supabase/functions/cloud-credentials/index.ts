import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  action: 'get_google_credentials' | 'get_dropbox_credentials';
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

    // Note: This function is public (no auth required) since it only returns API keys
    // that are meant to be used in the frontend anyway

    const { action }: RequestBody = await req.json();

    switch (action) {
      case 'get_google_credentials': {
        // Get Google credentials from environment
        const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

        console.log('🔍 Google credentials check:', {
          clientIdExists: !!googleClientId,
          apiKeyExists: !!googleApiKey,
          clientIdLength: googleClientId?.length || 0,
          apiKeyLength: googleApiKey?.length || 0,
          allGoogleKeys: Object.keys(Deno.env.toObject()).filter(k => k.includes('GOOGLE'))
        });

        if (!googleClientId || !googleApiKey) {
          console.error('❌ Google credentials not configured');
          console.log('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('GOOGLE')));
          return new Response(
            JSON.stringify({ 
              error: 'Google Drive credentials not configured',
              details: 'GOOGLE_CLIENT_ID and GOOGLE_API_KEY must be set in Supabase Edge Function secrets',
              available_keys: Object.keys(Deno.env.toObject()).filter(k => k.includes('GOOGLE')),
              success: false
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ Google credentials retrieved successfully');
        console.log('Client ID exists:', !!googleClientId);
        console.log('API Key exists:', !!googleApiKey);
        
        return new Response(
          JSON.stringify({
            client_id: googleClientId,
            api_key: googleApiKey,
            success: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_dropbox_credentials': {
        // Get Dropbox credentials from environment
        const dropboxAppKey = Deno.env.get('DROPBOX_APP_KEY');

        console.log('🔍 Dropbox App Key check:', { 
          keyExists: !!dropboxAppKey, 
          keyLength: dropboxAppKey?.length || 0,
          allDropboxKeys: Object.keys(Deno.env.toObject()).filter(k => k.includes('DROPBOX'))
        });

        if (!dropboxAppKey) {
          console.error('❌ Dropbox credentials not configured');
          console.log('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.includes('DROPBOX')));
          return new Response(
            JSON.stringify({ 
              error: 'Dropbox credentials not configured',
              details: 'DROPBOX_APP_KEY must be set in Supabase Edge Function secrets',
              available_keys: Object.keys(Deno.env.toObject()).filter(k => k.includes('DROPBOX')),
              success: false
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('✅ Dropbox credentials retrieved successfully');
        console.log('App Key exists:', !!dropboxAppKey);
        
        return new Response(
          JSON.stringify({
            app_key: dropboxAppKey,
            success: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ Cloud credentials function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});