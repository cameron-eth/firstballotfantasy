import type Stripe from 'stripe'
import { reconcileBilling } from '@/lib/platform/reconcile-billing'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-server'
import { failure, json } from '@/lib/platform/http'
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature'),
    secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) return json({ error: 'Webhook verification unavailable' }, 400)
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return json({ error: 'Invalid signature' }, 400)
  }
  try {
    const { data: processed, error: readError } = await supabaseAdmin
      .from('billing_events')
      .select('event_id')
      .eq('event_id', event.id)
      .maybeSingle()
    if (readError) throw readError
    if (processed) return json({ received: true })
    await reconcileBilling(
      event,
      getStripe(),
      {
        async findCustomer(id) {
          const { data, error } = await supabaseAdmin
            .from('account_billing')
            .select('account_id,stripe_subscription_id')
            .eq('stripe_customer_id', id)
            .maybeSingle()
          if (error) throw error
          return data
        },
        async apply(values) {
          const { error } = await supabaseAdmin.rpc('apply_platform_billing', values)
          if (error) throw error
        },
      },
      [process.env.STRIPE_TEAM_MONTHLY_PRICE_ID, process.env.STRIPE_TEAM_YEARLY_PRICE_ID].filter(
        (id): id is string => !!id
      )
    )
    return json({ received: true })
  } catch (e) {
    return failure(e)
  }
}
