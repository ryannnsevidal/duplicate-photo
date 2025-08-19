// Test minimal Supabase authentication with no custom data
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

async function testMinimalAuth() {
  console.log('🧪 Testing Minimal Supabase Authentication (No Custom Data)\n');
  
  // Test 1: Check project status
  console.log('1️⃣ Checking Project Status...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Project connection failed:', error.message);
      console.log('   → This suggests a project configuration issue');
      return;
    } else {
      console.log('✅ Project connection successful');
    }
  } catch (err) {
    console.log('❌ Project connection exception:', err.message);
    return;
  }
  
  // Test 2: Test sign up with ABSOLUTELY minimal data
  console.log('\n2️⃣ Testing Minimal Sign Up (no custom data)...');
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Try sign up with NO custom data at all
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      // NO options, NO custom data
    });
    
    if (signUpError) {
      console.log('❌ Minimal sign-up failed:', signUpError.message);
      console.log('   → Error code:', signUpError.status);
      console.log('   → Error details:', signUpError);
      
      if (signUpError.message.includes('Database error')) {
        console.log('\n🔧 CRITICAL: This is a Supabase project configuration issue');
        console.log('   → Your Supabase project has restrictions preventing user creation');
        console.log('   → This is NOT a code issue - it\'s a project setup issue');
        console.log('\n📋 IMMEDIATE ACTIONS REQUIRED:');
        console.log('1. Go to Supabase Dashboard → Authentication → Settings');
        console.log('2. Ensure "Enable Email Signup" is ON');
        console.log('3. Turn OFF "Enable Email Confirmations" temporarily');
        console.log('4. Check if project is paused or has restrictions');
        console.log('5. Consider creating a new Supabase project');
      }
    } else {
      if (signUpData.user && !signUpData.session) {
        console.log('✅ Minimal sign-up successful - email confirmation required');
        console.log('   → User ID:', signUpData.user.id);
        console.log('   → Email:', signUpData.user.email);
        console.log('   → This proves the project works!');
      } else if (signUpData.session) {
        console.log('✅ Minimal sign-up successful - user automatically logged in');
        console.log('   → User ID:', signUpData.user?.id);
        console.log('   → Email:', signUpData.user?.email);
        console.log('   → This proves the project works!');
      }
    }
  } catch (err) {
    console.log('❌ Minimal sign-up exception:', err.message);
  }
  
  // Test 3: Check project limits
  console.log('\n3️⃣ Checking Project Configuration...');
  console.log('   → Project URL:', url);
  console.log('   → Anon Key length:', anonKey?.length || 0);
  console.log('   → Environment variables loaded:', !!url && !!anonKey);
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Fix Supabase project configuration (see above)');
  console.log('2. OR create a new Supabase project');
  console.log('3. Update your .env.local with new credentials');
  console.log('4. Test again');
}

testMinimalAuth();
