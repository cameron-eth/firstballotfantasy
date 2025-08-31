import { stripe } from './stripe';
import { supabaseServer } from './supabase-server';
import { STRIPE_PRODUCTS } from './stripe';

export interface SubscriptionData {
  id: string;
  auth_id: string; // Changed from user_id to auth_id
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  plan_type: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export class SubscriptionService {
  /**
   * Create a Stripe customer and link it to the user
   */
  static async createCustomer(authId: string, email: string) {
    try {
      // Create customer in Stripe
      const customer = await stripe.customers.create({
        email,
        metadata: { authId }
      });
      
      // Store customer ID in our database
      const { error } = await supabaseServer
        .from('subscriptions')
        .insert({
          auth_id: authId,
          stripe_customer_id: customer.id,
          status: 'incomplete'
        });
        
      if (error) {
        console.error('Error storing customer ID:', error);
        throw new Error('Failed to store customer information');
      }
      
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }
  
  /**
   * Create a checkout session for subscription
   */
  static async createCheckoutSession(authId: string, priceId: string) {
    try {
      // Get or create customer
      let { data: subscription } = await supabaseServer
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('auth_id', authId)
        .single();
        
      if (!subscription?.stripe_customer_id) {
        // Get user email from auth
        const { data: user } = await supabaseServer.auth.admin.getUserById(authId);
        if (!user.user?.email) {
          throw new Error('User email not found');
        }
        
        const customer = await this.createCustomer(authId, user.user.email);
        subscription = { stripe_customer_id: customer.id };
      }
      
      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: subscription.stripe_customer_id,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing?canceled=true`,
        metadata: { authId },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      });
      
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }
  
  /**
   * Create a customer portal session
   */
  static async createPortalSession(authId: string) {
    try {
      const { data: subscription } = await supabaseServer
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('auth_id', authId)
        .single();
        
      if (!subscription?.stripe_customer_id) {
        throw new Error('No subscription found for user');
      }
      
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/billing`
      });
      
      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }
  
  /**
   * Get subscription data for a user
   */
  static async getSubscription(authId: string): Promise<SubscriptionData | null> {
    try {
      const { data, error } = await supabaseServer
        .from('subscriptions')
        .select('*')
        .eq('auth_id', authId)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }
  
  /**
   * Check if user has active subscription
   */
  static async hasActiveSubscription(authId: string): Promise<boolean> {
    const subscription = await this.getSubscription(authId);
    return subscription?.status === 'active' || subscription?.status === 'trialing';
  }
  
  /**
   * Update subscription status from webhook
   */
  static async updateSubscriptionStatus(
    stripeSubscriptionId: string, 
    status: string, 
    planType: 'monthly' | 'yearly',
    currentPeriodStart: number,
    currentPeriodEnd: number
  ) {
    try {
      const { error } = await supabaseServer
        .from('subscriptions')
        .update({
          status,
          plan_type: planType,
          current_period_start: new Date(currentPeriodStart * 1000).toISOString(),
          current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', stripeSubscriptionId);
        
      if (error) {
        console.error('Error updating subscription status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateSubscriptionStatus:', error);
      throw error;
    }
  }
} 