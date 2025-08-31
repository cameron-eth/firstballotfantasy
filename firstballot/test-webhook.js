const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://aanoqbjauukcczrlnxka.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhbm9xYmphdXVrY2N6cmxueGthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDUzMzU2NCwiZXhwIjoyMDU2MTA5NTY0fQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
  console.log(`🔍 Checking user: ${email}`);
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`❌ User ${email} not found in database`);
      return null;
    }
    console.error('Error checking user:', error);
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

async function simulatePayment(email, customerId = 'cus_test123') {
  console.log(`💳 Simulating payment for: ${email}`);
  
  // Simulate webhook payload
  const webhookPayload = {
    id: 'evt_test123',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test123',
        receipt_email: email,
        customer: customerId,
        billing_details: {
          email: email
        }
      }
    }
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature_will_fail' // This will fail signature validation
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const result = await response.text();
    console.log(`📡 Webhook response (${response.status}):`, result);
    
    if (response.status === 400 && result.includes('Invalid signature')) {
      console.log('✅ Webhook endpoint is working (signature validation working as expected)');
      
      // Now let's directly test the UserProfileService function
      console.log('🔄 Testing UserProfileService.processSuccessfulPayment directly...');
      
      const { UserProfileService } = require('./lib/user-profile-service.ts');
      const success = await UserProfileService.processSuccessfulPayment(email, customerId);
      
      if (success) {
        console.log('✅ UserProfileService.processSuccessfulPayment succeeded');
        
        // Check user again to see if it updated
        await checkUser(email);
      } else {
        console.log('❌ UserProfileService.processSuccessfulPayment failed');
      }
    }
    
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

async function main() {
  const testEmail = 'cnorfleetdvc@gmail.com';
  
  console.log('🚀 Starting webhook test...\n');
  
  // Check if user exists
  const user = await checkUser(testEmail);
  
  if (!user) {
    console.log('\n❌ Test user does not exist in database. Please create a user account first.');
    return;
  }
  
  console.log('\n📊 Current membership status:', user.membership_status);
  
  // Simulate payment
  await simulatePayment(testEmail);
  
  console.log('\n✅ Test completed');
}

main().catch(console.error);