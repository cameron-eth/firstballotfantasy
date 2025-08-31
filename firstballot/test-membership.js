// Test script to check and simulate membership updates
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://aanoqbjauukcczrlnxka.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbm9xYmphdXVrY2N6cmxueGthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDUzMzU2NCwiZXhwIjoyMDU2MTA5NTY0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
  console.log(`🔍 Checking user: ${email}`);
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
    
  if (error) {
    console.error('❌ Error checking user:', error);
    return null;
  }
  
  if (!data) {
    console.log(`❌ User ${email} not found in database`);
    return null;
  }
  
  console.log(`✅ User found:`, {
    id: data.id,
    email: data.email,
    membership_status: data.membership_status,
    feature_access: data.feature_access,
    stripe_id: data.stripe_id
  });
  
  return data;
}

async function updateMembershipDirectly(email) {
  console.log(`🔄 Updating membership directly for: ${email}`);
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ 
      membership_status: true,
      feature_access: true,
      stripe_id: 'test_customer_id',
      updated_at: new Date().toISOString()
    })
    .eq('email', email)
    .select();
    
  if (error) {
    console.error('❌ Error updating membership:', error);
    return false;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Successfully updated membership:', data[0]);
    return true;
  } else {
    console.log('❌ No rows were updated');
    return false;
  }
}

async function testWebhookEndpoint(email) {
  console.log(`🧪 Testing webhook endpoint with email: ${email}`);
  
  // Create a test payment_intent payload
  const webhookPayload = {
    id: 'evt_test_' + Date.now(),
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_' + Date.now(),
        receipt_email: email,
        customer: 'cus_test_' + Date.now(),
        billing_details: {
          email: email
        },
        customer_details: {
          email: email
        }
      }
    }
  };
  
  console.log('📡 Sending webhook payload:', JSON.stringify(webhookPayload, null, 2));
  
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature_for_testing'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const result = await response.text();
    console.log(`📡 Webhook response (${response.status}):`, result);
    
    if (response.status === 400 && result.includes('Invalid signature')) {
      console.log('✅ Webhook endpoint is working (signature validation as expected)');
      return true;
    } else if (response.status === 200) {
      console.log('✅ Webhook processed successfully!');
      return true;
    } else {
      console.log('❌ Unexpected webhook response');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
    return false;
  }
}

async function main() {
  const testEmail = 'cnorfleetdvc@gmail.com';
  
  console.log('🚀 Starting membership test...\n');
  
  // Step 1: Check if user exists
  console.log('=== STEP 1: Check User ===');
  let user = await checkUser(testEmail);
  
  if (!user) {
    console.log('\n❌ Test user does not exist. Please create an account first.');
    console.log('You can create an account by visiting: http://localhost:3000/login');
    return;
  }
  
  console.log(`\n📊 Current membership status: ${user.membership_status}`);
  console.log(`📊 Current feature access: ${user.feature_access}`);
  
  // Step 2: Test webhook endpoint
  console.log('\n=== STEP 2: Test Webhook Endpoint ===');
  const webhookWorking = await testWebhookEndpoint(testEmail);
  
  if (!webhookWorking) {
    console.log('❌ Webhook endpoint test failed');
    return;
  }
  
  // Step 3: Test direct membership update
  console.log('\n=== STEP 3: Test Direct Database Update ===');
  const updateSuccess = await updateMembershipDirectly(testEmail);
  
  if (updateSuccess) {
    console.log('\n=== STEP 4: Verify Update ===');
    user = await checkUser(testEmail);
    
    if (user && user.membership_status === true) {
      console.log('✅ SUCCESS: Membership status updated successfully!');
      console.log('✅ The database update functionality is working correctly.');
      console.log('\n🔧 NEXT STEPS:');
      console.log('1. The issue is likely with webhook signature validation');
      console.log('2. Test with a real Stripe payment to see if webhooks work end-to-end');
      console.log('3. Check application logs when processing real webhook events');
    } else {
      console.log('❌ FAILED: Membership status was not updated');
    }
  } else {
    console.log('❌ FAILED: Direct database update failed');
  }
  
  console.log('\n✅ Test completed');
}

// Load environment variables
require('dotenv').config();

main().catch(console.error);