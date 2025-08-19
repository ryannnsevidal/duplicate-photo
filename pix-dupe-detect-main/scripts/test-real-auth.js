// Comprehensive test of real Supabase authentication flow
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

async function testRealAuthFlow() {
  console.log('🧪 Testing Real Supabase Authentication Flow\n');
  
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  // Test 1: Sign Up Flow
  console.log('1️⃣ Testing Sign Up Flow...');
  try {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:5173/auth/callback',
      },
    });
    
    if (signUpError) {
      console.log('❌ Sign-up failed:', signUpError.message);
      if (signUpError.message.includes('User already registered')) {
        console.log('   → User already exists, this is expected');
      } else {
        console.log('   → This might indicate a configuration issue');
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
  
  // Test 2: Sign In Flow (with existing user)
  console.log('\n2️⃣ Testing Sign In Flow...');
  try {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Use existing test user
      password: 'TestPassword123!',
    });
    
    if (signInError) {
      console.log('❌ Sign-in failed:', signInError.message);
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('   → Invalid credentials (expected if user not confirmed)');
      }
    } else {
      console.log('✅ Sign-in successful');
      console.log('   → User ID:', signInData.user?.id);
      console.log('   → Email:', signInData.user?.email);
      console.log('   → Session created');
    }
  } catch (err) {
    console.log('❌ Sign-in exception:', err.message);
  }
  
  // Test 3: Session Management
  console.log('\n3️⃣ Testing Session Management...');
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session check failed:', sessionError.message);
    } else if (session) {
      console.log('✅ Active session found');
      console.log('   → User ID:', session.user.id);
      console.log('   → Expires:', new Date(session.expires_at * 1000).toLocaleString());
    } else {
      console.log('ℹ️ No active session (expected if not signed in)');
    }
  } catch (err) {
    console.log('❌ Session check exception:', err.message);
  }
  
  // Test 4: Sign Out Flow
  console.log('\n4️⃣ Testing Sign Out Flow...');
  try {
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.log('❌ Sign-out failed:', signOutError.message);
    } else {
      console.log('✅ Sign-out successful');
    }
  } catch (err) {
    console.log('❌ Sign-out exception:', err.message);
  }
  
  // Test 5: Database Access (if authenticated)
  console.log('\n5️⃣ Testing Database Access...');
  try {
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);
    
    if (rolesError) {
      console.log('❌ Database access failed:', rolesError.message);
      if (rolesError.message.includes('JWT')) {
        console.log('   → JWT error - might need authentication');
      } else if (rolesError.message.includes('RLS')) {
        console.log('   → RLS policy issue - check policies');
      }
    } else {
      console.log('✅ Database access successful');
      console.log('   → user_roles table accessible');
    }
  } catch (err) {
    console.log('❌ Database access exception:', err.message);
  }
  
  console.log('\n📋 Test Summary:');
  console.log('   - If sign-up works, email confirmation is configured');
  console.log('   - If sign-in works, authentication is working');
  console.log('   - If database access works, RLS policies are correct');
  console.log('   - Check Supabase Dashboard for any errors');
}

testRealAuthFlow();
