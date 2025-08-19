// Script to create a test user in Supabase
// Run this with: node scripts/create-test-user.js

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

async function createTestUser() {
  const testEmail = 'test@example.com';
  const testPassword = 'TestPassword123!';
  
  console.log('🔧 Creating test user...');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ Test user already exists');
        console.log('📧 Email:', testEmail);
        console.log('🔑 Password:', testPassword);
      } else {
        console.error('❌ Error creating test user:', error.message);
      }
    } else {
      console.log('✅ Test user created successfully!');
      console.log('📧 Email:', testEmail);
      console.log('🔑 Password:', testPassword);
      console.log('⚠️  You may need to confirm the email in Supabase Dashboard');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

createTestUser();
