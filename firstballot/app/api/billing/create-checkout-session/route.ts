import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionService } from '@/lib/subscription-service'
import { STRIPE_PRODUCTS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { authId, priceId } = await req.json()

    if (!authId || !priceId) {
      return NextResponse.json({ error: 'Auth ID and price ID are required' }, { status: 400 })
    }

    // Validate price ID
    const validPriceIds = Object.values(STRIPE_PRODUCTS)
    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
    }

    const session = await SubscriptionService.createCheckoutSession(authId, priceId)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
