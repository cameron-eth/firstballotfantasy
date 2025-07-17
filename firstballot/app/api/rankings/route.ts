import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('dynasty_sf_top_150')
      .select('*')
      .order('RK', { ascending: true });

    if (error) {
      throw error;
    }

    // Transform data to create a player lookup map
    const playerRankings = data.reduce((acc: any, player: any) => {
      const playerName = player['PLAYER NAME'];
      if (playerName) {
        acc[playerName] = {
          rank: player.RK,
          position: player.POS,
          team: player.TEAM,
          name: playerName,
        };
      }
      return acc;
    }, {});

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rankings' },
      { status: 500 }
    );
  }
} 