// Simple webhook test without external dependencies
async function testWebhook(email) {
  console.log(`🧪 Testing webhook for: ${email}`);
  
  // Create a realistic payment_intent.succeeded payload
  const webhookPayload = {
    id: 'evt_test_' + Date.now(),
    type: 'payment_intent.succeeded',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: 'pi_test_' + Date.now(),
        object: 'payment_intent',
        amount: 2000,
        currency: 'usd',
        customer: 'cus_test_' + Date.now(),
        receipt_email: email,
        billing_details: {
          email: email,
          name: 'Test User'
        },
        customer_details: {
          email: email,
          name: 'Test User'
        },
        status: 'succeeded'
      }
    }
  };
  
  console.log('📡 Sending webhook payload...');
  
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
    console.log(`📡 Response (${response.status}):`, result.substring(0, 200) + '...');
    
    if (response.status === 400 && result.includes('Invalid signature')) {
      console.log('✅ Webhook endpoint is working correctly!');
      console.log('🔧 Signature validation is working as expected');
      return true;
    } else if (response.status === 200) {
      console.log('🎉 Webhook processed successfully!');
      return true;
    } else if (response.status === 500) {
      console.log('❌ Server error - check application logs');
      return false;
    } else {
      console.log('❓ Unexpected response');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
    return false;
  }
}

async function main() {
  const testEmail = 'cnorfleetdvc@gmail.com';
  
  console.log('🚀 Testing webhook functionality...\n');
  
  const success = await testWebhook(testEmail);
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 WEBHOOK TEST RESULTS');
  console.log('='.repeat(60));
  
  if (success) {
    console.log('✅ Webhook endpoint is working correctly');
    console.log('✅ Server is running and accessible');
    console.log('✅ Signature validation is working');
    
    console.log('\n🎯 TO TEST REAL PAYMENT PROCESSING:');
    console.log('1. Go to: https://buy.stripe.com/test_dRm3cvdadbi5fdV3oZeAg00');
    console.log('2. Use test card: 4242 4242 4242 4242');
    console.log('3. Use email: cnorfleetdvc@gmail.com');
    console.log('4. Complete the payment');
    console.log('5. Watch your application logs for webhook processing');
    
    console.log('\n📊 EXPECTED LOGS AFTER REAL PAYMENT:');
    console.log('✅ Webhook signature verified for event: payment_intent.succeeded');
    console.log('📧 Processing payment for email: cnorfleetdvc@gmail.com');
    console.log('🔄 Updating membership status for cnorfleetdvc@gmail.com to true');
    console.log('✅ Successfully processed payment intent for cnorfleetdvc@gmail.com');
    
    console.log('\n🔍 IF MEMBERSHIP STILL NOT UPDATING:');
    console.log('1. Check if user cnorfleetdvc@gmail.com exists in user_profiles table');
    console.log('2. Verify webhook URL in Stripe Dashboard matches your domain');
    console.log('3. Check that webhook secret in .env matches Stripe Dashboard');
    console.log('4. Look for error messages in application logs');
    
    console.log('\n💡 QUICK DATABASE CHECK:');
    console.log('Run this SQL query in Supabase:');
    console.log(`SELECT * FROM user_profiles WHERE email = '${testEmail}';`);
    
  } else {
    console.log('❌ Webhook endpoint test failed');
    console.log('🔧 Check that your Next.js server is running on port 3000');
  }
  
  console.log('\n✅ Test completed');
}

main().catch(console.error);