import { useSubscription } from './use-subscription'
export function useMembership() {
  const { isSubscribed, loading, error } = useSubscription()
  return { isMember: isSubscribed, loading, error: error ?? null }
}
export function useMembershipCheck() {
  const { isMember, loading } = useMembership()
  return { isMember, loading }
}
