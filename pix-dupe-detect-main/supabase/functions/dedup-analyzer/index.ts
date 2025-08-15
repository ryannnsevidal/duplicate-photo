import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  action: 'analyze_uploaded_files' | 'get_dedup_stats';
  user_id?: string;
  file_ids?: string[];
}

interface FileLogRow {
  original_filename: string;
  file_size_bytes: number;
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

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, user_id, file_ids }: RequestBody = await req.json();

    switch (action) {
      case 'analyze_uploaded_files': {
        console.log(`🔍 Starting duplicate analysis for user ${user_id} with ${file_ids?.length || 0} files`);
        
        if (!user_id || !file_ids || file_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Missing user_id or file_ids' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get file information from database
        const { data: files, error: filesError } = await supabaseClient
          .from('file_upload_logs')
          .select('*')
          .eq('user_id', user_id)
          .in('id', file_ids);

        if (filesError) {
          console.error('❌ Error fetching files:', filesError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch file information' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ Retrieved ${files?.length || 0} files for analysis`);

        // Simulate AI deduplication analysis
        const duplicateGroups: Array<{ id: string; files: string[]; similarity: number; size_bytes: number; count: number }> = [];
        const analysisResults: unknown[] = [];
        let duplicatesFound = 0;

        // Simple simulation: group files by similar names or sizes
        const fileMap = new Map<string, FileLogRow[]>();
        
        (files as FileLogRow[] | null)?.forEach((file) => {
          const baseName = file.original_filename.split('.')[0].toLowerCase();
          const sizeGroup = Math.floor(file.file_size_bytes / 1000000); // Group by MB
          const key = `${baseName}_${sizeGroup}`;
          
          if (!fileMap.has(key)) {
            fileMap.set(key, []);
          }
          fileMap.get(key)!.push(file);
        });

        // Identify duplicates (groups with more than 1 file)
        fileMap.forEach((group: FileLogRow[], key: string) => {
          if (group.length > 1) {
            duplicatesFound += group.length - 1; // Count extras as duplicates
            duplicateGroups.push({
              id: `group-${key}`,
              files: group.map((f: FileLogRow) => f.original_filename),
              similarity: 85 + Math.random() * 10, // Random similarity 85-95%
              size_bytes: group[0].file_size_bytes,
              count: group.length
            });
          }
        });

        // Log deduplication event
        const { error: logError } = await supabaseClient
          .from('dedup_events')
          .insert({
            user_id: user_id,
            file_hash: `analysis_${Date.now()}`,
            original_filename: `batch_analysis_${files?.length}_files`,
            is_duplicate: duplicatesFound > 0,
            confidence: duplicatesFound > 0 ? 0.87 : 0.12,
            similar_files: duplicateGroups,
            processing_time_ms: 1200 + Math.random() * 800,
            metadata: {
              total_files: files?.length || 0,
              duplicates_found: duplicatesFound,
              analysis_type: 'batch',
              timestamp: new Date().toISOString()
            }
          });

        if (logError) {
          console.error('⚠️ Failed to log dedup event:', logError);
        }

        const results = {
          success: true,
          total_files: files?.length || 0,
          duplicates_found: duplicatesFound,
          duplicate_groups: duplicateGroups,
          processing_time_ms: 1200,
          analysis_timestamp: new Date().toISOString(),
          potential_savings_bytes: duplicateGroups.reduce((sum, group) => 
            sum + (group.size_bytes * (group.count - 1)), 0)
        };

        console.log(`✅ Analysis complete: ${duplicatesFound} duplicates found across ${duplicateGroups.length} groups`);

        return new Response(
          JSON.stringify(results),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_dedup_stats': {
        // Get deduplication statistics for user
        const { data: stats, error: statsError } = await supabaseClient
          .from('dedup_events')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (statsError) {
          console.error('❌ Error fetching stats:', statsError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch deduplication statistics' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            recent_analyses: stats || [],
            total_analyses: stats?.length || 0
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
    console.error('❌ Dedup analyzer function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});