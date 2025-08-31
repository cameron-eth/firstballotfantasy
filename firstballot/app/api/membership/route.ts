import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Decode the email (convert %40 back to @)
    const decodedEmail = decodeURIComponent(email);

    // Use the secure function to check membership status
    const { data, error } = await supabaseServer
      .rpc('check_membership_status', { user_email: decodedEmail });

    if (error) {
      return NextResponse.json({ isMember: false });
    }

    const isMember = data === true;
    
    return NextResponse.json({ isMember });
  } catch (error) {
    return NextResponse.json({ isMember: false });
  }
} 