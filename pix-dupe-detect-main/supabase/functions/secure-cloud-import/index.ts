import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CloudImportRequest {
  provider: 'google-drive' | 'dropbox' | 'google-photos';
  items: Array<{
    id?: string;          // Google Drive file ID
    link?: string;        // Dropbox direct link
    baseUrl?: string;     // Google Photos base URL
    name: string;
    mimeType?: string;
    size?: number;
  }>;
  accessToken?: string;   // User's OAuth token
}

interface GoogleOAuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
    const { provider, items, accessToken }: CloudImportRequest = await req.json();

    console.log(`🔄 Starting cloud import for user ${userId}: ${provider}, ${items.length} items`);

    // Create import job record
    const { data: jobData, error: jobError } = await supabaseClient
      .from('cloud_import_jobs')
      .insert({
        user_id: userId,
        provider,
        total_items: items.length,
        status: 'processing'
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create import job: ${jobError.message}`);
    }

    const jobId = jobData.id;
    const results: Array<{ name: string; success: boolean; cloud_path?: string; size?: number; error?: string }> = [];

    for (const item of items) {
      try {
        let fileBytes: Uint8Array | null = null;
        const fileName = item.name || `import-${Date.now()}`;
        const contentType = item.mimeType || 'application/octet-stream';

        switch (provider) {
          case 'google-drive': {
            if (!item.id) throw new Error('Google Drive file ID required');
            
            // Use stored access token or provided one
            let driveToken = accessToken;
            if (!driveToken) {
              const { data: tokenData } = await supabaseClient
                .from('user_oauth_tokens')
                .select('access_token, expires_at')
                .eq('user_id', userId)
                .eq('provider', 'google')
                .eq('is_active', true)
                .single();
              
              if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
                throw new Error('Valid Google access token required');
              }
              driveToken = tokenData.access_token;
            }

            // Fetch file from Google Drive API
            const driveResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`,
              {
                headers: {
                  'Authorization': `Bearer ${driveToken}`,
                },
              }
            );

            if (!driveResponse.ok) {
              throw new Error(`Google Drive API error: ${driveResponse.status}`);
            }

            fileBytes = new Uint8Array(await driveResponse.arrayBuffer());
            break;
          }

          case 'dropbox': {
            if (!item.link) throw new Error('Dropbox direct link required');
            
            // Download from Dropbox direct link
            const dropboxResponse = await fetch(item.link);
            if (!dropboxResponse.ok) {
              throw new Error(`Dropbox download error: ${dropboxResponse.status}`);
            }

            fileBytes = new Uint8Array(await dropboxResponse.arrayBuffer());
            break;
          }

          case 'google-photos': {
            if (!item.baseUrl) throw new Error('Google Photos base URL required');
            
            // Use stored access token or provided one
            let photosToken = accessToken;
            if (!photosToken) {
              const { data: tokenData } = await supabaseClient
                .from('user_oauth_tokens')
                .select('access_token, expires_at')
                .eq('user_id', userId)
                .eq('provider', 'google-photos')
                .eq('is_active', true)
                .single();
              
              if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
                throw new Error('Valid Google Photos access token required');
              }
              photosToken = tokenData.access_token;
            }

            // Download from Google Photos (=d for original size)
            const photosResponse = await fetch(`${item.baseUrl}=d`, {
              headers: {
                'Authorization': `Bearer ${photosToken}`,
              },
            });

            if (!photosResponse.ok) {
              throw new Error(`Google Photos API error: ${photosResponse.status}`);
            }

            fileBytes = new Uint8Array(await photosResponse.arrayBuffer());
            break;
          }

          default:
            throw new Error(`Unsupported provider: ${provider}`);
        }

        if (!fileBytes) {
          throw new Error('Failed to download file');
        }

        // Generate unique file path
        const fileExtension = fileName.split('.').pop() || 'bin';
        const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
        const storagePath = `user/${userId}/${uniqueFileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseClient.storage
          .from('uploads')
          .upload(storagePath, fileBytes, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Storage upload error: ${uploadError.message}`);
        }

        // Log successful upload
        const { error: logError } = await supabaseClient
          .from('file_upload_logs')
          .insert({
            user_id: userId,
            original_filename: fileName,
            file_size_bytes: fileBytes.length,
            cloud_provider: provider === 'google-drive' ? 'google_drive' : 
                          provider === 'google-photos' ? 'google_photos' : 'dropbox',
            cloud_path: storagePath,
            rclone_remote: 'supabase-storage',
            sha256_hash: await computeSHA256(fileBytes),
            upload_status: 'uploaded',
            metadata: {
              source: provider,
              original_item: item
            }
          });

        if (logError) {
          console.error('Failed to log upload:', logError);
        }

        results.push({
          name: fileName,
          success: true,
          cloud_path: storagePath,
          size: fileBytes.length
        });

        console.log(`✅ Successfully imported: ${fileName} (${fileBytes.length} bytes)`);

      } catch (error) {
        console.error(`❌ Failed to import ${item.name}:`, error);
        results.push({
          name: item.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update job status
    const successCount = results.filter(r => r.success).length;
    await supabaseClient
      .from('cloud_import_jobs')
      .update({
        status: successCount === items.length ? 'completed' : 'partial',
        processed_items: results.length,
        success_count: successCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    console.log(`🎉 Import job ${jobId} completed: ${successCount}/${items.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        results,
        summary: {
          total: items.length,
          successful: successCount,
          failed: items.length - successCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Secure cloud import error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function computeSHA256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}