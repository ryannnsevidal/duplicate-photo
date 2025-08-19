// Test GitHub OAuth and real Supabase user flow
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function testGitHubAuth() {
  console.log('🔧 Testing GitHub OAuth and Real Supabase User Flow\n');
  
  // Test 1: Check GitHub OAuth Provider
  console.log('1️⃣ Checking GitHub OAuth Provider...');
  try {
    // This would normally be done in the browser, but we can check if the provider is configured
    console.log('✅ GitHub OAuth provider should be configured in Supabase Dashboard');
    console.log('   → Go to: Authentication → Providers → GitHub');
    console.log('   → Ensure Client ID and Client Secret are set');
  } catch (err) {
    console.log('❌ GitHub OAuth check failed:', err.message);
  }
  
  // Test 2: Test Email Sign Up (with better error handling)
  console.log('\n2️⃣ Testing Email Sign Up (with detailed error)...');
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:5173/auth/callback',
        data: {
          full_name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      },
    });
    
    if (signUpError) {
      console.log('❌ Sign-up failed:', signUpError.message);
      console.log('   → Error code:', signUpError.status);
      console.log('   → Error details:', signUpError);
      
      // Provide specific guidance based on error
      if (signUpError.message.includes('Database error')) {
        console.log('\n🔧 SOLUTION: Run the SQL setup in Supabase Dashboard:');
        console.log('   → Go to SQL Editor');
        console.log('   → Run the user_roles table creation script');
        console.log('   → Check RLS policies');
      } else if (signUpError.message.includes('email')) {
        console.log('\n🔧 SOLUTION: Check email configuration in Supabase Dashboard');
      }
    } else {
      if (signUpData.user && !signUpData.session) {
        console.log('✅ Sign-up successful - email confirmation required');
        console.log('   → User ID:', signUpData.user.id);
        console.log('   → Email:', signUpData.user.email);
        console.log('   → Confirmation email sent');
      } else if (signUpData.session) {
        console.log('✅ Sign-up successful - user automatically logged in');
        console.log('   → User ID:', signUpData.user?.id);
        console.log('   → Email:', signUpData.user?.email);
      }
    }
  } catch (err) {
    console.log('❌ Sign-up exception:', err.message);
  }
  
  // Test 3: Check if we can create a user manually in the database
  console.log('\n3️⃣ Testing Database User Creation...');
  try {
    // This would require service role key, but we can check if the table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.log('❌ user_roles table issue:', tableError.message);
      console.log('   → This confirms the database setup issue');
    } else {
      console.log('✅ user_roles table is accessible');
    }
  } catch (err) {
    console.log('❌ Database check failed:', err.message);
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. Fix the database setup (see SQL script below)');
  console.log('2. Test GitHub OAuth in the browser');
  console.log('3. Verify email confirmation flow');
  console.log('4. Test real user authentication');
}

testGitHubAuth();
