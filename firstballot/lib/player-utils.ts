// ESPN Players data - loaded once for performance
let espnPlayersData: any[] | null = null;

// Load ESPN players data from JSON file
export async function loadEspnPlayersData(): Promise<any[]> {
  if (espnPlayersData) {
    return espnPlayersData;
  }

  try {
    const response = await fetch('/espn_all_active_nfl_players.json');
    if (!response.ok) {
      console.warn('Failed to load ESPN players data');
      return [];
    }
    
    const data = await response.json();
    espnPlayersData = data.athletes || [];
    return espnPlayersData;
  } catch (error) {
    console.error('Error loading ESPN players data:', error);
    return [];
  }
}

// Get ESPN ID for a player, with fallback to JSON lookup
export function getEspnId(player: any, espnPlayersData: any[]): string | undefined {
  // If player already has espn_id, use it
  if (player.espn_id) {
    return player.espn_id;
  }

  // If no player name, can't lookup
  if (!player.playerName && !player.first_name) {
    return undefined;
  }

  // Filter to only active players
  const activePlayers = espnPlayersData.filter(p => p.active !== false);

  // Try to find match in ESPN data
  const playerName = player.playerName || `${player.first_name} ${player.last_name}`;
  
  // Try exact match first
  let matches = activePlayers.filter(p => 
    p.fullName?.toLowerCase() === playerName.toLowerCase()
  );

  // If no exact match, try partial match
  if (matches.length === 0) {
    matches = activePlayers.filter(p => {
      const espnName = p.fullName?.toLowerCase();
      const searchName = playerName.toLowerCase();
      return espnName?.includes(searchName) || searchName.includes(espnName);
    });
  }

  // If still no match, try first and last name separately
  if (matches.length === 0 && player.first_name && player.last_name) {
    matches = activePlayers.filter(p => 
      p.firstName?.toLowerCase() === player.first_name.toLowerCase() &&
      p.lastName?.toLowerCase() === player.last_name.toLowerCase()
    );
  }

  // If multiple matches, use team as a secondary validator
  if (matches.length > 1 && player.team) {
    // TODO: Adjust 'teamAbbrev' to the correct key if needed
    const teamKey = 'teamAbbrev'; // <-- change this if you find the correct key
    const teamMatches = matches.filter(p => {
      // Try to match team abbreviation or name (case-insensitive)
      return (
        (p[teamKey]?.toLowerCase && player.team?.toLowerCase && p[teamKey]?.toLowerCase() === player.team?.toLowerCase()) ||
        (p.team?.toLowerCase && player.team?.toLowerCase && p.team?.toLowerCase() === player.team?.toLowerCase())
      );
    });
    if (teamMatches.length > 0) {
      return teamMatches[0].id;
    }
  }

  // Return the first match if any
  return matches[0]?.id;
}

// Get player headshot URL with fallback
export function getPlayerHeadshotUrl(player: any, espnPlayersData: any[]): string | undefined {
  const espnId = getEspnId(player, espnPlayersData);
  if (espnId) {
    return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;
  }
  return undefined;
} 