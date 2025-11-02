import { loadStripe } from '@stripe/stripe-js'

if (!process.env.NEXT_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('NEXT_STRIPE_PUBLISHABLE_KEY is not set in environment variables')
}

export const stripePromise = loadStripe(process.env.NEXT_STRIPE_PUBLISHABLE_KEY)

export const getStripe = () => stripePromise
