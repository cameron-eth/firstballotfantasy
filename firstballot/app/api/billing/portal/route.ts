import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/subscription-service';

export async function POST(req: NextRequest) {
  try {
    const { authId } = await req.json();
    
    if (!authId) {
      return NextResponse.json(
        { error: 'Auth ID is required' }, 
        { status: 400 }
      );
    }
    
    const session = await SubscriptionService.createPortalSession(authId);
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' }, 
      { status: 500 }
    );
  }
} 