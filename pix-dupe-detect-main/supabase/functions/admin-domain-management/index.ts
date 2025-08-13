import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DomainRequest {
  domain: string;
  reason?: string;
  block_type?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .rpc('get_user_role', { user_id: user.id });

    if (roleError || userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const domain = pathSegments[pathSegments.length - 1];

    switch (req.method) {
      case 'GET':
        // List all blocked domains
        const { data: domains, error: getError } = await supabase
          .from('blocked_email_domains')
          .select('*')
          .order('created_at', { ascending: false });

        if (getError) {
          console.error('Error fetching domains:', getError);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch blocked domains' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ domains }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'POST':
        // Add new blocked domain
        const domainData: DomainRequest = await req.json();
        
        if (!domainData.domain) {
          return new Response(
            JSON.stringify({ error: 'Domain is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Normalize domain (lowercase, remove www)
        const normalizedDomain = domainData.domain.toLowerCase().replace(/^www\./, '');

        const { data: insertData, error: insertError } = await supabase
          .from('blocked_email_domains')
          .insert({
            domain: normalizedDomain,
            reason: domainData.reason || 'Added by admin',
            block_type: domainData.block_type || 'disposable',
            added_by: user.id
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            return new Response(
              JSON.stringify({ error: 'Domain already blocked' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          console.error('Error adding domain:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to add blocked domain' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the action
        await supabase.rpc('log_security_event', {
          _action: 'domain_blocked',
          _resource: 'blocked_email_domains',
          _success: true,
          _metadata: { domain: normalizedDomain, reason: domainData.reason }
        });

        return new Response(
          JSON.stringify({ message: 'Domain blocked successfully', domain: insertData }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'DELETE':
        // Remove blocked domain
        if (!domain) {
          return new Response(
            JSON.stringify({ error: 'Domain parameter is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await supabase
          .from('blocked_email_domains')
          .delete()
          .eq('domain', domain);

        if (deleteError) {
          console.error('Error deleting domain:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Failed to remove blocked domain' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Log the action
        await supabase.rpc('log_security_event', {
          _action: 'domain_unblocked',
          _resource: 'blocked_email_domains',
          _success: true,
          _metadata: { domain }
        });

        return new Response(
          JSON.stringify({ message: 'Domain unblocked successfully' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);