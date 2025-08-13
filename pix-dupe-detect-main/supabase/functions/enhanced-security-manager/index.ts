import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log('Enhanced Security Manager - Request received:', req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body with input validation
    let body;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.trim() === '') {
        throw new Error('Request body is required');
      }
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Enhanced Security Manager - Invalid request body:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format',
          details: 'Request body must be valid JSON'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { action, data } = body;

    // Validate required fields
    if (!action) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: action',
          valid_actions: [
            'check_ip_reputation',
            'update_ip_reputation', 
            'check_enhanced_rate_limit',
            'validate_email_domain',
            'track_user_session',
            'log_captcha_attempt',
            'get_security_stats',
            'record_failed_attempt',
            'reset_attempts',
            'get_google_credentials'
          ]
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Sanitize input action
    const sanitizedAction = action.replace(/[^a-zA-Z_]/g, '').toLowerCase();
    
    // Authentication required for most actions
    const authRequiredActions = [
      'update_ip_reputation',
      'track_user_session', 
      'get_security_stats'
    ];
    
    if (authRequiredActions.includes(sanitizedAction)) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authentication required for this action' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Get client IP for logging with proper parsing for multiple IPs
    let clientIP = req.headers.get('x-forwarded-for') || 
                   req.headers.get('x-real-ip') || 
                   '127.0.0.1';
    
    // Handle multiple IPs (take the first one)
    if (clientIP.includes(',')) {
      clientIP = clientIP.split(',')[0].trim();
    }

    // Rate limiting for security endpoints
    if (['check_enhanced_rate_limit', 'record_failed_attempt'].includes(sanitizedAction)) {
      const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
        _action: 'security_api_call',
        _max_attempts: 100,
        _window_minutes: 1
      });

      if (!rateLimitCheck) {
        console.warn('Enhanced Security Manager - Rate limit exceeded for IP:', clientIP);
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            retry_after: 60
          }),
          { 
            status: 429, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    let result;

    switch (sanitizedAction) {
      case 'check_ip_reputation': {
        const ipAddress = data?.ip_address || clientIP;
        
        // Validate IP address format
        if (!ipAddress || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ipAddress)) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid IP address format',
              provided: ipAddress
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const { data: reputation, error } = await supabase.rpc('check_ip_reputation', {
          _ip_address: ipAddress
        });

        if (error) throw error;
        result = reputation;
        break;
      }

      case 'update_ip_reputation': {
        const { ip_address, score_delta, reason } = data || {};
        
        if (!ip_address || typeof score_delta !== 'number') {
          return new Response(
            JSON.stringify({ 
              error: 'Missing required fields: ip_address and score_delta',
              required_fields: ['ip_address', 'score_delta'],
              optional_fields: ['reason']
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Sanitize reason input
        const sanitizedReason = reason ? (await supabase.rpc('sanitize_input', {
          _input: reason,
          _max_length: 500
        })).data : null;

        const { error } = await supabase.rpc('update_ip_reputation', {
          _ip_address: ip_address,
          _score_delta: Math.max(-100, Math.min(100, score_delta)), // Clamp between -100 and 100
          _block_reason: sanitizedReason
        });

        if (error) throw error;
        result = { success: true, message: 'IP reputation updated' };
        break;
      }

      case 'check_enhanced_rate_limit': {
        const { 
          action_type, 
          ip_address = clientIP, 
          max_attempts = 5, 
          window_minutes = 60, 
          severity_level = 1 
        } = data || {};

        if (!action_type) {
          return new Response(
            JSON.stringify({ 
              error: 'Missing required field: action_type'
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Sanitize action_type
        const sanitizedActionType = (await supabase.rpc('sanitize_input', {
          _input: action_type,
          _max_length: 100
        })).data;

        const { data: rateLimitResult, error } = await supabase.rpc('check_enhanced_rate_limit', {
          _action: sanitizedActionType,
          _ip_address: ip_address,
          _max_attempts: Math.max(1, Math.min(1000, max_attempts)),
          _window_minutes: Math.max(1, Math.min(1440, window_minutes)),
          _severity_level: Math.max(1, Math.min(5, severity_level))
        });

        if (error) throw error;
        result = rateLimitResult;
        break;
      }

      case 'validate_email_domain': {
        const { email } = data || {};
        
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(
            JSON.stringify({ 
              error: 'Invalid email format',
              provided: email
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const { data: isAllowed, error } = await supabase.rpc('is_email_domain_allowed', {
          _email: email.toLowerCase()
        });

        if (error) throw error;
        result = { 
          allowed: isAllowed,
          email: email.toLowerCase(),
          domain: email.split('@')[1].toLowerCase()
        };
        break;
      }

      case 'get_security_stats': {
        const { data: auditLogs, error } = await supabase
          .from('security_audit_log')
          .select('action, success, created_at')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;

        // Process stats
        const stats = {
          total_events: auditLogs.length,
          successful_events: auditLogs.filter(log => log.success).length,
          failed_events: auditLogs.filter(log => !log.success).length,
          top_actions: Object.entries(
            auditLogs.reduce((acc, log) => {
              acc[log.action] = (acc[log.action] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          )
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([action, count]) => ({ action, count })),
          hourly_breakdown: {} // Add hourly breakdown logic if needed
        };

        result = stats;
        break;
      }

      case 'record_failed_attempt': {
        const { ip_address = clientIP, action_type = 'login', user_agent } = data || {};
        
        // Sanitize inputs
        const sanitizedActionType = (await supabase.rpc('sanitize_input', {
          _input: action_type,
          _max_length: 100
        })).data;

        const sanitizedUserAgent = user_agent ? (await supabase.rpc('sanitize_input', {
          _input: user_agent,
          _max_length: 500
        })).data : null;

        // Update IP reputation
        const { error: updateError } = await supabase.rpc('update_ip_reputation', {
          _ip_address: ip_address,
          _score_delta: -5,
          _block_reason: `Failed ${sanitizedActionType} attempt`
        });

        if (updateError) throw updateError;

        // Log security event
        const { error: logError } = await supabase.rpc('log_security_event', {
          _action: 'failed_attempt_recorded',
          _resource: sanitizedActionType,
          _success: true,
          _metadata: {
            ip_address,
            action_type: sanitizedActionType,
            user_agent: sanitizedUserAgent,
            timestamp: new Date().toISOString()
          }
        });

        if (logError) throw logError;
        result = { success: true, message: 'Failed attempt recorded' };
        break;
      }

      case 'reset_attempts': {
        const { ip_address = clientIP } = data || {};
        
        const { error } = await supabase.rpc('update_ip_reputation', {
          _ip_address: ip_address,
          _score_delta: 10,
          _block_reason: null
        });

        if (error) throw error;
        result = { success: true, message: 'Attempts reset' };
        break;
      }

      case 'get_google_credentials': {
        // Return Google API credentials from secrets
        const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
        
        if (!googleClientId || !googleApiKey) {
          return new Response(
            JSON.stringify({ 
              error: 'Google credentials not configured',
              details: 'Please contact administrator to configure Google Drive integration'
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        result = {
          client_id: googleClientId,
          api_key: googleApiKey
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: `Unknown action: ${sanitizedAction}`,
            valid_actions: [
              'check_ip_reputation',
              'update_ip_reputation',
              'check_enhanced_rate_limit', 
              'validate_email_domain',
              'get_security_stats',
              'record_failed_attempt',
              'reset_attempts'
            ]
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    // Log the security API call for audit purposes
    try {
      await supabase.rpc('log_security_event', {
        _action: 'security_api_call',
        _resource: 'enhanced_security_manager',
        _success: true,
        _metadata: {
          action: sanitizedAction,
          client_ip: clientIP,
          user_agent: req.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.warn('Enhanced Security Manager - Failed to log API call:', logError);
      // Don't fail the request if logging fails
    }

    console.log('Enhanced Security Manager - Action completed successfully:', sanitizedAction);
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Enhanced Security Manager - Error:', error);
    
    // Log error for security monitoring
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await supabase.rpc('log_security_event', {
        _action: 'security_api_error',
        _resource: 'enhanced_security_manager',
        _success: false,
        _error_message: error.message,
        _metadata: {
          error_stack: error.stack,
          client_ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.warn('Enhanced Security Manager - Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An error occurred while processing your request'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});