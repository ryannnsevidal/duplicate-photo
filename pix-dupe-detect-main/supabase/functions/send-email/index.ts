import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { WelcomeEmail } from './_templates/welcome-email.tsx'
import { PasswordResetEmail } from './_templates/password-reset-email.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    const { emailType, recipient, data } = await req.json();

    let html = '';
    let subject = '';

    switch (emailType) {
      case 'welcome':
        html = await renderAsync(
          React.createElement(WelcomeEmail, {
            userEmail: recipient,
            userName: data.userName || 'User',
            loginUrl: data.loginUrl || 'https://yourdomain.com/signin',
          })
        );
        subject = 'Welcome to Pix Dupe Detect!';
        break;

      case 'password-reset':
        html = await renderAsync(
          React.createElement(PasswordResetEmail, {
            userEmail: recipient,
            resetUrl: data.resetUrl,
            expiryTime: data.expiryTime || '1 hour',
          })
        );
        subject = 'Reset Your Password - Pix Dupe Detect';
        break;

      case 'account-locked':
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Security Alert: Account Temporarily Locked</h2>
            <p>Dear User,</p>
            <p>Your Pix Dupe Detect account has been temporarily locked due to multiple failed login attempts.</p>
            <p><strong>Account Details:</strong></p>
            <ul>
              <li>Email: ${recipient}</li>
              <li>Lock Time: ${data.lockTime}</li>
              <li>Unlock Time: ${data.unlockTime}</li>
            </ul>
            <p>If this wasn't you, please contact our support team immediately.</p>
            <p>Best regards,<br>Pix Dupe Detect Security Team</p>
          </div>
        `;
        subject = 'Security Alert: Account Locked';
        break;

      case 'simple':
        // Fallback for simple email requests (backward compatibility)
        html = data.html || '<p>No content provided</p>';
        subject = data.subject || 'Notification from Pix Dupe Detect';
        break;

      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }

    const { data: emailData, error } = await resend.emails.send({
      from: 'Pix Dupe Detect <no-reply@yourdomain.com>',
      to: [recipient],
      subject,
      html,
    });

    if (error) {
      console.error('Email send error:', error);
      throw error;
    }

    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailData.id,
        emailType,
        recipient 
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: unknown) {
    console.error('Error in send-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});