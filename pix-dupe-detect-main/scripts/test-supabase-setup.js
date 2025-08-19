// Script to test Supabase setup and identify missing components
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

async function testSupabaseSetup() {
  console.log('🔧 Testing Supabase setup...\n');
  
  // Test 1: Basic connection
  console.log('1️⃣ Testing basic connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Session check failed:', error.message);
    } else {
      console.log('✅ Session check passed');
    }
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
  }
  
  // Test 2: Check if auth is enabled
  console.log('\n2️⃣ Testing authentication...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        console.log('✅ Auth is working (expected error for invalid credentials)');
      } else {
        console.log('❌ Auth error:', error.message);
      }
    } else {
      console.log('✅ Auth working with test credentials');
    }
  } catch (err) {
    console.log('❌ Auth test failed:', err.message);
  }
  
  // Test 3: Check for required tables
  console.log('\n3️⃣ Checking for required tables...');
  try {
    // Check if user_roles table exists (used in AdminRoute)
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1);
    
    if (rolesError) {
      console.log('⚠️ user_roles table missing or inaccessible:', rolesError.message);
      console.log('   This is needed for admin functionality');
    } else {
      console.log('✅ user_roles table accessible');
    }
  } catch (err) {
    console.log('❌ Table check failed:', err.message);
  }
  
  // Test 4: Check RLS policies
  console.log('\n4️⃣ Checking RLS policies...');
  console.log('   (This would require service role key to check properly)');
  console.log('   Make sure you have RLS enabled and appropriate policies');
  
  console.log('\n📋 Summary:');
  console.log('   - If auth tests pass, you can create users and sign in');
  console.log('   - If user_roles table is missing, admin features won\'t work');
  console.log('   - Check Supabase Dashboard → Authentication → Settings');
  console.log('   - Ensure email confirmation is configured as needed');
}

testSupabaseSetup();
