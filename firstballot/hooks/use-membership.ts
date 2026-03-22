export interface MembershipStatus {
  isMember: boolean
  loading: boolean
  error: string | null
}

export function useMembership(): MembershipStatus {
  // Membership checks are intentionally bypassed right now.
  return { isMember: true, loading: false, error: null }
}

export function useMembershipCheck(): {
  canAccessLeague: (leagueIndex: number) => boolean
  isMember: boolean
  loading: boolean
} {
  const { isMember, loading } = useMembership()

  const canAccessLeague = (leagueIndex: number): boolean => {
    // TEMPORARILY BYPASSING ACCESS CHECKS - ALL USERS CAN ACCESS ALL LEAGUES
    return true

    /* ORIGINAL CODE - COMMENTED OUT FOR BYPASS
    // Free users can only access the first league (index 0)
    // Members can access all leagues
    if (isMember) return true;
    if (leagueIndex === 0) return true;
    return false;
    */
  }

  return {
    canAccessLeague,
    isMember,
    loading,
  }
}
