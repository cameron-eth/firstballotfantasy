export const TOUR_VERSION = 'team-map-v1'
export const tourStorageKey = (accountId: string) => `firstballot:tour:${TOUR_VERSION}:${accountId}`
export function hasSeenTour(metadata: Record<string, unknown> | undefined, local: string | null) {
  return metadata?.product_tour_version === TOUR_VERSION || local === TOUR_VERSION
}
export function tourSteps(desktop: boolean, dynasty: boolean) {
  return [
    {
      title: 'Your next move starts here.',
      body: 'First Ballot now brings your roster, player trends, standings and community rankings together. Connect your Sleeper username and activate one team free. No card or authorization token needed.',
      hint: 'Already connected? Your teams, boards and saved plans are still yours.',
    },
    {
      title: desktop ? 'Read your team at a glance.' : 'Your team, wherever you are.',
      body: desktop
        ? 'The map follows your league’s starting slots. Each starter appears once; backups live in shared position stacks. Cycle through cards to inspect your depth. FPPG shows current-season production, alongside dynasty value when available.'
        : 'Use My Team for player production and projections, and Standings for your league race. Open First Ballot in a desktop browser for the full Team Builder map.',
      hint: desktop
        ? 'Pinch to zoom. Use + / − to adjust or click the percentage to reset.'
        : 'The planning canvas is available on desktop browsers only.',
    },
    dynasty
      ? {
          title: 'Build beyond this season.',
          body: 'On desktop, choose Now or a future year. Add prospects from your draft board to see when they could join your team. The picks rail helps you compare the capital you own with the cost of your targets.',
          hint: 'Pick slots use projected MaxPF. Draft cost is an estimate, not a promise that a player will be available.',
        }
      : {
          title: 'Plan this season’s next move.',
          body: 'Review your starters and depth, compare weekly projections, and explore trade targets. Redraft teams focus on the current season; college scouting is for dynasty planning.',
          hint: 'Projections are estimates. Check availability and league scoring before making a change.',
        },
    {
      title: 'Explore first. Commit when ready.',
      body: 'Show trade targets opens suggested player cards beside your plan. Review the full offer before confirming a send. Planning changes stay separate from your live Sleeper roster.',
      hint: 'Use Plans → Save plans to keep your scenario. Sending trades or updating lineups requires a saved Sleeper authorization in Settings.',
    },
  ]
}
