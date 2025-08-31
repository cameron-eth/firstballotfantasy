import Stripe from 'stripe';

if (!process.env.NEXT_STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
  typescript: true,
});

export const STRIPE_PRODUCTS = {
  PRO_MONTHLY: 'price_monthly', // Replace with your actual price ID
  PRO_YEARLY: 'price_yearly',   // Replace with your actual price ID
} as const;

export type StripeProductType = keyof typeof STRIPE_PRODUCTS; 