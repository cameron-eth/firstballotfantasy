import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { SubscriptionService } from '@/lib/subscription-service';
import { UserProfileService } from '@/lib/user-profile-service';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No webhook signature provided');
    return NextResponse.json(
      { error: 'No signature provided' }, 
      { status: 400 }
    );
  }

  // Validate webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' }, 
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`✅ Webhook signature verified for event: ${event.type}`);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' }, 
      { status: 400 }
    );
  }

  try {
    console.log(`🔄 Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      // Payment Links Events
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
        
      // Checkout Session Events
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
        
      // Invoice Events
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      // Subscription Events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.trial_will_end':
        await handleSubscriptionTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
        
      // Customer Events
      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;
        
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    console.log(`✅ Successfully processed webhook event: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`❌ Error handling webhook event ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed' }, 
      { status: 500 }
    );
  }
}

// ===== PAYMENT LINKS EVENT HANDLERS =====

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💳 Payment intent succeeded:', paymentIntent.id);
  
  try {
    // Extract customer email from payment intent
    const customerEmail = paymentIntent.receipt_email || 
                         paymentIntent.billing_details?.email ||
                         paymentIntent.customer_details?.email;
    
    if (!customerEmail) {
      console.error('❌ No customer email found in payment intent');
      return;
    }

    console.log(`📧 Processing payment for email: ${customerEmail}`);

    // Process successful payment - update user profile
    const success = await UserProfileService.processSuccessfulPayment(
      customerEmail, 
      paymentIntent.customer as string || paymentIntent.id
    );
    
    if (success) {
      console.log(`✅ Successfully processed payment intent for ${customerEmail}`);
    } else {
      console.error(`❌ Failed to process payment intent for ${customerEmail}`);
    }
  } catch (error) {
    console.error('Error processing payment intent:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ Payment intent failed:', paymentIntent.id);
  
  try {
    const customerEmail = paymentIntent.receipt_email || 
                         paymentIntent.billing_details?.email ||
                         paymentIntent.customer_details?.email;
    
    if (customerEmail) {
      // Deactivate membership on payment failure
      await UserProfileService.updateUserMembershipStatus(customerEmail, false);
      console.log(`🔒 Deactivated membership for ${customerEmail} due to payment failure`);
    }
  } catch (error) {
    console.error('Error processing failed payment intent:', error);
  }
}

// ===== CHECKOUT SESSION EVENT HANDLERS =====

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Checkout session completed:', session.id);
  
  const customerEmail = session.customer_details?.email;
  const customerId = session.customer as string;
  
  if (!customerEmail) {
    console.error('❌ No customer email in checkout session');
    return;
  }

  try {
    console.log(`📧 Processing checkout for email: ${customerEmail}`);
    
    // Process successful payment - update user profile
    const success = await UserProfileService.processSuccessfulPayment(customerEmail, customerId);
    
    if (success) {
      console.log(`✅ Successfully processed checkout for ${customerEmail}`);
    } else {
      console.error(`❌ Failed to process checkout for ${customerEmail}`);
    }
  } catch (error) {
    console.error('Error processing checkout session:', error);
  }
}

// ===== INVOICE EVENT HANDLERS =====

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Invoice payment succeeded:', invoice.id);
  
  const customerEmail = invoice.customer_email;
  const customerId = invoice.customer as string;
  
  if (!customerEmail) {
    console.error('❌ No customer email in invoice');
    return;
  }

  try {
    console.log(`📧 Processing invoice payment for email: ${customerEmail}`);
    
    // Process successful payment - update user profile
    const success = await UserProfileService.processSuccessfulPayment(customerEmail, customerId);
    
    if (success) {
      console.log(`✅ Successfully processed invoice payment for ${customerEmail}`);
    } else {
      console.error(`❌ Failed to process invoice payment for ${customerEmail}`);
    }
  } catch (error) {
    console.error('Error processing invoice payment:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('❌ Invoice payment failed:', invoice.id);
  
  const customerEmail = invoice.customer_email;
  
  if (customerEmail) {
    try {
      // Deactivate membership on payment failure
      await UserProfileService.updateUserMembershipStatus(customerEmail, false);
      console.log(`🔒 Deactivated membership for ${customerEmail} due to invoice payment failure`);
    } catch (error) {
      console.error('Error processing failed invoice payment:', error);
    }
  }
}

// ===== SUBSCRIPTION EVENT HANDLERS =====

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('📅 Subscription created:', subscription.id);
  
  try {
    // Update our database with the subscription details
    const { error } = await SubscriptionService.updateSubscriptionStatus(
      subscription.id,
      subscription.status,
      subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      subscription.current_period_start,
      subscription.current_period_end
    );
    
    if (error) {
      console.error('Error updating subscription status:', error);
    } else {
      console.log(`✅ Successfully updated subscription status for ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('📅 Subscription updated:', subscription.id);
  
  try {
    await SubscriptionService.updateSubscriptionStatus(
      subscription.id,
      subscription.status,
      subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      subscription.current_period_start,
      subscription.current_period_end
    );
    console.log(`✅ Successfully updated subscription ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('📅 Subscription deleted:', subscription.id);
  
  try {
    await SubscriptionService.updateSubscriptionStatus(
      subscription.id,
      subscription.status,
      subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      subscription.current_period_start,
      subscription.current_period_end
    );
    console.log(`✅ Successfully processed subscription deletion for ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleSubscriptionTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('📅 Subscription trial will end:', subscription.id);
  
  // You could send an email notification here
  // await sendTrialEndingEmail(subscription.customer as string);
}

// ===== CUSTOMER EVENT HANDLERS =====

async function handleCustomerCreated(customer: Stripe.Customer) {
  console.log('👤 Customer created:', customer.id);
  
  if (customer.email) {
    console.log(`📧 New customer created with email: ${customer.email}`);
    // You could send a welcome email here
    // await sendWelcomeEmail(customer.email);
  }
} 