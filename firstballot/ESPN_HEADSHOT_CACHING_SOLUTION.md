# ESPN Headshot Caching Solution

## Problem Statement

The original ESPN headshot system had issues where player headshots would be mapped incorrectly when switching between teams/leagues. This happened because:

1. **Inconsistent Player Data Structures**: Different data sources (Sleeper API, database, etc.) had varying player object structures
2. **No Centralized Caching**: ESPN ID resolution was happening at the component level without proper caching
3. **Race Conditions**: Multiple components could resolve the same player differently
4. **No Error Recovery**: Once a mapping was incorrect, it would persist

## Solution Overview

### 1. Centralized ESPN ID Cache

**Location**: `lib/player-utils.ts`

```typescript
// Centralized ESPN ID cache to prevent incorrect mappings
const espnIdCache = new Map<string, string>();
```

**Key Features**:
- **Persistent Cache**: Once an ESPN ID is resolved, it's cached for the session
- **Unique Cache Keys**: Uses normalized player data to create unique keys
- **Team/Position Validation**: Includes team and position in cache key for accuracy

### 2. Improved Player Data Normalization

**Normalization Function**:
```typescript
function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize spaces
    .replace(/\./g, '');     // Remove dots (for initials)
}
```

**Cache Key Generation**:
```typescript
function createPlayerCacheKey(player: any): string {
  const name = player.playerName || `${player.first_name} ${player.last_name}`;
  const team = player.team || player.recent_team || '';
  const position = player.position || '';
  
  return `${normalizePlayerName(name)}|${team.toLowerCase()}|${position.toLowerCase()}`;
}
```

### 3. Enhanced ESPN ID Resolution

**Improved Matching Logic**:
1. **Exact Match**: Normalized full name comparison
2. **Partial Match**: Substring matching for name variations
3. **Component Match**: First/last name separate matching
4. **Team Validation**: Uses team as secondary validator for disambiguation

**Caching Integration**:
```typescript
export function getEspnId(player: any, espnPlayersData: any[]): string | undefined {
  // Check cache first
  const cacheKey = createPlayerCacheKey(player);
  if (espnIdCache.has(cacheKey)) {
    return espnIdCache.get(cacheKey);
  }

  // ... resolution logic ...

  // Cache the result
  const result = matches[0]?.id;
  if (result) {
    espnIdCache.set(cacheKey, result);
  }
  return result;
}
```

### 4. Stable Player Objects

**PlayerHeadshot Component Improvements**:
```typescript
// Create a stable player object for ESPN ID resolution
const stablePlayer = useMemo(() => {
  if (!player) return null;
  
  return {
    playerName: player.playerName || `${player.first_name} ${player.last_name}`,
    first_name: player.first_name,
    last_name: player.last_name,
    team: player.team || player.recent_team,
    position: player.position,
    espn_id: player.espn_id
  };
}, [player]);
```

**Benefits**:
- **Consistent Data Structure**: Normalizes player data across different sources
- **Memoized Resolution**: Prevents unnecessary re-resolution
- **Error Recovery**: Resets when player data changes

### 5. Debug Tools

**Debug API Endpoint**: `/api/debug-espn-id`
- POST: Debug specific player ESPN ID resolution
- GET: Get cache statistics

**Debug Component**: `components/espn-id-debugger.tsx`
- Interactive tool for testing ESPN ID resolution
- Cache management (view stats, clear cache)
- Detailed match analysis

**Debug Page**: `/debug-espn`
- Complete testing environment
- Sample player headshots
- Debug interface

## Usage Examples

### Basic Usage
```typescript
import { getEspnId, loadEspnPlayersData } from '@/lib/player-utils'

const espnPlayersData = await loadEspnPlayersData()
const espnId = getEspnId(player, espnPlayersData)
```

### Component Usage
```typescript
<PlayerHeadshot
  playerName="Josh Allen"
  teamLogo="BUF"
  size={64}
  player={{
    playerName: "Josh Allen",
    first_name: "Josh",
    last_name: "Allen",
    team: "BUF",
    position: "QB"
  }}
/>
```

### Debug Usage
```typescript
import { debugEspnIdResolution } from '@/lib/player-utils'

const debugInfo = debugEspnIdResolution(player, espnPlayersData)
console.log('Debug info:', debugInfo)
```

## Cache Management

### View Cache Statistics
```typescript
import { getEspnIdCacheStats } from '@/lib/player-utils'

const stats = getEspnIdCacheStats()
console.log('Cache size:', stats.size)
console.log('Cache keys:', stats.keys)
```

### Clear Cache
```typescript
import { clearEspnIdCache } from '@/lib/player-utils'

clearEspnIdCache() // Useful for testing or when data changes
```

## Benefits

### 1. **Consistent Mappings**
- Once a player is resolved, the same ESPN ID is used consistently
- No more incorrect headshots when switching teams/leagues

### 2. **Performance Improvements**
- Cached resolutions are instant
- Reduced API calls to ESPN data
- Faster component rendering

### 3. **Better Error Handling**
- Graceful fallbacks when ESPN ID resolution fails
- Team logo fallback for missing headshots
- Player initials as final fallback

### 4. **Debugging Capabilities**
- Complete visibility into ESPN ID resolution process
- Cache statistics and management
- Interactive testing tools

### 5. **Data Source Flexibility**
- Works with different player data structures
- Handles variations in team names and positions
- Supports both Sleeper API and database data

## Testing

### Manual Testing
1. Navigate to `/debug-espn`
2. Use the debugger to test different player configurations
3. Switch between teams/leagues to verify consistent mappings
4. Clear cache and retest to ensure proper resolution

### Automated Testing
```typescript
// Test cache functionality
const player1 = { playerName: "Josh Allen", team: "BUF", position: "QB" }
const player2 = { playerName: "Josh Allen", team: "BUF", position: "QB" }

const espnId1 = getEspnId(player1, espnPlayersData)
const espnId2 = getEspnId(player2, espnPlayersData)

// Should be the same due to caching
console.assert(espnId1 === espnId2, "Cache not working properly")
```

## Migration Guide

### For Existing Components
1. **No Changes Required**: Existing `PlayerHeadshot` usage continues to work
2. **Automatic Improvement**: Benefits from improved caching automatically
3. **Optional Enhancement**: Can pass more detailed player objects for better resolution

### For New Components
1. **Use Stable Player Objects**: Create normalized player objects
2. **Leverage Caching**: Let the system handle ESPN ID resolution
3. **Add Debug Capabilities**: Use debug tools for troubleshooting

## Future Enhancements

### 1. **Persistent Cache**
- Store cache in localStorage for cross-session persistence
- Implement cache expiration and refresh strategies

### 2. **Batch Resolution**
- Resolve multiple players at once for better performance
- Implement background resolution for large player lists

### 3. **Advanced Matching**
- Machine learning for better name matching
- Handle edge cases like Jr., Sr., III, etc.

### 4. **Real-time Updates**
- WebSocket integration for live ESPN data updates
- Automatic cache invalidation when data changes

## Troubleshooting

### Common Issues

1. **Cache Not Working**
   - Check if `clearEspnIdCache()` was called
   - Verify player data structure is consistent
   - Use debug tools to inspect cache state

2. **Incorrect Mappings**
   - Use debugger to see resolution process
   - Check for name variations or team changes
   - Verify ESPN data is up to date

3. **Performance Issues**
   - Monitor cache statistics
   - Check for memory leaks in cache
   - Consider implementing cache size limits

### Debug Commands
```typescript
// Get cache statistics
const stats = getEspnIdCacheStats()

// Debug specific player
const debugInfo = debugEspnIdResolution(player, espnPlayersData)

// Clear cache
clearEspnIdCache()
```

This solution provides a robust, performant, and debuggable system for ESPN headshot resolution that eliminates the mapping issues when switching teams/leagues. 