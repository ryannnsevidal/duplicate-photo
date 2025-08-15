import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SecurityRequest =
  | { action: 'check_rate_limit'; data: { action_type: string; max_attempts?: number; window_minutes?: number } }
  | { action: 'log_security_event'; data: { action: string; resource: string; success: boolean; error_message?: string; metadata?: Record<string, unknown> } }
  | { action: 'assign_role'; data: { user_id: string; role: string } }
  | { action: 'get_audit_logs'; data: { limit?: number } };

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get auth header and verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { action, data }: SecurityRequest = await req.json();

    let result: unknown;

    switch (action) {
      case 'check_rate_limit': {
        const { data: rateLimitResult, error: rateLimitError } = await supabase.rpc(
          'check_rate_limit',
          {
            _action: data.action_type,
            _max_attempts: data.max_attempts || 5,
            _window_minutes: data.window_minutes || 60
          }
        );

        if (rateLimitError) throw rateLimitError;
        
        result = { allowed: rateLimitResult };
        break;
      }

      case 'log_security_event': {
        const { error: logError } = await supabase.rpc('log_security_event', {
          _action: data.action,
          _resource: data.resource,
          _success: data.success,
          _error_message: data.error_message,
          _metadata: data.metadata
        });

        if (logError) throw logError;
        
        result = { logged: true };
        break;
      }

      case 'assign_role': {
        // Check if current user is admin
        const { data: hasAdminRole, error: roleCheckError } = await supabase.rpc(
          'has_role',
          { _user_id: user.id, _role: 'admin' }
        );

        if (roleCheckError || !hasAdminRole) {
          throw new Error("Insufficient permissions");
        }

        const { error: assignError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: data.user_id,
            role: data.role,
            assigned_by: user.id
          });

        if (assignError) throw assignError;
        
        result = { assigned: true };
        break;
      }

      case 'get_audit_logs': {
        // Check if user is admin or requesting their own logs
        const { data: isAdmin, error: adminCheckError } = await supabase.rpc(
          'has_role',
          { _user_id: user.id, _role: 'admin' }
        );

        let query = supabase
          .from('security_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(data.limit || 100);

        if (!isAdmin) {
          // Non-admins can only see their own logs
          query = query.eq('user_id', user.id);
        }

        const { data: logs, error: logsError } = await query;

        if (logsError) throw logsError;
        
        result = { logs };
        break;
      }

      default:
        throw new Error("Invalid action");
    }

    // Log this security API call
    await supabase.rpc('log_security_event', {
      _action: `security_api_${action}`,
      _resource: 'security_manager',
      _success: true,
      _metadata: { action, user_id: user.id }
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: unknown) {
    console.error("Security manager error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);