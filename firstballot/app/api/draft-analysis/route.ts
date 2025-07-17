import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');
    
    if (!draftId) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 });
    }

    // Fetch draft data
    const draftResponse = await fetch(`https://api.sleeper.app/v1/draft/${draftId}`);
    if (!draftResponse.ok) {
      throw new Error('Failed to fetch draft data');
    }
    const draft = await draftResponse.json();

    // Fetch picks
    const picksResponse = await fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`);
    if (!picksResponse.ok) {
      throw new Error('Failed to fetch picks data');
    }
    const picks = await picksResponse.json();

    // Fetch traded picks
    const tradedPicksResponse = await fetch(`https://api.sleeper.app/v1/draft/${draftId}/traded_picks`);
    if (!tradedPicksResponse.ok) {
      throw new Error('Failed to fetch traded picks data');
    }
    const tradedPicks = await tradedPicksResponse.json();

    // Fetch league rosters and users to get team names
    const [rostersResponse, usersResponse] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${draft.league_id}/rosters`),
      fetch(`https://api.sleeper.app/v1/league/${draft.league_id}/users`)
    ]);
    
    if (!rostersResponse.ok) {
      throw new Error('Failed to fetch league rosters');
    }
    if (!usersResponse.ok) {
      throw new Error('Failed to fetch league users');
    }
    
    const rosters = await rostersResponse.json();
    const users = await usersResponse.json();

    // Fetch rankings for grading
    const { data: rankingsData, error: rankingsError } = await supabaseServer
      .from('dynasty_sf_top_150')
      .select('*')
      .order('RK', { ascending: true });

    if (rankingsError) {
      throw rankingsError;
    }

    // Create player rankings lookup and tier mapping
    const playerRankings = rankingsData.reduce((acc: any, player: any) => {
      const playerName = player['PLAYER NAME'];
      if (playerName) {
        // Determine tier based on rank
        let tier = 4; // Default tier
        if (player.RK <= 12) tier = 1;
        else if (player.RK <= 24) tier = 2;
        else if (player.RK <= 48) tier = 3;
        
        acc[playerName] = {
          rank: player.RK,
          position: player.POS,
          team: player.TEAM,
          name: playerName,
          tier: tier,
        };
      }
      return acc;
    }, {});

    // Build pick ownership map
    const pickOwnership: { [round: number]: { [slot: number]: number } } = {};
    
    // Initialize with default ownership
    for (let round = 1; round <= draft.settings.rounds; round++) {
      pickOwnership[round] = {};
      for (let slot = 1; slot <= draft.settings.teams; slot++) {
        pickOwnership[round][slot] = draft.slot_to_roster_id[slot];
      }
    }

    // Apply traded picks
    for (const trade of tradedPicks) {
      // Find the draft slot that originally belonged to the previous owner
      const originalSlot = Object.keys(draft.slot_to_roster_id).find(
        slot => draft.slot_to_roster_id[slot] === trade.previous_owner_id
      );
      
      if (originalSlot && pickOwnership[trade.round]) {
        pickOwnership[trade.round][parseInt(originalSlot)] = trade.owner_id;
      }
    }

    // Assign picks to teams
    const teamPicks: { [rosterId: number]: any[] } = {};
    
    for (const pick of picks) {
      const round = pick.round;
      const slot = pick.draft_slot;
      const rosterId = pickOwnership[round]?.[slot] || pick.roster_id;
      
      if (!teamPicks[rosterId]) {
        teamPicks[rosterId] = [];
      }
      teamPicks[rosterId].push(pick);
    }

    // Fetch all players for age lookup
    const playersResponse = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!playersResponse.ok) {
      throw new Error('Failed to fetch player data');
    }
    const allPlayers = await playersResponse.json();

    // Grade each team's draft with enhanced logic
    const teamGrades = [];
    
    for (const [rosterId, picks] of Object.entries(teamPicks)) {
      let totalValue = 0;
      let totalRank = 0;
      let rankedPicks = 0;
      let steals = 0;
      let reaches = 0;
      let tier1Picks = 0;
      let tier2Picks = 0;
      let tier3Picks = 0;
      let tier4Picks = 0;
      let totalAge = 0;
      let ageCount = 0;

      // Calculate value based on rankings and analyze reach/steal
      for (const pick of picks) {
        const playerName = `${pick.metadata?.first_name} ${pick.metadata?.last_name}`;
        const ranking = playerRankings[playerName];
        const playerData = allPlayers[pick.player_id];
        if (playerData && playerData.age) {
          totalAge += Number(playerData.age);
          ageCount++;
        }
        if (ranking) {
          const pickDiff = pick.pick_no - ranking.rank;
          if (pickDiff >= 10) steals++;
          else if (pickDiff <= -10) reaches++;
          if (ranking.tier === 1) tier1Picks++;
          else if (ranking.tier === 2) tier2Picks++;
          else if (ranking.tier === 3) tier3Picks++;
          else tier4Picks++;
          let pickValue = 151 - ranking.rank;
          if (ranking.tier <= 2) {
            pickValue *= 1.5;
          }
          totalValue += pickValue;
          totalRank += ranking.rank;
          rankedPicks++;
        }
      }
      const averageRank = rankedPicks > 0 ? totalRank / rankedPicks : 0;
      const averageValue = rankedPicks > 0 ? totalValue / rankedPicks : 0;
      const stealRatio = rankedPicks > 0 ? steals / rankedPicks : 0;
      const reachRatio = rankedPicks > 0 ? reaches / rankedPicks : 0;
      const averageAge = ageCount > 0 ? totalAge / ageCount : 0;

      // Enhanced grading based on multiple factors
      let grade = 'C';
      let gradeScore = 0;
      if (averageRank <= 30) gradeScore += 40;
      else if (averageRank <= 50) gradeScore += 35;
      else if (averageRank <= 70) gradeScore += 25;
      else if (averageRank <= 90) gradeScore += 15;
      else gradeScore += 5;
      if (stealRatio >= 0.4) gradeScore += 25;
      else if (stealRatio >= 0.3) gradeScore += 20;
      else if (stealRatio >= 0.2) gradeScore += 15;
      else if (stealRatio >= 0.1) gradeScore += 10;
      else gradeScore += 5;
      if (reachRatio <= 0.1) gradeScore += 15;
      else if (reachRatio <= 0.2) gradeScore += 10;
      else if (reachRatio <= 0.3) gradeScore += 5;
      else gradeScore += 0;
      const topTierRatio = (tier1Picks + tier2Picks) / rankedPicks;
      if (topTierRatio >= 0.6) gradeScore += 20;
      else if (topTierRatio >= 0.4) gradeScore += 15;
      else if (topTierRatio >= 0.2) gradeScore += 10;
      else gradeScore += 5;
      // Age penalty: -2 points for every year over 26
      if (averageAge > 26) {
        gradeScore -= Math.round((averageAge - 26) * 2);
      }
      // Stricter curve for letter grades
      if (gradeScore >= 92) grade = 'A+';
      else if (gradeScore >= 85) grade = 'A';
      else if (gradeScore >= 78) grade = 'A-';
      else if (gradeScore >= 70) grade = 'B+';
      else if (gradeScore >= 62) grade = 'B';
      else if (gradeScore >= 54) grade = 'B-';
      else if (gradeScore >= 46) grade = 'C+';
      else if (gradeScore >= 38) grade = 'C';
      else if (gradeScore >= 30) grade = 'C-';
      else grade = 'D';

      // Find team name from rosters and users
      const roster = rosters.find((r: any) => r.roster_id === parseInt(rosterId));
      const user = users.find((u: any) => u.user_id === roster?.owner_id);
      const teamName = user?.metadata?.team_name || user?.display_name || `Team ${rosterId}`;

      const teamGrade = {
        rosterId: parseInt(rosterId),
        teamName: teamName,
        picks: picks,
        totalPicks: picks.length,
        rankedPicks: rankedPicks,
        averageRank: Math.round(averageRank),
        totalValue: Math.round(totalValue),
        averageValue: Math.round(averageValue),
        steals: steals,
        reaches: reaches,
        stealRatio: Math.round(stealRatio * 100),
        reachRatio: Math.round(reachRatio * 100),
        gradeScore: Math.round(gradeScore),
        averageAge: Math.round(averageAge * 10) / 10,
        tierBreakdown: {
          tier1: tier1Picks,
          tier2: tier2Picks,
          tier3: tier3Picks,
          tier4: tier4Picks,
        },
        positions: {
          QB: picks.filter((p: any) => p.metadata?.position === 'QB').length,
          RB: picks.filter((p: any) => p.metadata?.position === 'RB').length,
          WR: picks.filter((p: any) => p.metadata?.position === 'WR').length,
          TE: picks.filter((p: any) => p.metadata?.position === 'TE').length,
          K: picks.filter((p: any) => p.metadata?.position === 'K').length,
          DEF: picks.filter((p: any) => p.metadata?.position === 'DEF').length,
        },
        grade: grade,
      };
      
      teamGrades.push(teamGrade);
    }

    return NextResponse.json({
      draft,
      picks,
      tradedPicks,
      rosters,
      users,
      pickOwnership,
      teamPicks,
      teamGrades,
      playerRankings,
      debug: {
        totalPicks: picks.length,
        totalTradedPicks: tradedPicks.length,
        teams: draft.settings.teams,
        rounds: draft.settings.rounds,
        slotToRosterId: draft.slot_to_roster_id,
      }
    });

  } catch (error) {
    console.error('Error analyzing draft:', error);
    return NextResponse.json(
      { error: 'Failed to analyze draft' },
      { status: 500 }
    );
  }
} 