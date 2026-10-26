'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import type { CardProspect } from '@/components/landing/ProspectTradingCard'
import { usePathname, useRouter } from 'next/navigation'
import { Layers } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useLeagueContext } from '@/lib/league-context'
import { useDesktopBuilder } from '@/hooks/use-desktop-builder'
import { TourDialog } from './TourDialog'
import { MapWalkthrough } from './MapWalkthrough'
import { TOUR_VERSION, hasSeenTour, tourStorageKey } from '@/lib/onboarding'

const TourContext = createContext({ replay: () => {}, suppressBallot: true })
export const useProductTour = () => useContext(TourContext)

/** A single prompt owner prevents the release tour and daily ballot stacking. */
export function ProductTourProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { selectedLeague, selectedLeagueId, isLoading } = useLeagueContext()
  const desktop = useDesktopBuilder()
  const path = usePathname()
  const router = useRouter()
  const [scope, setScope] = useState('')
  const [seen, setSeen] = useState(false)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [shownThisSession, setShownThisSession] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
  const excluded = ['/login', '/billing', '/oauth', '/settings'].some((p) => path.startsWith(p))
  useEffect(() => {
    if (!user || scope === user.id) return
    let local: string | null = null
    try {
      local = localStorage.getItem(tourStorageKey(user.id))
    } catch {}
    setSeen(hasSeenTour(user.user_metadata, local))
    setScope(user.id)
    setOpen(false)
    setShownThisSession(false)
    setStep(0)
  }, [user, scope])
  useEffect(() => {
    if (loading || isLoading || !user || scope !== user.id || seen || excluded) return
    setOpen(true)
    setShownThisSession(true)
  }, [loading, isLoading, user, scope, seen, excluded])
  const guided = desktop && !!selectedLeague
  const { data: prospects } = useSWR<CardProspect[]>(
    open && !guided ? '/api/prospects?draft_year=all' : null,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Preview unavailable')
      return response.json()
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )
  useEffect(() => {
    if (!open || !guided) return
    router.push(`/league-buddy?tab=builder&leagueId=${encodeURIComponent(selectedLeagueId ?? '')}`)
  }, [open, guided, selectedLeagueId, router])
  const prospect = prospects?.find((p) => p.name === 'Jeremiah Smith')
  const dynasty = !selectedLeague || selectedLeague.settings?.type === 2
  function replay() {
    setStep(0)
    setOpen(true)
    setShownThisSession(true)
  }
  async function dismiss() {
    setOpen(false)
    setSeen(true)
    if (!user) return
    try {
      localStorage.setItem(tourStorageKey(user.id), TOUR_VERSION)
    } catch {}
    // Presentation preference only; never used for authorization or entitlements.
    try {
      const { error } = await supabase.auth.updateUser({
        data: { product_tour_version: TOUR_VERSION },
      })
      if (error) throw error
      setSaveNotice('')
    } catch {
      setSaveNotice('Tour dismissed here. Account sync failed; you may see it on another device.')
    }
  }
  const suppressBallot =
    loading || (!!user && scope !== user.id) || (!seen && !excluded) || open || shownThisSession
  return (
    <TourContext.Provider value={{ replay, suppressBallot }}>
      {children}
      {saveNotice && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-40 max-w-sm rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-slate-300"
        >
          {saveNotice}
          <button className="ml-3 underline" onClick={() => setSaveNotice('')}>
            Dismiss
          </button>
        </div>
      )}
      {open && !!user && guided ? (
        <MapWalkthrough dynasty={dynasty} onDismiss={() => void dismiss()} />
      ) : (
        <TourDialog
          open={open && !!user}
          step={step}
          setStep={setStep}
          desktop={desktop}
          dynasty={dynasty}
          returning={!!selectedLeague}
          prospect={prospect}
          onDismiss={() => void dismiss()}
          onFinish={() =>
            router.push(
              `/league-buddy?tab=${desktop ? 'builder' : 'roster'}${selectedLeagueId ? `&leagueId=${encodeURIComponent(selectedLeagueId)}` : ''}`
            )
          }
        />
      )}
    </TourContext.Provider>
  )
}
export function TourReplayButton({ label = 'Replay welcome tour' }: { label?: string }) {
  const { replay } = useProductTour()
  const { user } = useAuth()
  if (!user) return null
  return (
    <button
      onClick={replay}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-blue-200 hover:bg-slate-800"
    >
      <Layers size={14} />
      {label}
    </button>
  )
}
