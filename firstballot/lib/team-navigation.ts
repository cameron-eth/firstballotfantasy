/** Keep activation, billing and deep links on the same explicit team destination. */
export function teamWorkspaceUrl(leagueId: string, desktop = true) {
  return `/league-buddy?tab=${desktop ? 'builder' : 'roster'}&leagueId=${encodeURIComponent(leagueId)}`
}
export function accountTeamCache(key: unknown, accountId: string) {
  return (
    Array.isArray(key) &&
    ['teams', 'active-teams', 'api-teams'].includes(key[0]) &&
    key[1] === accountId
  )
}
