"use client"

import { useState, useEffect, Suspense, useCallback } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DraftBoardGrid } from "@/components/DraftBoardGrid"
import DraftAnalysis from "@/components/DraftAnalysis"
import { sleeperAPI, SleeperUser, SleeperLeague, SleeperDraft, SleeperPick, SleeperPlayer } from "@/lib/sleeper-api"
import { Users, Trophy, AlertCircle, Loader2, Info, BarChart3, Crown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from '@/lib/auth'
import { AuthGuard } from "@/components/auth-guard"
import { motion, AnimatePresence } from "framer-motion"
import { useMembershipCheck } from "@/hooks/use-membership"
import { LeagueCard } from "@/components/league-access-control"
import { UpgradePrompt } from "@/components/upgrade-prompt"
import { Spinner } from "@/components/ui/spinner"
import { useSearchParams } from "next/navigation"
import { cacheUtils } from "@/lib/cache-utils"

function DraftBuddyContent() {
  const { user: authUser } = useAuth()
  const { canAccessLeague, isMember, loading: membershipLoading } = useMembershipCheck()
  const searchParams = useSearchParams()
  const [username, setUsername] = useState("")
  const [user, setUser] = useState<SleeperUser | null>(null)
  const [leagues, setLeagues] = useState<SleeperLeague[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("")
  const [drafts, setDrafts] = useState<SleeperDraft[]>([])
  const [selectedDraft, setSelectedDraft] = useState<string>("")
  const [picks, setPicks] = useState<SleeperPick[]>([])
  const [players, setPlayers] = useState<Record<string, SleeperPlayer>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [profileChecked, setProfileChecked] = useState(false)
  const [noSleeperUsername, setNoSleeperUsername] = useState(false)

  // Use shared cache utility
  const { keys } = cacheUtils

  // Handle leagueId from URL params (similar to Trade Market pattern)
  useEffect(() => {
    const urlLeagueId = searchParams.get('leagueId')
    if (urlLeagueId) {
  
      setSelectedLeagueId(urlLeagueId)
      
      // If we have leagues loaded, check if this league exists
      if (leagues.length > 0) {
        const leagueExists = leagues.find(league => league.league_id === urlLeagueId)
        if (!leagueExists) {
  
        }
      }
    }
  }, [searchParams, leagues])

  // On mount, fetch the user settings for Sleeper username
  useEffect(() => {
    if (!authUser?.id) {

      return
    }

    const loadSettings = async () => {
      try {
        // Check cache first
        if (cacheUtils.isValid()) {
          const cachedUsername = cacheUtils.get(keys.SLEEPER_USERNAME)
          const cachedUser = cacheUtils.get(keys.SLEEPER_USER)
          const cachedLeagues = cacheUtils.get(keys.SLEEPER_LEAGUES)
          
          if (cachedUsername) {
    
            setUsername(cachedUsername)
            setNoSleeperUsername(false)
            
            if (cachedUser && cachedLeagues) {
      
              setUser(cachedUser)
              setLeagues(cachedLeagues)
              if (cachedLeagues.length === 1) {
                setSelectedLeagueId(cachedLeagues[0].league_id)
              }
            } else {
              // Auto-connect if username is cached but user/leagues aren't
              await connectUser()
            }
            setProfileChecked(true)
            return
          }
        }

        // If no cache or cache expired, fetch from API
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No valid session')
        }

        const response = await fetch('/api/settings', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        if (response.ok) {
          const data = await response.json()
          if (data.sleeper_username) {
            setUsername(data.sleeper_username)
            setNoSleeperUsername(false)
            
            // Cache the username
            cacheUtils.set(keys.SLEEPER_USERNAME, data.sleeper_username)
            cacheUtils.setExpiry()
            
            // Auto-connect if username is saved
            await connectUser()
          } else {
            setNoSleeperUsername(true)
          }
        }
        setProfileChecked(true)
      } catch (err) {
        console.error('Failed to load settings:', err)
        setProfileChecked(true)
        setNoSleeperUsername(true)
      }
    }

    loadSettings()
  }, [authUser?.id])

  // Connect user to Sleeper API
  const connectUser = useCallback(async () => {
    if (!username.trim()) {
      setError("Please enter a Sleeper username")
      return
    }
    try {
      setLoading(true)
      setError(null)
      setUser(null)
      setLeagues([])
      setSelectedLeagueId("")
      setDrafts([])
      setSelectedDraft("")
      setPicks([])
      setPlayers({})
      
      // Fetch user by username
      const userData = await sleeperAPI.getUser(username)
      
      // Validate user data
      if (!userData || !userData.user_id) {
        throw new Error("Invalid username or user not found")
      }
      
      setUser(userData)
      
      // Cache the user data
      cacheUtils.set(keys.SLEEPER_USER, userData)
      
      // Fetch leagues for user
      const leaguesData = await sleeperAPI.getUserLeagues(userData.user_id)
      setLeagues(leaguesData)
      
      // Cache the leagues data
      cacheUtils.set(keys.SLEEPER_LEAGUES, leaguesData)
      
      if (leaguesData.length === 1) {
        setSelectedLeagueId(leaguesData[0].league_id)
      }
      
      setLoading(false)
    } catch (err: any) {
      console.error('Connection error:', err)
      setError(err.message || "Failed to connect to Sleeper. Please check your username and try again.")
      setLoading(false)
      // Reset user state on error
      setUser(null)
      setLeagues([])
      setSelectedLeagueId("")
      setDrafts([])
      setSelectedDraft("")
      setPicks([])
      setPlayers({})
    }
  }, [username, keys.SLEEPER_USER, keys.SLEEPER_LEAGUES])

  // Fetch drafts for selected league
  useEffect(() => {
    const fetchDrafts = async () => {
      if (!selectedLeagueId) return
      setLoading(true)
      setDrafts([])
      setSelectedDraft("")
      setPicks([])
      setPlayers({})
      try {
        const drafts = await sleeperAPI.getLeagueDrafts(selectedLeagueId)
        setDrafts(drafts)
        if (drafts.length === 1) setSelectedDraft(drafts[0].draft_id)
      } catch (err) {
        setError("Failed to get drafts for the selected league.")
      } finally {
        setLoading(false)
      }
    }
    fetchDrafts()
  }, [selectedLeagueId])

  // Load draft data when draft changes
  useEffect(() => {
    const loadDraftData = async () => {
      if (!selectedDraft) return
      setLoading(true)
      setError(null)
      try {
        const [picksData, playersData] = await Promise.all([
          sleeperAPI.getDraftPicks(selectedDraft),
          sleeperAPI.getAllPlayers()
        ])
        setPicks(picksData)
        setPlayers(playersData)
        setLastRefresh(new Date())
      } catch (err) {
        setError("Failed to load draft data")
      } finally {
        setLoading(false)
      }
    }
    loadDraftData()
  }, [selectedDraft])

  const selectedDraftData = drafts.find(d => d.draft_id === selectedDraft)

  const getDraftStatusColor = (status: string) => {
    switch (status) {
      case 'pre_draft': return 'bg-blue-500'
      case 'in_progress': return 'bg-green-500'
      case 'complete': return 'bg-gray-500'
      default: return 'bg-yellow-500'
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
          <div className="space-y-6">
            {/* Page Header */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-yellow-400 font-mono flex items-center space-x-2">
                  <Trophy className="h-6 w-6" />
                  <span>DRAFT BUDDY</span>
                </CardTitle>
                <p className="text-gray-300 text-sm">
                  Comprehensive draft analysis, pick tracking, and player insights
                </p>
              </CardHeader>
            </Card>

          {/* Connection Section */}
          {!user && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">CONNECT SLEEPER</CardTitle>
                <p className="text-gray-300 text-sm">
                  Enter your Sleeper username to connect your account
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block">Sleeper Username</label>
                  <Input
                    placeholder="Enter Sleeper Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button 
                  onClick={connectUser}
                  disabled={loading}
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "CONNECT"
                  )}
                </Button>
                {error && (
                  <div className="flex items-center space-x-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* League Select */}
          {user && leagues.length > 0 && !selectedLeagueId && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                <CardTitle className="text-green-400 font-mono">SELECT LEAGUE</CardTitle>
                <p className="text-gray-300 text-sm">
                  Choose a league to view drafts
                </p>
                  </div>
                  {!isMember && leagues.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <Crown className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400 font-mono">FREE: 1 LEAGUE</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leagues.map((league, index) => (
                    <LeagueCard
                      key={league.league_id} 
                      league={league}
                      leagueIndex={index}
                      canAccess={canAccessLeague(index)}
                      isMember={isMember}
                      isSelected={selectedLeagueId === league.league_id}
                      onClick={() => setSelectedLeagueId(league.league_id)}
                    />
                  ))}
                      </div>
                      
                {/* Upgrade Prompt for Free Users with Multiple Leagues */}
                {!isMember && leagues.length > 1 && (
                  <div className="mt-6 p-4 bg-slate-700/50 border border-slate-600 rounded-lg">
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <Crown className="h-5 w-5 text-yellow-400" />
                        <h3 className="text-yellow-400 font-mono">UNLOCK ALL LEAGUES</h3>
                      </div>
                      <p className="text-gray-300 text-sm">
                        Upgrade to Pro to access all {leagues.length} of your leagues
                      </p>
                                              <Button 
                          onClick={() => {
                    
                            window.location.href = 'https://buy.stripe.com/test_dRm3cvdadbi5fdV3oZeAg00'
                          }}
                          className="bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                        >
                          Upgrade to Pro
                        </Button>
                        </div>
                      </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Draft Select */}
          {user && selectedLeagueId && drafts.length > 0 && !selectedDraft && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">SELECT DRAFT</CardTitle>
                <p className="text-gray-300 text-sm">
                  Choose a draft to view the board
                </p>
              </CardHeader>
              <CardContent>
                <Select value={selectedDraft} onValueChange={setSelectedDraft}>
                  <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-100 focus:ring-0 focus:border-yellow-400">
                    <SelectValue placeholder="Select a draft" className="text-slate-100" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                    {drafts.map((draft) => (
                      <SelectItem key={draft.draft_id} value={draft.draft_id} className="bg-slate-800 text-slate-100 hover:bg-slate-700 focus:bg-slate-700 focus:text-yellow-400">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getDraftStatusColor(draft.status)}`}></div>
                          <span>
                            {draft.type} Draft ({draft.settings.rounds} rounds, {draft.settings.teams} teams)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Draft Board */}
          {selectedDraftData && picks.length > 0 && (
            <>
              <DraftBoardGrid
                draft={selectedDraftData}
                picks={picks}
                players={players}
                onRefresh={async () => {
                  if (selectedDraft) {
                    setLoading(true)
                    try {
                      const [picksData, playersData] = await Promise.all([
                        sleeperAPI.getDraftPicks(selectedDraft),
                        sleeperAPI.getAllPlayers()
                      ])
                      setPicks(picksData)
                      setPlayers(playersData)
                      setLastRefresh(new Date())
                    } catch (err) {
                      setError("Failed to refresh draft data")
                    } finally {
                      setLoading(false)
                    }
                  }
                }}
                lastRefresh={lastRefresh}
              />
              {/* Draft Analysis */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-green-400 font-mono flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>DRAFT ANALYSIS</span>
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Team grades, pick breakdowns, and traded pick analysis
                  </p>
                </CardHeader>
                <CardContent>
                  <DraftAnalysis draftId={selectedDraft} />
                </CardContent>
              </Card>
            </>
          )}

          {/* Loading State */}
          {loading && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Spinner />
                  <p className="text-green-400 font-mono">LOADING...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Membership Loading State */}
          {membershipLoading && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Spinner/>
                  <p className="text-gray-300 text-sm">Loading membership status...</p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
    </AuthGuard>
  )
}

// Main component wrapped in Suspense
export default function DraftBuddyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <Spinner />
            <p className="text-white">Loading draft buddy...</p>
          </div>
        </main>
      </div>
    }>
      <DraftBuddyContent />
    </Suspense>
  )
} 