# ESPN Player ID Sync Plan

## Overview
This document outlines the process to sync ESPN player IDs from `espn_all_active_nfl_players.json` to the master player database in Supabase, ensuring all players have correct headshot URLs.

## Data Sources

### 1. ESPN JSON File (`public/espn_all_active_nfl_players.json`)
```json
{
  "id": "11911",
  "firstName": "Jamar",
  "lastName": "Adams", 
  "fullName": "Jamar Adams",
  "displayName": "Jamar Adams",
  "shortName": "J. Adams",
  "weight": 215.0,
  "height": 74.0,
  "age": 39,
  "dateOfBirth": "1985-11-29T08:00Z",
  "active": false
}
```

**Key Fields:**
- `id`: ESPN player ID (primary target)
- `fullName`: Full player name
- `firstName`, `lastName`: Individual name parts
- `active`: Whether player is currently active

### 2. Master Player Database (`master_player_dataset` table)
```json
{
  "player_name": "A.Abdullah",
  "player_name_std": "ameer abdullah",
  "position": "RB",
  "recent_team": "CAR",
  "season": 2021,
  "fantasy_ppg": 8.18,
  "games_played": 10
}
```

**Key Fields:**
- `player_name_std`: Standardized player name (best for matching)
- `player_name`: Original player name
- `position`: Player position
- `recent_team`: Current team
- `season`: Season year

## Matching Strategy

### Priority Order:
1. **Direct Name Match**: `player_name_std` (lowercase, trimmed) == ESPN `fullName` (lowercase, trimmed)
2. **First Initial + Last Name**: "A.Abdullah" matches "Ameer Abdullah"
3. **Fuzzy Match**: Levenshtein distance < 3 with position/team validation
4. **Manual Review**: Flag for human review

### Name Normalization:
```javascript
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ');   // Normalize spaces
}
```

## Implementation Steps

### Step 1: Database Schema Update
Add `espn_id` column to `master_player_dataset` table:
```sql
ALTER TABLE master_player_dataset 
ADD COLUMN espn_id VARCHAR(20);

-- Add index for performance
CREATE INDEX idx_master_player_espn_id ON master_player_dataset(espn_id);
```

### Step 2: Load and Process Data
```javascript
// Load ESPN data
const espnPlayers = require('./espn_all_active_nfl_players.json');

// Load master player data from Supabase
const { data: masterPlayers } = await supabase
  .from('master_player_dataset')
  .select('*');

// Process each master player
for (const masterPlayer of masterPlayers) {
  const espnMatch = findEspnMatch(masterPlayer, espnPlayers);
  if (espnMatch) {
    await updatePlayerEspnId(masterPlayer.id, espnMatch.id);
  }
}
```

### Step 3: Matching Function
```javascript
function findEspnMatch(masterPlayer, espnPlayers) {
  const stdName = normalizeName(masterPlayer.player_name_std);
  
  // Direct match
  let match = espnPlayers.find(espn => 
    normalizeName(espn.fullName) === stdName
  );
  
  if (match) return match;
  
  // First initial + last name match
  const [first, ...lastParts] = masterPlayer.player_name.split('.');
  if (first && lastParts.length > 0) {
    const lastName = lastParts.join(' ').trim();
    match = espnPlayers.find(espn => 
      espn.lastName.toLowerCase() === lastName.toLowerCase() &&
      espn.firstName.toLowerCase().startsWith(first.toLowerCase())
    );
  }
  
  if (match) return match;
  
  // Fuzzy match with position validation
  match = espnPlayers.find(espn => {
    const distance = levenshteinDistance(stdName, normalizeName(espn.fullName));
    return distance <= 2 && espn.position === masterPlayer.position;
  });
  
  return match;
}
```

### Step 4: Database Update
```javascript
async function updatePlayerEspnId(playerId, espnId) {
  const { error } = await supabase
    .from('master_player_dataset')
    .update({ espn_id: espnId })
    .eq('id', playerId);
    
  if (error) {
    console.error(`Failed to update player ${playerId}:`, error);
  }
}
```

## Supabase Environment Details

### Table: `master_player_dataset`
- **Primary Key**: `id` (auto-increment)
- **Key Fields**: 
  - `player_name_std` (VARCHAR) - Standardized name for matching
  - `position` (VARCHAR) - Player position
  - `recent_team` (VARCHAR) - Current team
  - `season` (INTEGER) - Season year
  - `espn_id` (VARCHAR) - ESPN player ID (to be added)

### Update Strategy:
1. **Bulk Update**: Use Supabase's bulk update capabilities
2. **Batch Processing**: Process in batches of 1000 to avoid timeouts
3. **Error Handling**: Log failed updates for manual review

## Quality Assurance

### Validation Checks:
1. **Active Players**: Ensure active players have ESPN IDs
2. **Position Match**: Verify ESPN position matches database position
3. **Team Consistency**: Check team matches where possible
4. **Manual Review**: Flag players with multiple potential matches

### Success Metrics:
- Percentage of players with ESPN IDs
- Number of manual review cases
- Validation of headshot URLs after update

## Ongoing Maintenance

### Regular Updates:
1. **Weekly Sync**: Run sync process weekly with updated ESPN JSON
2. **New Players**: Automatically assign ESPN IDs for new players
3. **Manual Review**: Process flagged cases monthly

### Monitoring:
- Track sync success rates
- Monitor headshot URL availability
- Log and review failed matches

## Error Handling

### Common Issues:
1. **Name Variations**: Handle different name formats
2. **Team Changes**: Account for players changing teams
3. **Retired Players**: Handle inactive/retired players
4. **Duplicate Names**: Resolve conflicts with position/team validation

### Fallback Strategy:
- Use team logo if no ESPN ID available
- Show player initials as final fallback
- Log all unmatched players for manual review

## Implementation Checklist

- [ ] Add `espn_id` column to database
- [ ] Create matching algorithm
- [ ] Implement bulk update process
- [ ] Add error handling and logging
- [ ] Test with sample data
- [ ] Run full sync
- [ ] Validate results
- [ ] Set up ongoing maintenance process

## Notes for Agent

1. **Start Small**: Test with a subset of players first
2. **Backup Data**: Always backup before bulk updates
3. **Monitor Performance**: Watch for timeouts with large datasets
4. **Document Results**: Keep track of success rates and issues
5. **Iterate**: Refine matching algorithm based on results

This plan ensures robust, maintainable ESPN ID synchronization while preserving data integrity and providing fallbacks for unmatched players. 