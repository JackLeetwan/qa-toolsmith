/**
 * Diagnostic script to test Supabase signup directly
 * This will help us see the exact error from Supabase Auth
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('\n🔍 Supabase Signup Diagnostic Test');
console.log('====================================\n');

// Check environment variables
console.log('Environment Configuration:');
console.log(`  - SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`  - SUPABASE_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: Missing required environment variables!');
  console.error('   Make sure .env file exists with SUPABASE_URL and SUPABASE_KEY');
  process.exit(1);
}

console.log(`  - URL Type: ${supabaseUrl.includes('localhost') ? '🏠 Local' : '☁️  Cloud'}`);
console.log(`  - Full URL: ${supabaseUrl}\n`);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test signup with mailinator.com (accepted by Supabase)
const testEmail = `test-diagnostic-${Date.now()}@mailinator.com`;
const testPassword = 'SecurePass123';

console.log('🧪 Testing Signup:');
console.log(`  - Email: ${testEmail}`);
console.log(`  - Password: ${testPassword.replace(/./g, '*')}\n`);

console.log('📡 Calling supabase.auth.signUp()...\n');

try {
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (error) {
    console.error('❌ SIGNUP FAILED!\n');
    console.error('Error Details:');
    console.error('  - Code:', error.code || 'N/A');
    console.error('  - Name:', error.name || 'N/A');
    console.error('  - Status:', error.status || 'N/A');
    console.error('  - Message:', error.message || 'N/A');
    console.error('\nFull Error Object:');
    console.error(JSON.stringify(error, null, 2));
    
    // Provide diagnostic suggestions
    console.error('\n💡 Possible Solutions:');
    if (error.code === 'email_address_invalid' || error.message?.includes('invalid')) {
      console.error('   → Supabase is blocking this email domain as invalid');
      console.error('   → @example.com is commonly blocked by Supabase Auth');
      console.error('   → Use @mailinator.com, @guerrillamail.com, or real domain instead');
    }
    if (error.message?.includes('Email not allowed')) {
      console.error('   → Supabase may be blocking this email domain');
      console.error('   → Try using a different email domain or real email service');
    }
    if (error.message?.includes('confirm') || error.code === 'email_confirmation_required') {
      console.error('   → Email confirmation is required in Supabase Auth settings');
      console.error('   → Go to Supabase Dashboard → Authentication → Email');
      console.error('   → Disable "Enable email confirmations"');
    }
    if (error.message?.includes('rate limit')) {
      console.error('   → Too many signup attempts - wait a few minutes');
    }
    if (error.message?.includes('password')) {
      console.error('   → Password doesn\'t meet requirements');
      console.error('   → Check Supabase Auth password policy settings');
    }
    
    process.exit(1);
  }

  console.log('✅ SIGNUP SUCCESSFUL!\n');
  console.log('User Data:');
  console.log('  - ID:', data.user?.id || 'N/A');
  console.log('  - Email:', data.user?.email || 'N/A');
  console.log('  - Email Confirmed:', data.user?.email_confirmed_at ? '✅ Yes' : '❌ No');
  console.log('  - Created At:', data.user?.created_at || 'N/A');
  
  if (!data.user?.email_confirmed_at) {
    console.log('\n⚠️  WARNING: Email is not confirmed!');
    console.log('   This might prevent auto-login after registration.');
  }
  
  console.log('\n✅ Test completed successfully');
  
} catch (error) {
  console.error('\n❌ UNEXPECTED ERROR!\n');
  console.error(error);
  process.exit(1);
}

