import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'

export interface MembershipStatus {
  isMember: boolean
  loading: boolean
  error: string | null
}

export function useMembership(): MembershipStatus {
  const { user } = useAuth()
  const [isMember, setIsMember] = useState(true) // Always true - bypassing checks
  const [loading, setLoading] = useState(false) // No loading needed
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TEMPORARILY BYPASSING MEMBERSHIP CHECKS - ALL USERS ARE TREATED AS MEMBERS
    setIsMember(true)
    setLoading(false)
    setError(null)

    /* ORIGINAL CODE - COMMENTED OUT FOR BYPASS
    if (!user) {
      setIsMember(false);
      setLoading(false);
      return;
    }

    const checkMembership = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/membership?email=${encodeURIComponent(user.email)}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch membership status: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        setIsMember(data.isMember || false);
      } catch (err) {
        console.error('Error checking membership status:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsMember(false);
      } finally {
        setLoading(false);
      }
    };

    checkMembership();
    */
  }, [user])

  return { isMember, loading, error }
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
