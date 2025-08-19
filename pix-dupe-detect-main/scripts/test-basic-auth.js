// Test basic Supabase authentication without user roles
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

async function testBasicAuth() {
  console.log('🧪 Testing Basic Supabase Authentication (No User Roles)\n');
  
  // Test 1: Check if we can connect to Supabase
  console.log('1️⃣ Testing Supabase Connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (err) {
    console.log('❌ Connection exception:', err.message);
  }
  
  // Test 2: Test basic sign up (without any custom data)
  console.log('\n2️⃣ Testing Basic Sign Up (minimal)...');
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError) {
      console.log('❌ Sign-up failed:', signUpError.message);
      console.log('   → Error code:', signUpError.status);
      console.log('   → Error details:', signUpError);
      
      // Check if it's a configuration issue
      if (signUpError.message.includes('Database error')) {
        console.log('\n🔧 This suggests a Supabase project configuration issue:');
        console.log('   → Check Supabase Dashboard → Authentication → Settings');
        console.log('   → Ensure "Enable Email Signup" is ON');
        console.log('   → Check if email confirmations are properly configured');
        console.log('   → Verify Site URL and Redirect URLs are set correctly');
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
  
  // Test 3: Check Supabase project settings
  console.log('\n3️⃣ Checking Project Configuration...');
  console.log('   → Project URL:', url);
  console.log('   → Anon Key length:', anonKey?.length || 0);
  console.log('   → Environment variables loaded:', !!url && !!anonKey);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Check Supabase Dashboard → Authentication → Settings');
  console.log('2. Verify "Enable Email Signup" is ON');
  console.log('3. Check Site URL and Redirect URLs');
  console.log('4. Try disabling email confirmation temporarily');
  console.log('5. Check if there are any project-level restrictions');
}

testBasicAuth();
