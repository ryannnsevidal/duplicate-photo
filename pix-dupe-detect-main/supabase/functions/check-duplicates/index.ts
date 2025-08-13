import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DuplicateResult {
  filename: string;
  score: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    )

    // Get the user from JWT token
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { fileName } = await req.json()
    console.log('Processing duplicate check for:', fileName)

    // Simulate duplicate detection logic
    // In production, this would:
    // 1. Calculate SHA256 hash of the file
    // 2. Calculate perceptual hash for images  
    // 3. Query database for similar hashes
    // 4. Return similarity scores

    const mockDuplicates: DuplicateResult[] = [
      { filename: 'sample_duplicate.jpg', score: 0.95 },
      { filename: 'another_match.png', score: 0.82 }
    ]

    // Log the duplicate check
    const { error: logError } = await supabaseClient
      .from('duplicate_checks')
      .insert({
        user_id: user.id,
        original_filename: fileName,
        file_path: fileName,
        duplicates: mockDuplicates
      })

    if (logError) {
      console.error('Failed to log duplicate check:', logError)
    }

    return new Response(
      JSON.stringify({
        duplicates: mockDuplicates,
        success: true,
        message: 'Duplicate check completed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )

  } catch (error) {
    console.error('Error in duplicate check:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        duplicates: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})