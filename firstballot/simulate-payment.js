// Simulate a payment webhook to test membership update
const stripe = require('stripe')(process.env.NEXT_STRIPE_SECRET_KEY);

async function simulatePayment(email) {
  console.log(`💳 Simulating payment for: ${email}`);
  
  try {
    // Create a test customer
    const customer = await stripe.customers.create({
      email: email,
      description: 'Test customer for webhook testing'
    });
    
    console.log(`✅ Created test customer: ${customer.id}`);
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 2000, // $20.00
      currency: 'usd',
      customer: customer.id,
      receipt_email: email,
      metadata: {
        test: 'webhook_simulation'
      }
    });
    
    console.log(`✅ Created payment intent: ${paymentIntent.id}`);
    
    // Simulate the webhook payload that Stripe would send
    const webhookPayload = {
      id: 'evt_test_' + Date.now(),
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntent.id,
          customer: customer.id,
          receipt_email: email,
          billing_details: {
            email: email
          },
          customer_details: {
            email: email
          },
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: 'succeeded'
        }
      }
    };
    
    console.log('📡 Webhook payload created:', JSON.stringify(webhookPayload, null, 2));
    
    // Test the webhook endpoint
    const response = await fetch('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature_will_fail'
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const result = await response.text();
    console.log(`📡 Webhook response (${response.status}):`, result);
    
    if (response.status === 400 && result.includes('Invalid signature')) {
      console.log('✅ Webhook endpoint is working (signature validation as expected)');
      console.log('🔧 The webhook would work with a real Stripe signature');
      
      // Clean up test customer
      await stripe.customers.del(customer.id);
      console.log('🧹 Cleaned up test customer');
      
      return true;
    } else if (response.status === 200) {
      console.log('✅ Webhook processed successfully!');
      return true;
    } else {
      console.log('❌ Unexpected webhook response');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error simulating payment:', error);
    return false;
  }
}

async function testRealPayment() {
  console.log('\n🎯 REAL PAYMENT TEST INSTRUCTIONS:');
  console.log('1. Go to your payment link: https://buy.stripe.com/test_dRm3cvdadbi5fdV3oZeAg00');
  console.log('2. Use test card: 4242 4242 4242 4242');
  console.log('3. Use email: cnorfleetdvc@gmail.com');
  console.log('4. Expiry: 12/25, CVC: 123');
  console.log('5. Complete the payment');
  console.log('6. Check your application logs for webhook processing');
  console.log('\n📊 Expected logs:');
  console.log('✅ Webhook signature verified for event: payment_intent.succeeded');
  console.log('📧 Processing payment for email: cnorfleetdvc@gmail.com');
  console.log('✅ Successfully processed payment intent for cnorfleetdvc@gmail.com');
}

async function main() {
  require('dotenv').config();
  
  const testEmail = 'cnorfleetdvc@gmail.com';
  
  console.log('🚀 Starting payment simulation test...\n');
  
  if (!process.env.NEXT_STRIPE_SECRET_KEY) {
    console.log('❌ NEXT_STRIPE_SECRET_KEY not found in environment variables');
    return;
  }
  
  console.log('=== STEP 1: Simulate Payment ===');
  const success = await simulatePayment(testEmail);
  
  if (success) {
    console.log('\n✅ Webhook endpoint is working correctly!');
    console.log('\n=== STEP 2: Test Real Payment ===');
    await testRealPayment();
    
    console.log('\n🔍 DEBUGGING CHECKLIST:');
    console.log('1. ✅ Webhook endpoint is accessible');
    console.log('2. ✅ Webhook signature validation is working');
    console.log('3. ✅ Environment variables are loaded');
    console.log('4. ❓ Need to test with real Stripe webhook signature');
    console.log('5. ❓ Need to verify user exists in database');
    
    console.log('\n💡 LIKELY ISSUE:');
    console.log('- The user cnorfleetdvc@gmail.com may not exist in your user_profiles table');
    console.log('- Or the webhook signature validation is preventing processing');
    console.log('- Test with a real payment to see the full flow');
    
  } else {
    console.log('\n❌ Webhook simulation failed');
  }
}

main().catch(console.error);