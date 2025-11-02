import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionService } from '@/lib/subscription-service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const authId = searchParams.get('authId')

    if (!authId) {
      return NextResponse.json({ error: 'Auth ID is required' }, { status: 400 })
    }

    const subscription = await SubscriptionService.getSubscription(authId)

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }
}
